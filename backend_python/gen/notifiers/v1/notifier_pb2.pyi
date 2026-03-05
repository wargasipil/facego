from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class NotifyMeta(_message.Message):
    __slots__ = ("class_id", "class_schedule_id")
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_SCHEDULE_ID_FIELD_NUMBER: _ClassVar[int]
    class_id: int
    class_schedule_id: int
    def __init__(self, class_id: _Optional[int] = ..., class_schedule_id: _Optional[int] = ...) -> None: ...

class NotifyAll(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class NotifyStudent(_message.Message):
    __slots__ = ("attendance_id", "student_id")
    ATTENDANCE_ID_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    attendance_id: int
    student_id: int
    def __init__(self, attendance_id: _Optional[int] = ..., student_id: _Optional[int] = ...) -> None: ...

class NotifyStudents(_message.Message):
    __slots__ = ("student",)
    STUDENT_FIELD_NUMBER: _ClassVar[int]
    student: _containers.RepeatedCompositeFieldContainer[NotifyStudent]
    def __init__(self, student: _Optional[_Iterable[_Union[NotifyStudent, _Mapping]]] = ...) -> None: ...

class NotifyParentRequest(_message.Message):
    __slots__ = ("meta", "all", "students")
    META_FIELD_NUMBER: _ClassVar[int]
    ALL_FIELD_NUMBER: _ClassVar[int]
    STUDENTS_FIELD_NUMBER: _ClassVar[int]
    meta: NotifyMeta
    all: NotifyAll
    students: NotifyStudents
    def __init__(self, meta: _Optional[_Union[NotifyMeta, _Mapping]] = ..., all: _Optional[_Union[NotifyAll, _Mapping]] = ..., students: _Optional[_Union[NotifyStudents, _Mapping]] = ...) -> None: ...

class NotifyParentResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...
