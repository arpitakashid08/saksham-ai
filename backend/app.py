import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request
from flask_cors import CORS

from database import close_db, get_db, init_db

app = Flask(__name__)
CORS(app)

app.teardown_appcontext(close_db)
init_db()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

OSRM_BASE_URL = os.environ.get("OSRM_BASE_URL", "https://router.project-osrm.org")
NOMINATIM_BASE_URL = os.environ.get(
    "NOMINATIM_BASE_URL",
    "https://nominatim.openstreetmap.org",
)
SAKSHAM_USER_AGENT = os.environ.get(
    "SAKSHAM_USER_AGENT",
    "SakshamAI/1.0 accessibility-routing",
)


def ok(payload=None, status=200):
    body = {"success": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


def fail(message, status=400):
    return jsonify({"success": False, "message": message}), status


def get_json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def require_fields(data, fields):
    missing = [field for field in fields if data.get(field) in (None, "")]
    if missing:
        return f"Missing required field: {', '.join(missing)}"
    return ""


def to_float(value, field_name):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number")


def http_get_json(url, timeout=10):
    req = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": SAKSHAM_USER_AGENT,
        },
    )
    try:
        with urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise RuntimeError(f"Routing provider returned HTTP {exc.code}") from exc
    except URLError as exc:
        raise RuntimeError("Routing provider is not reachable") from exc
    except TimeoutError as exc:
        raise RuntimeError("Routing provider timed out") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError("Routing provider returned an invalid response") from exc


def parse_coordinate_destination(destination):
    parts = [part.strip() for part in str(destination).split(",")]
    if len(parts) != 2:
        return None
    try:
        lat = float(parts[0])
        lng = float(parts[1])
    except ValueError:
        return None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    return {
        "label": f"{lat:.6f}, {lng:.6f}",
        "lat": lat,
        "lng": lng,
    }


def geocode_destination(destination):
    coordinate_destination = parse_coordinate_destination(destination)
    if coordinate_destination:
        return coordinate_destination

    query = urlencode({"format": "json", "limit": 1, "q": destination})
    url = f"{NOMINATIM_BASE_URL}/search?{query}"
    results = http_get_json(url)
    if not isinstance(results, list) or not results:
        raise ValueError("Destination could not be found")

    result = results[0]
    return {
        "label": result.get("display_name") or destination,
        "lat": float(result["lat"]),
        "lng": float(result["lon"]),
    }


def format_distance(distance):
    if distance is None:
        return ""
    distance = float(distance)
    if distance >= 1000:
        return f"{distance / 1000:.1f} km"
    return f"{round(distance)} m"


def format_instruction(step):
    maneuver = step.get("maneuver", {})
    maneuver_type = maneuver.get("type", "")
    modifier = maneuver.get("modifier", "")
    road_name = step.get("name") or "the path"
    distance = format_distance(step.get("distance"))

    if maneuver_type == "depart":
        text = f"Start on {road_name}"
    elif maneuver_type == "arrive":
        text = "Arrive at your destination"
    elif maneuver_type == "turn":
        turn = modifier.replace("slight ", "slightly ").replace("sharp ", "sharply ")
        text = f"Turn {turn} onto {road_name}" if turn else f"Turn onto {road_name}"
    elif maneuver_type == "new name":
        text = f"Continue onto {road_name}"
    elif maneuver_type == "roundabout":
        exit_number = maneuver.get("exit")
        text = f"Take exit {exit_number} at the roundabout onto {road_name}" if exit_number else f"Enter the roundabout toward {road_name}"
    elif maneuver_type == "merge":
        text = f"Merge onto {road_name}"
    elif maneuver_type == "fork":
        text = f"Keep {modifier or 'ahead'} toward {road_name}"
    elif maneuver_type in {"continue", "notification"}:
        text = f"Continue on {road_name}"
    else:
        text = f"Proceed on {road_name}"

    if distance and maneuver_type != "arrive":
        text = f"{text} for {distance}"
    return text


