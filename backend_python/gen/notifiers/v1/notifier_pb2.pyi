import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class NotifyMeta(_message.Message):
    __slots__ = ("class_id", "class_schedule_id", "day")
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_SCHEDULE_ID_FIELD_NUMBER: _ClassVar[int]
    DAY_FIELD_NUMBER: _ClassVar[int]
    class_id: int
    class_schedule_id: int
    day: _timestamp_pb2.Timestamp
    def __init__(self, class_id: _Optional[int] = ..., class_schedule_id: _Optional[int] = ..., day: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class NotifyAll(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class NotifyStudent(_message.Message):
    __slots__ = ("student_ids",)
    STUDENT_IDS_FIELD_NUMBER: _ClassVar[int]
    student_ids: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, student_ids: _Optional[_Iterable[int]] = ...) -> None: ...

class NotifyParentRequest(_message.Message):
    __slots__ = ("meta", "all", "student")
    META_FIELD_NUMBER: _ClassVar[int]
    ALL_FIELD_NUMBER: _ClassVar[int]
    STUDENT_FIELD_NUMBER: _ClassVar[int]
    meta: NotifyMeta
    all: NotifyAll
    student: NotifyStudent
    def __init__(self, meta: _Optional[_Union[NotifyMeta, _Mapping]] = ..., all: _Optional[_Union[NotifyAll, _Mapping]] = ..., student: _Optional[_Union[NotifyStudent, _Mapping]] = ...) -> None: ...

class NotifyParentResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...
