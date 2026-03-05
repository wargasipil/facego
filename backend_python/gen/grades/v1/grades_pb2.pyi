import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Grade(_message.Message):
    __slots__ = ("id", "level", "label", "description", "class_count", "student_count", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    LEVEL_FIELD_NUMBER: _ClassVar[int]
    LABEL_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    CLASS_COUNT_FIELD_NUMBER: _ClassVar[int]
    STUDENT_COUNT_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: int
    level: str
    label: str
    description: str
    class_count: int
    student_count: int
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[int] = ..., level: _Optional[str] = ..., label: _Optional[str] = ..., description: _Optional[str] = ..., class_count: _Optional[int] = ..., student_count: _Optional[int] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class CreateGradeRequest(_message.Message):
    __slots__ = ("level", "label", "description")
    LEVEL_FIELD_NUMBER: _ClassVar[int]
    LABEL_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    level: str
    label: str
    description: str
    def __init__(self, level: _Optional[str] = ..., label: _Optional[str] = ..., description: _Optional[str] = ...) -> None: ...

class CreateGradeResponse(_message.Message):
    __slots__ = ("grade",)
    GRADE_FIELD_NUMBER: _ClassVar[int]
    grade: Grade
    def __init__(self, grade: _Optional[_Union[Grade, _Mapping]] = ...) -> None: ...

class GetGradeRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class GetGradeResponse(_message.Message):
    __slots__ = ("grade",)
    GRADE_FIELD_NUMBER: _ClassVar[int]
    grade: Grade
    def __init__(self, grade: _Optional[_Union[Grade, _Mapping]] = ...) -> None: ...

class UpdateGradeRequest(_message.Message):
    __slots__ = ("id", "level", "label", "description")
    ID_FIELD_NUMBER: _ClassVar[int]
    LEVEL_FIELD_NUMBER: _ClassVar[int]
    LABEL_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    id: int
    level: str
    label: str
    description: str
    def __init__(self, id: _Optional[int] = ..., level: _Optional[str] = ..., label: _Optional[str] = ..., description: _Optional[str] = ...) -> None: ...

class UpdateGradeResponse(_message.Message):
    __slots__ = ("grade",)
    GRADE_FIELD_NUMBER: _ClassVar[int]
    grade: Grade
    def __init__(self, grade: _Optional[_Union[Grade, _Mapping]] = ...) -> None: ...

class DeleteGradeRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class DeleteGradeResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ListGradesRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ListGradesResponse(_message.Message):
    __slots__ = ("grades",)
    GRADES_FIELD_NUMBER: _ClassVar[int]
    grades: _containers.RepeatedCompositeFieldContainer[Grade]
    def __init__(self, grades: _Optional[_Iterable[_Union[Grade, _Mapping]]] = ...) -> None: ...
