import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class StudyProgram(_message.Message):
    __slots__ = ("id", "name", "code", "description", "class_count", "student_count", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    CODE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    CLASS_COUNT_FIELD_NUMBER: _ClassVar[int]
    STUDENT_COUNT_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: int
    name: str
    code: str
    description: str
    class_count: int
    student_count: int
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[int] = ..., name: _Optional[str] = ..., code: _Optional[str] = ..., description: _Optional[str] = ..., class_count: _Optional[int] = ..., student_count: _Optional[int] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class CreateStudyProgramRequest(_message.Message):
    __slots__ = ("name", "code", "description")
    NAME_FIELD_NUMBER: _ClassVar[int]
    CODE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    name: str
    code: str
    description: str
    def __init__(self, name: _Optional[str] = ..., code: _Optional[str] = ..., description: _Optional[str] = ...) -> None: ...

class CreateStudyProgramResponse(_message.Message):
    __slots__ = ("study_program",)
    STUDY_PROGRAM_FIELD_NUMBER: _ClassVar[int]
    study_program: StudyProgram
    def __init__(self, study_program: _Optional[_Union[StudyProgram, _Mapping]] = ...) -> None: ...

class GetStudyProgramRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class GetStudyProgramResponse(_message.Message):
    __slots__ = ("study_program",)
    STUDY_PROGRAM_FIELD_NUMBER: _ClassVar[int]
    study_program: StudyProgram
    def __init__(self, study_program: _Optional[_Union[StudyProgram, _Mapping]] = ...) -> None: ...

class UpdateStudyProgramRequest(_message.Message):
    __slots__ = ("id", "name", "code", "description")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    CODE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    id: int
    name: str
    code: str
    description: str
    def __init__(self, id: _Optional[int] = ..., name: _Optional[str] = ..., code: _Optional[str] = ..., description: _Optional[str] = ...) -> None: ...

class UpdateStudyProgramResponse(_message.Message):
    __slots__ = ("study_program",)
    STUDY_PROGRAM_FIELD_NUMBER: _ClassVar[int]
    study_program: StudyProgram
    def __init__(self, study_program: _Optional[_Union[StudyProgram, _Mapping]] = ...) -> None: ...

class DeleteStudyProgramRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class DeleteStudyProgramResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ListStudyProgramsRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ListStudyProgramsResponse(_message.Message):
    __slots__ = ("study_programs",)
    STUDY_PROGRAMS_FIELD_NUMBER: _ClassVar[int]
    study_programs: _containers.RepeatedCompositeFieldContainer[StudyProgram]
    def __init__(self, study_programs: _Optional[_Iterable[_Union[StudyProgram, _Mapping]]] = ...) -> None: ...
