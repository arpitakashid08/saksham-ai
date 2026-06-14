import os
import sqlite3
from flask import g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.environ.get("SAKSHAM_DB_PATH", os.path.join(BASE_DIR, "saksham.db"))


def get_db():
    """Return a database connection for the current request context."""
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE, timeout=10, check_same_thread=False)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def _table_columns(cur, table_name):
    cur.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cur.fetchall()}


def _add_column_if_missing(cur, table_name, column_name, definition):
    if column_name not in _table_columns(cur, table_name):
        cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


def init_db():
    """Create all tables if they don't already exist."""
    conn = sqlite3.connect(DATABASE, timeout=10, check_same_thread=False)
    cur = conn.cursor()

    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT    NOT NULL,
        email    TEXT    UNIQUE NOT NULL,
        password TEXT    NOT NULL
    )
    """)

    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS navigation_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER,
        source      TEXT,
        destination TEXT,
        mode        TEXT,
        source_lat  REAL,
        source_lng  REAL,
        destination_lat REAL,
        destination_lng REAL,
        distance_meters REAL,
        duration_seconds REAL,
        status      TEXT DEFAULT 'completed',
        timestamp   TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS alert_history (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER,
        alert_type    TEXT,
        detected_text TEXT,
        confidence    REAL,
        source        TEXT DEFAULT 'environmental-awareness',
        location_lat  REAL,
        location_lng  REAL,
        timestamp     TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS emergency_contacts (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER,
        name            TEXT    NOT NULL,
        relationship    TEXT,
        phone           TEXT,
        email           TEXT,
        primary_contact INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sign_history (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER,
        translated_text TEXT,
        timestamp       TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sos_history (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER,
        contact_id    INTEGER,
        contact_name  TEXT,
        phone         TEXT,
        location_link TEXT,
        message       TEXT,
        status        TEXT DEFAULT 'triggered',
        timestamp     TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (contact_id) REFERENCES emergency_contacts(id)
    )
    """)

    for column_name, definition in {
        "source_lat": "REAL",
        "source_lng": "REAL",
        "destination_lat": "REAL",
        "destination_lng": "REAL",
        "distance_meters": "REAL",
        "duration_seconds": "REAL",
        "status": "TEXT DEFAULT 'completed'",
    }.items():
        _add_column_if_missing(cur, "navigation_history", column_name, definition)

    for column_name, definition in {
        "source": "TEXT DEFAULT 'environmental-awareness'",
        "location_lat": "REAL",
        "location_lng": "REAL",
    }.items():
        _add_column_if_missing(cur, "alert_history", column_name, definition)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_contacts_user ON emergency_contacts(user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_navigation_user_time ON navigation_history(user_id, timestamp)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_alert_user_time ON alert_history(user_id, timestamp)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sign_user_time ON sign_history(user_id, timestamp)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sos_user_time ON sos_history(user_id, timestamp)")

    conn.commit()
    conn.close()
