import cv2
import numpy as np
import psycopg2
import uuid
import sys
from insightface.app import FaceAnalysis
from storage import add_person

# ==========================
# CONFIG
# ==========================

DB_CONFIG = {
    "host": "localhost",
    "database": "facedb",
    "user": "postgres",
    "password": "postgres"
}

SIMILARITY_THRESHOLD = 0.5  # adjust for strictness


# ==========================
# INIT MODEL (LOAD ONCE)
# ==========================

print("Loading InsightFace model...")
app = FaceAnalysis(name="buffalo_s")
app.prepare(ctx_id=-1)  # -1 CPU, 0 GPU
print("Model loaded.")


# ==========================
# DB CONNECTION
# ==========================

conn = psycopg2.connect(**DB_CONFIG)
conn.autocommit = True


# ==========================
# UTIL FUNCTIONS
# ==========================

def normalize_embedding(embedding):
    return embedding / np.linalg.norm(embedding)


def extract_embedding(image):
    faces = app.get(image)
    if not faces:
        return None
    embedding = faces[0].embedding.astype(np.float32)
    return normalize_embedding(embedding)


# ==========================
# REGISTER USER
# ==========================

def register_user(user_id):
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Cannot open webcam.")
        return

    print("Press SPACE to capture face")
    print("Press 'q' to cancel")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        faces = app.get(frame)

        for face in faces:
            box = face.bbox.astype(int)
            cv2.rectangle(frame,
                          (box[0], box[1]),
                          (box[2], box[3]),
                          (0, 255, 0), 2)

        cv2.imshow("Register User", frame)

        key = cv2.waitKey(1) & 0xFF

        # SPACE pressed → capture
        if key == 32:
            if not faces:
                print("No face detected. Try again.")
                continue

            embedding = normalize_embedding(
                faces[0].embedding.astype(np.float32)
            )

            cur = conn.cursor()
            cur.execute("""
                INSERT INTO user_faces (id, user_id, embedding)
                VALUES (%s, %s, %s)
            """, (str(uuid.uuid4()), user_id, embedding.tolist()))

            print("User registered:", user_id)
            break

        # q pressed → cancel
        if key == ord('q'):
            print("Registration cancelled.")
            break

    cap.release()
    cv2.destroyAllWindows()



# ==========================
# RECOGNIZE FROM IMAGE
# ==========================

def recognize_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print("Image not found.")
        return

    embedding = extract_embedding(img)
    if embedding is None:
        print("No face detected.")
        return

    cur = conn.cursor()
    cur.execute("""
        SELECT user_id,
               1 - (embedding <=> %s) AS similarity
        FROM user_faces
        ORDER BY embedding <=> %s
        LIMIT 1
    """, (embedding.tolist(), embedding.tolist()))

    result = cur.fetchone()

    if result and result[1] > SIMILARITY_THRESHOLD:
        print(f"Matched: {result[0]} (Similarity: {result[1]:.4f})")
    else:
        print("No match found.")


# ==========================
# WEBCAM RECOGNITION
# ==========================
def recognize_frame(frame):
    faces = app.get(frame)

    for face in faces:
        box = face.bbox.astype(int)
        embedding = normalize_embedding(
            face.embedding.astype(np.float32)
        )

        cur = conn.cursor()
        cur.execute("""
            SELECT user_id,
                    1 - (embedding <=> %s::vector) AS similarity
            FROM user_faces
            ORDER BY embedding <=> %s::vector
            LIMIT 1
        """, (embedding.tolist(), embedding.tolist()))

        result = cur.fetchone()

        label = ""
        if result and result[1] > SIMILARITY_THRESHOLD:
            add_person(result[0])
            label = f"{result[0]} ({result[1]:.2f})"

       

        # Draw box + label
        cv2.rectangle(frame,
                        (box[0], box[1]),
                        (box[2], box[3]),
                        (0, 255, 0), 2)

        cv2.putText(frame,
                    label,
                    (box[0], box[1] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2)

        return frame


def recognize_webcam():
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Cannot open webcam.")
        return

    print("Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        faces = app.get(frame)

        for face in faces:
            box = face.bbox.astype(int)
            embedding = normalize_embedding(
                face.embedding.astype(np.float32)
            )

            cur = conn.cursor()
            cur.execute("""
                SELECT user_id,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM user_faces
                ORDER BY embedding <=> %s::vector
                LIMIT 1
            """, (embedding.tolist(), embedding.tolist()))

            result = cur.fetchone()

            label = "Unknown"
            if result and result[1] > SIMILARITY_THRESHOLD:
                label = f"{result[0]} ({result[1]:.2f})"

            # Draw box + label
            cv2.rectangle(frame,
                          (box[0], box[1]),
                          (box[2], box[3]),
                          (0, 255, 0), 2)

            cv2.putText(frame,
                        label,
                        (box[0], box[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 0),
                        2)

        cv2.imshow("Face Recognition", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


# ==========================
# CLI ENTRY
# ==========================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("Register: python face_app.py register <user_id> <image_path>")
        print("Recognize image: python face_app.py recognize <image_path>")
        print("Webcam: python face_app.py webcam")
        sys.exit(0)

    command = sys.argv[1]

    if command == "register":
        register_user(sys.argv[2])


    elif command == "recognize":
        recognize_image(sys.argv[2])

    elif command == "webcam":
        recognize_webcam()

    else:
        print("Unknown command.")
