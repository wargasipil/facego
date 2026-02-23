import sys
import msvcrt
import os
import numpy as np
import cv2
from insightface.app import FaceAnalysis

msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

WIDTH = 1280
HEIGHT = 720

app = FaceAnalysis(name="buffalo_l")
app.prepare(ctx_id=0)



while True:
    raw_frame = sys.stdin.buffer.read(WIDTH * HEIGHT * 3)
    if not raw_frame:
        break

    # frame = np.frombuffer(raw_frame, np.uint8)
    # frame = frame.reshape((HEIGHT, WIDTH, 3)).copy()
    frame = np.empty((HEIGHT, WIDTH, 3), dtype=np.uint8)
    frame[:] = np.frombuffer(raw_frame, np.uint8).reshape((HEIGHT, WIDTH, 3))

    faces = app.get(frame)

    for face in faces:
        box = face.bbox.astype(int)
        cv2.rectangle(frame,
                      (box[0], box[1]),
                      (box[2], box[3]),
                      (0, 255, 0), 2)

    sys.stdout.buffer.write(frame.tobytes())
    sys.stdout.flush()
