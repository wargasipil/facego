import cv2
from multiprocessing import Process


def run_detection():
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        raise Exception("Cannot open webcam.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        
        cv2.imshow("Face Recognition", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

detect_thread = Process(target=run_detection)

if __name__ == '__main__':
    # run_detection()
    detect_thread.start()
    detect_thread.join()
