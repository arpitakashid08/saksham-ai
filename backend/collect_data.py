import cv2
import mediapipe as mp
import os

LABEL = "HELLO"      # Change later
SAMPLES = 200

save_dir = f"dataset/{LABEL}"
os.makedirs(save_dir, exist_ok=True)

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7
)

cap = cv2.VideoCapture(0)

count = 0

while cap.isOpened():
    success, frame = cap.read()

    if not success:
        break

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb)

    cv2.putText(
        frame,
        f"{LABEL}: {count}/{SAMPLES}",
        (20, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    if results.multi_hand_landmarks:
        hand = results.multi_hand_landmarks[0]

        for landmark in hand.landmark:
            x = int(landmark.x * frame.shape[1])
            y = int(landmark.y * frame.shape[0])

            cv2.circle(frame, (x, y), 4, (0, 255, 0), -1)

        if count < SAMPLES:
            cv2.imwrite(
                os.path.join(save_dir, f"{count}.jpg"),
                frame
            )
            count += 1

    cv2.imshow("Collecting Data", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

    if count >= SAMPLES:
        break

cap.release()
cv2.destroyAllWindows()