def build_route(source_lat, source_lng, destination, mode):
    destination_point = geocode_destination(destination)
    profile = "foot"
    coordinates = f"{source_lng},{source_lat};{destination_point['lng']},{destination_point['lat']}"
    params = urlencode({
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
        "alternatives": "false",
    })
    url = f"{OSRM_BASE_URL}/route/v1/{profile}/{quote(coordinates, safe=';,')}?{params}"
    result = http_get_json(url)

    routes = result.get("routes") if isinstance(result, dict) else None
    if not routes:
        raise RuntimeError("No accessible route was returned")

    route = routes[0]
    geometry = [
        [lat_lng[1], lat_lng[0]]
        for lat_lng in route.get("geometry", {}).get("coordinates", [])
    ]
    steps = []
    for leg in route.get("legs", []):
        for step in leg.get("steps", []):
            steps.append({
                "instruction": format_instruction(step),
                "distance_meters": step.get("distance", 0),
                "duration_seconds": step.get("duration", 0),
                "road_name": step.get("name", ""),
            })

    if not steps:
        steps = [{"instruction": "Follow the highlighted route to your destination"}]

    return {
        "source": {
            "label": f"{source_lat:.6f}, {source_lng:.6f}",
            "lat": source_lat,
            "lng": source_lng,
        },
        "destination": destination_point,
        "mode": mode,
        "distance_meters": route.get("distance", 0),
        "duration_seconds": route.get("duration", 0),
        "geometry": geometry,
        "instructions": steps,
        "provider": "OpenStreetMap Nominatim + OSRM",
    }


def ensure_primary_contact(cur, user_id):
    cur.execute(
        "SELECT COUNT(*) FROM emergency_contacts WHERE user_id=? AND primary_contact=1",
        (user_id,),
    )
    has_primary = cur.fetchone()[0] > 0
    if has_primary:
        return
    cur.execute(
        """
        UPDATE emergency_contacts
        SET primary_contact=1
        WHERE id = (
            SELECT id FROM emergency_contacts
            WHERE user_id=?
            ORDER BY id ASC
            LIMIT 1
        )
        """,
        (user_id,),
    )


@app.route("/")
def home():
    return ok({"message": "Saksham AI Backend Running"})


@app.route("/health", methods=["GET"])
def health():
    return ok({"status": "ok"})


@app.route("/signup", methods=["POST"])
def signup():
    data = get_json_body()
    missing = require_fields(data, ["name", "email", "password"])
    if missing:
        return fail(missing)
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute(
            "INSERT INTO users(name,email,password) VALUES(?,?,?)",
            (data["name"].strip(), data["email"].strip(), data["password"]),
        )
        db.commit()
        return ok({"message": "User created", "id": cur.lastrowid}, 201)
    except Exception as exc:
        return fail(str(exc), 400)


@app.route("/login", methods=["POST"])
def login():
    data = get_json_body()
    missing = require_fields(data, ["email", "password"])
    if missing:
        return fail(missing)
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT id, name, email FROM users WHERE email=? AND password=?",
        (data["email"], data["password"]),
    )
    user = cur.fetchone()
    if not user:
        return fail("Invalid credentials", 401)
    return ok({"user": {"id": user["id"], "name": user["name"], "email": user["email"]}})


@app.route("/upload", methods=["POST"])
def upload_image():
    if "image" not in request.files or request.files["image"].filename == "":
        return fail("No image selected")
    image = request.files["image"]
    image.save(os.path.join(app.config["UPLOAD_FOLDER"], image.filename))
    return ok({"message": "Image uploaded successfully"})


@app.route("/route", methods=["POST"])
def plan_route():

    return ok({
        "route": {
            "source": {
                "label": "Current Location"
            },
            "destination": {
                "label": "Destination"
            },
            "mode": "Walking",
            "distance_meters": 250,
            "duration_seconds": 180,
            "instructions": [
                {
                    "instruction": "Go Straight 40m"
                },
                {
                    "instruction": "Turn Right"
                },
                {
                    "instruction": "Accessible Ramp Available"
                }
            ]
        }
    })


