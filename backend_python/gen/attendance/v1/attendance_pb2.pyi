import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
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

class NotifyStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    NOTIFY_STATUS_UNSPECIFIED: _ClassVar[NotifyStatus]
    NOTIFY_STATUS_PENDING: _ClassVar[NotifyStatus]
    NOTIFY_STATUS_NOTIFIED: _ClassVar[NotifyStatus]
ATTENDANCE_STATUS_UNSPECIFIED: AttendanceStatus
ATTENDANCE_STATUS_PRESENT: AttendanceStatus
ATTENDANCE_STATUS_ABSENT: AttendanceStatus
NOTIFY_STATUS_UNSPECIFIED: NotifyStatus
NOTIFY_STATUS_PENDING: NotifyStatus
NOTIFY_STATUS_NOTIFIED: NotifyStatus

class UserAttendance(_message.Message):
    __slots__ = ("id", "student_id", "name", "photo_url", "parent_name", "parent_phone")
    ID_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    PHOTO_URL_FIELD_NUMBER: _ClassVar[int]
    PARENT_NAME_FIELD_NUMBER: _ClassVar[int]
    PARENT_PHONE_FIELD_NUMBER: _ClassVar[int]
    id: int
    student_id: str
    name: str
    photo_url: str
    parent_name: str
    parent_phone: str
    def __init__(self, id: _Optional[int] = ..., student_id: _Optional[str] = ..., name: _Optional[str] = ..., photo_url: _Optional[str] = ..., parent_name: _Optional[str] = ..., parent_phone: _Optional[str] = ...) -> None: ...

class AttendanceRecord(_message.Message):
    __slots__ = ("id", "user_id", "class_id", "class_schedule_id", "day", "status", "notify_status", "check_in_time", "created_at", "student")
    ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_SCHEDULE_ID_FIELD_NUMBER: _ClassVar[int]
    DAY_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    NOTIFY_STATUS_FIELD_NUMBER: _ClassVar[int]
    CHECK_IN_TIME_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    STUDENT_FIELD_NUMBER: _ClassVar[int]
    id: int
    user_id: int
    class_id: int
    class_schedule_id: int
    day: _timestamp_pb2.Timestamp
    status: AttendanceStatus
    notify_status: NotifyStatus
    check_in_time: _timestamp_pb2.Timestamp
    created_at: _timestamp_pb2.Timestamp
    student: UserAttendance
    def __init__(self, id: _Optional[int] = ..., user_id: _Optional[int] = ..., class_id: _Optional[int] = ..., class_schedule_id: _Optional[int] = ..., day: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., status: _Optional[_Union[AttendanceStatus, str]] = ..., notify_status: _Optional[_Union[NotifyStatus, str]] = ..., check_in_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., student: _Optional[_Union[UserAttendance, _Mapping]] = ...) -> None: ...

class AttendanceSummary(_message.Message):
    __slots__ = ("total", "present", "absent")
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    PRESENT_FIELD_NUMBER: _ClassVar[int]
    ABSENT_FIELD_NUMBER: _ClassVar[int]
    total: int
    present: int
    absent: int
    def __init__(self, total: _Optional[int] = ..., present: _Optional[int] = ..., absent: _Optional[int] = ...) -> None: ...

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

class GetDailyAttendanceFilter(_message.Message):
    __slots__ = ("class_id", "schedule_id", "date", "q")
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    SCHEDULE_ID_FIELD_NUMBER: _ClassVar[int]
    DATE_FIELD_NUMBER: _ClassVar[int]
    Q_FIELD_NUMBER: _ClassVar[int]
    class_id: int
    schedule_id: int
    date: _timestamp_pb2.Timestamp
    q: str
    def __init__(self, class_id: _Optional[int] = ..., schedule_id: _Optional[int] = ..., date: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., q: _Optional[str] = ...) -> None: ...

class GetDailyAttendanceRequest(_message.Message):
    __slots__ = ("filter", "page", "page_size")
    FILTER_FIELD_NUMBER: _ClassVar[int]
    PAGE_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    filter: GetDailyAttendanceFilter
    page: int
    page_size: int
    def __init__(self, filter: _Optional[_Union[GetDailyAttendanceFilter, _Mapping]] = ..., page: _Optional[int] = ..., page_size: _Optional[int] = ...) -> None: ...

class GetDailyAttendanceResponse(_message.Message):
    __slots__ = ("records", "summary", "total")
    RECORDS_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    records: _containers.RepeatedCompositeFieldContainer[AttendanceRecord]
    summary: AttendanceSummary
    total: int
    def __init__(self, records: _Optional[_Iterable[_Union[AttendanceRecord, _Mapping]]] = ..., summary: _Optional[_Union[AttendanceSummary, _Mapping]] = ..., total: _Optional[int] = ...) -> None: ...

class AttendanceStreamRequest(_message.Message):
    __slots__ = ("class_id",)
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    class_id: int
    def __init__(self, class_id: _Optional[int] = ...) -> None: ...

class AttendanceStreamResponse(_message.Message):
    __slots__ = ("attendance",)
    ATTENDANCE_FIELD_NUMBER: _ClassVar[int]
    attendance: AttendanceRecord
    def __init__(self, attendance: _Optional[_Union[AttendanceRecord, _Mapping]] = ...) -> None: ...

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
    __slots__ = ("session_id", "user_id", "student_id", "student_name", "class_id", "class_name", "seen_at")
    SESSION_ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    STUDENT_NAME_FIELD_NUMBER: _ClassVar[int]
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_NAME_FIELD_NUMBER: _ClassVar[int]
    SEEN_AT_FIELD_NUMBER: _ClassVar[int]
    session_id: str
    user_id: int
    student_id: str
    student_name: str
    class_id: int
    class_name: str
    seen_at: _timestamp_pb2.Timestamp
    def __init__(self, session_id: _Optional[str] = ..., user_id: _Optional[int] = ..., student_id: _Optional[str] = ..., student_name: _Optional[str] = ..., class_id: _Optional[int] = ..., class_name: _Optional[str] = ..., seen_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class AttendancePushLogResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...
