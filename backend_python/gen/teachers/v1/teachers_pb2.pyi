import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Teacher(_message.Message):
    __slots__ = ("id", "name", "teacher_id", "subject", "email", "phone", "class_count", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    TEACHER_ID_FIELD_NUMBER: _ClassVar[int]
    SUBJECT_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    PHONE_FIELD_NUMBER: _ClassVar[int]
    CLASS_COUNT_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: int
    name: str
    teacher_id: str
    subject: str
    email: str
    phone: str
    class_count: int
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[int] = ..., name: _Optional[str] = ..., teacher_id: _Optional[str] = ..., subject: _Optional[str] = ..., email: _Optional[str] = ..., phone: _Optional[str] = ..., class_count: _Optional[int] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class CreateTeacherRequest(_message.Message):
    __slots__ = ("name", "teacher_id", "subject", "email", "phone")
    NAME_FIELD_NUMBER: _ClassVar[int]
    TEACHER_ID_FIELD_NUMBER: _ClassVar[int]
    SUBJECT_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    PHONE_FIELD_NUMBER: _ClassVar[int]
    name: str
    teacher_id: str
    subject: str
    email: str
    phone: str
    def __init__(self, name: _Optional[str] = ..., teacher_id: _Optional[str] = ..., subject: _Optional[str] = ..., email: _Optional[str] = ..., phone: _Optional[str] = ...) -> None: ...

class CreateTeacherResponse(_message.Message):
    __slots__ = ("teacher",)
    TEACHER_FIELD_NUMBER: _ClassVar[int]
    teacher: Teacher
    def __init__(self, teacher: _Optional[_Union[Teacher, _Mapping]] = ...) -> None: ...

class GetTeacherRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class GetTeacherResponse(_message.Message):
    __slots__ = ("teacher",)
    TEACHER_FIELD_NUMBER: _ClassVar[int]
    teacher: Teacher
    def __init__(self, teacher: _Optional[_Union[Teacher, _Mapping]] = ...) -> None: ...

class UpdateTeacherRequest(_message.Message):
    __slots__ = ("id", "name", "teacher_id", "subject", "email", "phone")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    TEACHER_ID_FIELD_NUMBER: _ClassVar[int]
    SUBJECT_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    PHONE_FIELD_NUMBER: _ClassVar[int]
    id: int
    name: str
    teacher_id: str
    subject: str
    email: str
    phone: str
    def __init__(self, id: _Optional[int] = ..., name: _Optional[str] = ..., teacher_id: _Optional[str] = ..., subject: _Optional[str] = ..., email: _Optional[str] = ..., phone: _Optional[str] = ...) -> None: ...

class UpdateTeacherResponse(_message.Message):
    __slots__ = ("teacher",)
    TEACHER_FIELD_NUMBER: _ClassVar[int]
    teacher: Teacher
    def __init__(self, teacher: _Optional[_Union[Teacher, _Mapping]] = ...) -> None: ...

class DeleteTeacherRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class DeleteTeacherResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ListTeachersRequest(_message.Message):
    __slots__ = ("search",)
    SEARCH_FIELD_NUMBER: _ClassVar[int]
    search: str
    def __init__(self, search: _Optional[str] = ...) -> None: ...

class ListTeachersResponse(_message.Message):
    __slots__ = ("teachers",)
    TEACHERS_FIELD_NUMBER: _ClassVar[int]
    teachers: _containers.RepeatedCompositeFieldContainer[Teacher]
    def __init__(self, teachers: _Optional[_Iterable[_Union[Teacher, _Mapping]]] = ...) -> None: ...