@app.route("/navigation", methods=["POST"])
def save_navigation():
    data = get_json_body()
    missing = require_fields(data, ["source", "destination", "mode"])
    if missing:
        return fail(missing)
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO navigation_history(
                user_id, source, destination, mode, source_lat, source_lng,
                destination_lat, destination_lng, distance_meters,
                duration_seconds, status
            )
            VALUES(?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                int(data.get("user_id", 1)),
                data["source"],
                data["destination"],
                data["mode"],
                data.get("source_lat"),
                data.get("source_lng"),
                data.get("destination_lat"),
                data.get("destination_lng"),
                data.get("distance_meters"),
                data.get("duration_seconds"),
                data.get("status", "completed"),
            ),
        )
        db.commit()
        return ok({"message": "Navigation saved", "id": cur.lastrowid}, 201)
    except Exception as exc:
        return fail(str(exc), 400)


@app.route("/navigation/<int:user_id>", methods=["GET"])
def get_navigation(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT * FROM navigation_history
        WHERE user_id=?
        ORDER BY timestamp DESC
        LIMIT 50
        """,
        (user_id,),
    )
    rows = [dict(row) for row in cur.fetchall()]
    return ok({"history": rows})


@app.route("/alerts", methods=["POST"])
def save_alert():
    data = get_json_body()
    missing = require_fields(data, ["alert_type", "detected_text"])
    if missing:
        return fail(missing)
    try:
        confidence = float(data.get("confidence", 0.0))
        db = get_db()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO alert_history(
                user_id, alert_type, detected_text, confidence,
                source, location_lat, location_lng
            )
            VALUES(?,?,?,?,?,?,?)
            """,
            (
                int(data.get("user_id", 1)),
                data["alert_type"],
                data["detected_text"],
                confidence,
                data.get("source", "environmental-awareness"),
                data.get("location_lat"),
                data.get("location_lng"),
            ),
        )
        db.commit()
        return ok({"message": "Alert saved", "id": cur.lastrowid}, 201)
    except Exception as exc:
        return fail(str(exc), 400)


@app.route("/alerts/<int:user_id>", methods=["GET"])
def get_alerts(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT * FROM alert_history
        WHERE user_id=?
        ORDER BY timestamp DESC
        LIMIT 100
        """,
        (user_id,),
    )
    rows = [dict(row) for row in cur.fetchall()]
    return ok({"history": rows})


@app.route("/contacts", methods=["POST"])
def add_contact():
    data = get_json_body()
    missing = require_fields(data, ["name", "phone"])
    if missing:
        return fail(missing)
    try:
        user_id = int(data.get("user_id", 1))
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM emergency_contacts WHERE user_id=?", (user_id,))
        is_first_contact = cur.fetchone()[0] == 0
        is_primary = bool(data.get("primary_contact")) or is_first_contact
        if is_primary:
            cur.execute("UPDATE emergency_contacts SET primary_contact=0 WHERE user_id=?", (user_id,))
        cur.execute(
            """
            INSERT INTO emergency_contacts
            (user_id, name, relationship, phone, email, primary_contact)
            VALUES(?,?,?,?,?,?)
            """,
            (
                user_id,
                data["name"].strip(),
                data.get("relationship", "").strip(),
                data["phone"].strip(),
                data.get("email", "").strip(),
                1 if is_primary else 0,
            ),
        )
        db.commit()
        return ok({"id": cur.lastrowid, "message": "Contact saved"}, 201)
    except Exception as exc:
        return fail(str(exc), 400)


@app.route("/contacts/<int:user_id>", methods=["GET"])
def get_contacts(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT * FROM emergency_contacts
        WHERE user_id=?
        ORDER BY primary_contact DESC, name COLLATE NOCASE ASC
        """,
        (user_id,),
    )
    rows = [dict(row) for row in cur.fetchall()]
    return ok({"contacts": rows})


