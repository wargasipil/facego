"""
Backend client — gRPC calls to the Go FaceGo server via generated protobuf stubs.
"""

import sys
import threading
from pathlib import Path

import numpy as np

# Add gen/ to sys.path so generated stubs can be imported as top-level packages
_GEN_PATH = str(Path(__file__).parent / "gen")
if _GEN_PATH not in sys.path:
    sys.path.insert(0, _GEN_PATH)

try:
    import grpc
    from attendance.v1 import attendance_pb2, attendance_pb2_grpc
    from auth.v1       import auth_pb2, auth_pb2_grpc
    from classes.v1    import classes_pb2, classes_pb2_grpc
    from faces.v1      import faces_pb2, faces_pb2_grpc
    from users.v1      import users_pb2, users_pb2_grpc
    GRPC_AVAILABLE = True
except ImportError:
    GRPC_AVAILABLE = False

from config import backend_password, backend_url, backend_username


class BackendClient:
    """Calls the Go FaceGo backend via gRPC using generated protobuf stubs."""

    def __init__(self, url: str, username: str, password: str):
        # Accept "http://host:port" or bare "host:port"
        addr = url.removeprefix("https://").removeprefix("http://")
        self._channel  = grpc.insecure_channel(addr)
        self._username = username
        self._password = password
        self._token: str | None = None
        self._lock = threading.Lock()

    def _ensure_token(self):
        with self._lock:
            if self._token:
                return
            stub = auth_pb2_grpc.AuthServiceStub(self._channel)
            resp = stub.Login(auth_pb2.LoginRequest(
                username=self._username,
                password=self._password,
            ))
            self._token = resp.token

    def _metadata(self) -> list[tuple[str, str]]:
        self._ensure_token()
        return [("authorization", f"Bearer {self._token}")]

    def list_users(self, search: str = "", page: int = 1, page_size: int = 20) -> list[dict]:
        stub = users_pb2_grpc.UserServiceStub(self._channel)
        try:
            resp = stub.ListUsers(
                users_pb2.ListUsersRequest(
                    filter=users_pb2.ListUserFilter(search=search),
                    page=page,
                    page_size=page_size,
                ),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.list_users(search, page, page_size)
            raise
        return [
            {
                "id":        str(u.id),
                "studentId": u.student_id,
                "name":      u.name,
                "email":     u.email,
            }
            for u in resp.users
        ]

    def list_classes(self, search: str = "", page_size: int = 100) -> list[dict]:
        stub = classes_pb2_grpc.ClassServiceStub(self._channel)
        try:
            resp = stub.ListClasses(
                classes_pb2.ListClassesRequest(search=search, page_size=page_size),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.list_classes(search, page_size)
            raise
        return [
            {
                "id":   c.id,
                "name": c.name,
            }
            for c in resp.classes
        ]

    def list_schedules(self, class_id: int) -> list[dict]:
        stub = classes_pb2_grpc.ClassServiceStub(self._channel)
        try:
            resp = stub.ListSchedules(
                classes_pb2.ListSchedulesRequest(class_id=class_id),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.list_schedules(class_id)
            raise
        return [
            {
                "id":          s.id,
                "day_of_week": s.day_of_week,
                "start_time":  s.start_time,
                "end_time":    s.end_time,
                "subject":     s.subject,
                "room":        s.room,
            }
            for s in resp.schedules
        ]

    def push_log(self, session_id: str, user_id: int, student_id: str,
                 student_name: str, class_id: int, class_name: str,
                 seen_at_ts) -> None:
        """Push a raw face-detection event to the backend.

        seen_at_ts: a google.protobuf.Timestamp built by the caller.
        Backend handles dedup + attendance creation.
        """
        stub = attendance_pb2_grpc.AttendanceServiceStub(self._channel)
        try:
            stub.AttendancePushLog(
                attendance_pb2.AttendancePushLogRequest(
                    session_id   = session_id,
                    user_id      = user_id,
                    student_id   = student_id,
                    student_name = student_name,
                    class_id     = class_id,
                    class_name   = class_name,
                    seen_at      = seen_at_ts,
                ),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.push_log(session_id, user_id, student_id,
                                     student_name, class_id, class_name, seen_at_ts)
            raise

    def create_attendance(self, user_id: int, class_id: int = 0,
                          status: int = attendance_pb2.ATTENDANCE_STATUS_PRESENT) -> dict:
        """Record an attendance check-in for the given backend user_id."""
        stub = attendance_pb2_grpc.AttendanceServiceStub(self._channel)
        try:
            resp = stub.CreateAttendance(
                attendance_pb2.CreateAttendanceRequest(
                    user_id=user_id,
                    class_id=class_id,
                    status=status,
                ),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.create_attendance(user_id, class_id, status)
            raise
        rec = resp.record
        return {
            "id":         rec.id,
            "user_id":    rec.user_id,
            "name":       rec.name,
            "student_id": rec.student_id,
            "status":     rec.status,
        }

    # ── Face embedding RPCs ──────────────────────────────────────────────────

    def upsert_face_embeddings(self, student_id: int,
                               embeddings: list) -> None:
        """Store or replace all face embeddings for a student (backend user ID).

        student_id: backend integer user ID (users.id).
        embeddings: list of np.ndarray of shape (512,).
        """
        stub = faces_pb2_grpc.FaceEmbeddingServiceStub(self._channel)
        data = np.array(embeddings, dtype=np.float32).tobytes()
        try:
            stub.UpsertFaceEmbeddings(
                faces_pb2.UpsertFaceEmbeddingsRequest(
                    record=faces_pb2.FaceRecord(
                        student_id      = student_id,
                        embeddings      = data,
                        embedding_count = len(embeddings),
                    )
                ),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.upsert_face_embeddings(student_id, embeddings)
            raise

    def list_face_embeddings(self) -> list[dict]:
        """Return all registered face records from the backend.

        Returns list of dicts: {student_id: int, embeddings: list[np.ndarray]}.
        """
        stub = faces_pb2_grpc.FaceEmbeddingServiceStub(self._channel)
        try:
            resp = stub.ListFaceEmbeddings(
                faces_pb2.ListFaceEmbeddingsRequest(),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.list_face_embeddings()
            raise
        result = []
        for r in resp.records:
            flat   = np.frombuffer(r.embeddings, dtype=np.float32)
            embeds = [flat[i * 512:(i + 1) * 512].copy()
                      for i in range(r.embedding_count)]
            result.append({
                "student_id": r.student_id,  # int64 (backend user ID)
                "embeddings": embeds,
            })
        return result

    def delete_face_embeddings(self, student_id: int) -> None:
        """Delete the face record for a single student (backend user ID)."""
        stub = faces_pb2_grpc.FaceEmbeddingServiceStub(self._channel)
        try:
            stub.DeleteFaceEmbeddings(
                faces_pb2.DeleteFaceEmbeddingsRequest(student_id=student_id),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.delete_face_embeddings(student_id)
            raise

    def delete_all_face_embeddings(self) -> None:
        """Delete every face record from the backend."""
        stub = faces_pb2_grpc.FaceEmbeddingServiceStub(self._channel)
        try:
            stub.DeleteAllFaceEmbeddings(
                faces_pb2.DeleteAllFaceEmbeddingsRequest(),
                metadata=self._metadata(),
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAUTHENTICATED:
                with self._lock:
                    self._token = None
                return self.delete_all_face_embeddings()
            raise


_BACKEND_CLIENT:      BackendClient | None = None
_BACKEND_CLIENT_LOCK: threading.Lock       = threading.Lock()


def get_backend_client() -> BackendClient:
    global _BACKEND_CLIENT
    with _BACKEND_CLIENT_LOCK:
        if _BACKEND_CLIENT is None:
            _BACKEND_CLIENT = BackendClient(
                url=backend_url(),
                username=backend_username(),
                password=backend_password(),
            )
    return _BACKEND_CLIENT
