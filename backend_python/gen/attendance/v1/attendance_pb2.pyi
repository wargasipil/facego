import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class AttendanceStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    ATTENDANCE_STATUS_UNSPECIFIED: _ClassVar[AttendanceStatus]
    ATTENDANCE_STATUS_PRESENT: _ClassVar[AttendanceStatus]
    ATTENDANCE_STATUS_ABSENT: _ClassVar[AttendanceStatus]
    ATTENDANCE_STATUS_LATE: _ClassVar[AttendanceStatus]
ATTENDANCE_STATUS_UNSPECIFIED: AttendanceStatus
ATTENDANCE_STATUS_PRESENT: AttendanceStatus
ATTENDANCE_STATUS_ABSENT: AttendanceStatus
ATTENDANCE_STATUS_LATE: AttendanceStatus

class AttendanceRecord(_message.Message):
    __slots__ = ("id", "user_id", "name", "status", "photo_url", "timestamp", "class_name", "student_id", "notes", "last_seen", "class_schedule_id")
    ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    PHOTO_URL_FIELD_NUMBER: _ClassVar[int]
    TIMESTAMP_FIELD_NUMBER: _ClassVar[int]
    CLASS_NAME_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    NOTES_FIELD_NUMBER: _ClassVar[int]
    LAST_SEEN_FIELD_NUMBER: _ClassVar[int]
    CLASS_SCHEDULE_ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    user_id: int
    name: str
    status: AttendanceStatus
    photo_url: str
    timestamp: _timestamp_pb2.Timestamp
    class_name: str
    student_id: str
    notes: str
    last_seen: _timestamp_pb2.Timestamp
    class_schedule_id: int
    def __init__(self, id: _Optional[int] = ..., user_id: _Optional[int] = ..., name: _Optional[str] = ..., status: _Optional[_Union[AttendanceStatus, str]] = ..., photo_url: _Optional[str] = ..., timestamp: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., class_name: _Optional[str] = ..., student_id: _Optional[str] = ..., notes: _Optional[str] = ..., last_seen: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., class_schedule_id: _Optional[int] = ...) -> None: ...

class AttendanceSummary(_message.Message):
    __slots__ = ("total", "present", "absent", "late")
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    PRESENT_FIELD_NUMBER: _ClassVar[int]
    ABSENT_FIELD_NUMBER: _ClassVar[int]
    LATE_FIELD_NUMBER: _ClassVar[int]
    total: int
    present: int
    absent: int
    late: int
    def __init__(self, total: _Optional[int] = ..., present: _Optional[int] = ..., absent: _Optional[int] = ..., late: _Optional[int] = ...) -> None: ...

class RecordAttendanceRequest(_message.Message):
    __slots__ = ("face_image",)
    FACE_IMAGE_FIELD_NUMBER: _ClassVar[int]
    face_image: bytes
    def __init__(self, face_image: _Optional[bytes] = ...) -> None: ...

class RecordAttendanceResponse(_message.Message):
    __slots__ = ("record", "matched")
    RECORD_FIELD_NUMBER: _ClassVar[int]
    MATCHED_FIELD_NUMBER: _ClassVar[int]
    record: AttendanceRecord
    matched: bool
    def __init__(self, record: _Optional[_Union[AttendanceRecord, _Mapping]] = ..., matched: _Optional[bool] = ...) -> None: ...

class GetDailyAttendanceRequest(_message.Message):
    __slots__ = ("date", "class_filter")
    DATE_FIELD_NUMBER: _ClassVar[int]
    CLASS_FILTER_FIELD_NUMBER: _ClassVar[int]
    date: _timestamp_pb2.Timestamp
    class_filter: str
    def __init__(self, date: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., class_filter: _Optional[str] = ...) -> None: ...

class GetDailyAttendanceResponse(_message.Message):
    __slots__ = ("records", "summary")
    RECORDS_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_FIELD_NUMBER: _ClassVar[int]
    records: _containers.RepeatedCompositeFieldContainer[AttendanceRecord]
    summary: AttendanceSummary
    def __init__(self, records: _Optional[_Iterable[_Union[AttendanceRecord, _Mapping]]] = ..., summary: _Optional[_Union[AttendanceSummary, _Mapping]] = ...) -> None: ...

class ListAttendanceRequest(_message.Message):
    __slots__ = ("user_id", "to")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    FROM_FIELD_NUMBER: _ClassVar[int]
    TO_FIELD_NUMBER: _ClassVar[int]
    user_id: int
    to: _timestamp_pb2.Timestamp
    def __init__(self, user_id: _Optional[int] = ..., to: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., **kwargs) -> None: ...

class ListAttendanceResponse(_message.Message):
    __slots__ = ("records",)
    RECORDS_FIELD_NUMBER: _ClassVar[int]
    records: _containers.RepeatedCompositeFieldContainer[AttendanceRecord]
    def __init__(self, records: _Optional[_Iterable[_Union[AttendanceRecord, _Mapping]]] = ...) -> None: ...

class WatchAttendanceRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class WatchAttendanceResponse(_message.Message):
    __slots__ = ("record",)
    RECORD_FIELD_NUMBER: _ClassVar[int]
    record: AttendanceRecord
    def __init__(self, record: _Optional[_Union[AttendanceRecord, _Mapping]] = ...) -> None: ...

class CreateAttendanceRequest(_message.Message):
    __slots__ = ("user_id", "status", "notes", "check_in_time", "class_id", "class_schedule_id")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    NOTES_FIELD_NUMBER: _ClassVar[int]
    CHECK_IN_TIME_FIELD_NUMBER: _ClassVar[int]
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_SCHEDULE_ID_FIELD_NUMBER: _ClassVar[int]
    user_id: int
    status: AttendanceStatus
    notes: str
    check_in_time: _timestamp_pb2.Timestamp
    class_id: int
    class_schedule_id: int
    def __init__(self, user_id: _Optional[int] = ..., status: _Optional[_Union[AttendanceStatus, str]] = ..., notes: _Optional[str] = ..., check_in_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., class_id: _Optional[int] = ..., class_schedule_id: _Optional[int] = ...) -> None: ...

class CreateAttendanceResponse(_message.Message):
    __slots__ = ("record",)
    RECORD_FIELD_NUMBER: _ClassVar[int]
    record: AttendanceRecord
    def __init__(self, record: _Optional[_Union[AttendanceRecord, _Mapping]] = ...) -> None: ...

class DeleteAttendanceRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class DeleteAttendanceResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class AttendancePushLogRequest(_message.Message):
    __slots__ = ("session_id", "user_id", "student_id", "student_name", "class_id", "class_name", "seen_at", "class_schedule_id")
    SESSION_ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    STUDENT_NAME_FIELD_NUMBER: _ClassVar[int]
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_NAME_FIELD_NUMBER: _ClassVar[int]
    SEEN_AT_FIELD_NUMBER: _ClassVar[int]
    CLASS_SCHEDULE_ID_FIELD_NUMBER: _ClassVar[int]
    session_id: str
    user_id: int
    student_id: str
    student_name: str
    class_id: int
    class_name: str
    seen_at: _timestamp_pb2.Timestamp
    class_schedule_id: int
    def __init__(self, session_id: _Optional[str] = ..., user_id: _Optional[int] = ..., student_id: _Optional[str] = ..., student_name: _Optional[str] = ..., class_id: _Optional[int] = ..., class_name: _Optional[str] = ..., seen_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., class_schedule_id: _Optional[int] = ...) -> None: ...

class AttendancePushLogResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...