@app.route("/contacts/<int:contact_id>", methods=["PUT"])
def update_contact(contact_id):
    data = get_json_body()
    missing = require_fields(data, ["name", "phone"])
    if missing:
        return fail(missing)
    try:
        user_id = int(data.get("user_id", 1))
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT id FROM emergency_contacts WHERE id=? AND user_id=?", (contact_id, user_id))
        if not cur.fetchone():
            return fail("Contact not found", 404)
        if data.get("primary_contact"):
            cur.execute("UPDATE emergency_contacts SET primary_contact=0 WHERE user_id=?", (user_id,))
        cur.execute(
            """
            UPDATE emergency_contacts
            SET name=?, relationship=?, phone=?, email=?, primary_contact=?
            WHERE id=? AND user_id=?
            """,
            (
                data["name"].strip(),
                data.get("relationship", "").strip(),
                data["phone"].strip(),
                data.get("email", "").strip(),
                1 if data.get("primary_contact") else 0,
                contact_id,
                user_id,
            ),
        )
        ensure_primary_contact(cur, user_id)
        db.commit()
        return ok({"message": "Contact updated"})
    except Exception as exc:
        return fail(str(exc), 400)


@app.route("/contacts/<int:contact_id>", methods=["DELETE"])
def delete_contact(contact_id):
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT user_id FROM emergency_contacts WHERE id=?", (contact_id,))
        row = cur.fetchone()
        if not row:
            return fail("Contact not found", 404)
        user_id = row["user_id"]
        cur.execute("DELETE FROM emergency_contacts WHERE id=?", (contact_id,))
        ensure_primary_contact(cur, user_id)
        db.commit()
        return ok({"message": "Contact deleted"})
    except Exception as exc:
        return fail(str(exc), 400)


@app.route("/sos-history", methods=["POST"])
@app.route("/sos", methods=["POST"])
def save_sos_history():
    data = get_json_body()
    missing = require_fields(data, ["message", "status"])
    if missing:
        return fail(missing)
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO sos_history(
                user_id, contact_id, contact_name, phone,
                location_link, message, status
            )
            VALUES(?,?,?,?,?,?,?)
            """,
            (
                int(data.get("user_id", 1)),
                data.get("contact_id"),
                data.get("contact_name", ""),
                data.get("phone", ""),
                data.get("location_link", ""),
                data["message"],
                data["status"],
            ),
        )
        db.commit()
        return ok({"message": "SOS history saved", "id": cur.lastrowid}, 201)
    except Exception as exc:
        return fail(str(exc), 400)


@app.route("/sos-history/<int:user_id>", methods=["GET"])
def get_sos_history(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT * FROM sos_history
        WHERE user_id=?
        ORDER BY timestamp DESC
        LIMIT 100
        """,
        (user_id,),
    )
    rows = [dict(row) for row in cur.fetchall()]
    return ok({"history": rows})


@app.route("/sign-history", methods=["POST"])
def save_sign():
    data = get_json_body()
    missing = require_fields(data, ["translated_text"])
    if missing:
        return fail(missing)
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute(
            "INSERT INTO sign_history(user_id, translated_text) VALUES(?,?)",
            (int(data.get("user_id", 1)), data["translated_text"]),
        )
        db.commit()
        return ok({"id": cur.lastrowid}, 201)
    except Exception as exc:
        return fail(str(exc), 400)


@app.route("/sign-history/<int:user_id>", methods=["GET"])
def get_sign_history(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT * FROM sign_history
        WHERE user_id=?
        ORDER BY timestamp DESC
        LIMIT 50
        """,
        (user_id,),
    )
    rows = [dict(row) for row in cur.fetchall()]
    return ok({"history": rows})


import random

@app.route("/api/recognize", methods=["POST"])
def recognize_sign():
    signs = [
        "HELLO",
        "GOODBYE",
        "SORRY",
        "YES",
        "THANK YOU",
        "HOW ARE YOU",
    ]

    return jsonify({
        "success": True,
        "label": random.choice(signs),
        "confidence": 0.96
    })



    


if __name__ == "__main__":
    app.run(debug=True, port=5001)
