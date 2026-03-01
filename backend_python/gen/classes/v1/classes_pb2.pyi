import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from users.v1 import users_pb2 as _users_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Grade(_message.Message):
    __slots__ = ("id", "level", "label")
    ID_FIELD_NUMBER: _ClassVar[int]
    LEVEL_FIELD_NUMBER: _ClassVar[int]
    LABEL_FIELD_NUMBER: _ClassVar[int]
    id: int
    level: str
    label: str
    def __init__(self, id: _Optional[int] = ..., level: _Optional[str] = ..., label: _Optional[str] = ...) -> None: ...

class Teacher(_message.Message):
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

class Class(_message.Message):
    __slots__ = ("id", "name", "grade", "teacher", "student_count", "description", "created_at", "grade_id", "teacher_id", "study_program_id", "study_program_name")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    GRADE_FIELD_NUMBER: _ClassVar[int]
    TEACHER_FIELD_NUMBER: _ClassVar[int]
    STUDENT_COUNT_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    GRADE_ID_FIELD_NUMBER: _ClassVar[int]
    TEACHER_ID_FIELD_NUMBER: _ClassVar[int]
    STUDY_PROGRAM_ID_FIELD_NUMBER: _ClassVar[int]
    STUDY_PROGRAM_NAME_FIELD_NUMBER: _ClassVar[int]
    id: int
    name: str
    grade: Grade
    teacher: Teacher
    student_count: int
    description: str
    created_at: _timestamp_pb2.Timestamp
    grade_id: int
    teacher_id: int
    study_program_id: int
    study_program_name: str
    def __init__(self, id: _Optional[int] = ..., name: _Optional[str] = ..., grade: _Optional[_Union[Grade, _Mapping]] = ..., teacher: _Optional[_Union[Teacher, _Mapping]] = ..., student_count: _Optional[int] = ..., description: _Optional[str] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., grade_id: _Optional[int] = ..., teacher_id: _Optional[int] = ..., study_program_id: _Optional[int] = ..., study_program_name: _Optional[str] = ...) -> None: ...

class CreateClassRequest(_message.Message):
    __slots__ = ("name", "grade_id", "teacher_id", "description", "study_program_id")
    NAME_FIELD_NUMBER: _ClassVar[int]
    GRADE_ID_FIELD_NUMBER: _ClassVar[int]
    TEACHER_ID_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    STUDY_PROGRAM_ID_FIELD_NUMBER: _ClassVar[int]
    name: str
    grade_id: int
    teacher_id: int
    description: str
    study_program_id: int
    def __init__(self, name: _Optional[str] = ..., grade_id: _Optional[int] = ..., teacher_id: _Optional[int] = ..., description: _Optional[str] = ..., study_program_id: _Optional[int] = ...) -> None: ...

class CreateClassResponse(_message.Message):
    __slots__ = ()
    CLASS_FIELD_NUMBER: _ClassVar[int]
    def __init__(self, **kwargs) -> None: ...

class GetClassRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class GetClassResponse(_message.Message):
    __slots__ = ()
    CLASS_FIELD_NUMBER: _ClassVar[int]
    def __init__(self, **kwargs) -> None: ...

class UpdateClassRequest(_message.Message):
    __slots__ = ("id", "name", "grade_id", "teacher_id", "description", "study_program_id")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    GRADE_ID_FIELD_NUMBER: _ClassVar[int]
    TEACHER_ID_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    STUDY_PROGRAM_ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    name: str
    grade_id: int
    teacher_id: int
    description: str
    study_program_id: int
    def __init__(self, id: _Optional[int] = ..., name: _Optional[str] = ..., grade_id: _Optional[int] = ..., teacher_id: _Optional[int] = ..., description: _Optional[str] = ..., study_program_id: _Optional[int] = ...) -> None: ...

class UpdateClassResponse(_message.Message):
    __slots__ = ()
    CLASS_FIELD_NUMBER: _ClassVar[int]
    def __init__(self, **kwargs) -> None: ...

class DeleteClassRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class DeleteClassResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ListClassesRequest(_message.Message):
    __slots__ = ("grade_id_filter", "search", "page", "page_size")
    GRADE_ID_FILTER_FIELD_NUMBER: _ClassVar[int]
    SEARCH_FIELD_NUMBER: _ClassVar[int]
    PAGE_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    grade_id_filter: int
    search: str
    page: int
    page_size: int
    def __init__(self, grade_id_filter: _Optional[int] = ..., search: _Optional[str] = ..., page: _Optional[int] = ..., page_size: _Optional[int] = ...) -> None: ...

class ListClassesResponse(_message.Message):
    __slots__ = ("classes", "total")
    CLASSES_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    classes: _containers.RepeatedCompositeFieldContainer[Class]
    total: int
    def __init__(self, classes: _Optional[_Iterable[_Union[Class, _Mapping]]] = ..., total: _Optional[int] = ...) -> None: ...

class ListClassStudentsRequest(_message.Message):
    __slots__ = ("id", "search", "page", "page_size")
    ID_FIELD_NUMBER: _ClassVar[int]
    SEARCH_FIELD_NUMBER: _ClassVar[int]
    PAGE_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    id: int
    search: str
    page: int
    page_size: int
    def __init__(self, id: _Optional[int] = ..., search: _Optional[str] = ..., page: _Optional[int] = ..., page_size: _Optional[int] = ...) -> None: ...

class ListClassStudentsResponse(_message.Message):
    __slots__ = ("students", "total")
    STUDENTS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    students: _containers.RepeatedCompositeFieldContainer[_users_pb2.User]
    total: int
    def __init__(self, students: _Optional[_Iterable[_Union[_users_pb2.User, _Mapping]]] = ..., total: _Optional[int] = ...) -> None: ...

class ClassSchedule(_message.Message):
    __slots__ = ("id", "class_id", "day_of_week", "start_time", "end_time", "subject", "room")
    ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    DAY_OF_WEEK_FIELD_NUMBER: _ClassVar[int]
    START_TIME_FIELD_NUMBER: _ClassVar[int]
    END_TIME_FIELD_NUMBER: _ClassVar[int]
    SUBJECT_FIELD_NUMBER: _ClassVar[int]
    ROOM_FIELD_NUMBER: _ClassVar[int]
    id: int
    class_id: int
    day_of_week: int
    start_time: str
    end_time: str
    subject: str
    room: str
    def __init__(self, id: _Optional[int] = ..., class_id: _Optional[int] = ..., day_of_week: _Optional[int] = ..., start_time: _Optional[str] = ..., end_time: _Optional[str] = ..., subject: _Optional[str] = ..., room: _Optional[str] = ...) -> None: ...

class ListSchedulesRequest(_message.Message):
    __slots__ = ("class_id",)
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    class_id: int
    def __init__(self, class_id: _Optional[int] = ...) -> None: ...

class ListSchedulesResponse(_message.Message):
    __slots__ = ("schedules",)
    SCHEDULES_FIELD_NUMBER: _ClassVar[int]
    schedules: _containers.RepeatedCompositeFieldContainer[ClassSchedule]
    def __init__(self, schedules: _Optional[_Iterable[_Union[ClassSchedule, _Mapping]]] = ...) -> None: ...

class CreateScheduleRequest(_message.Message):
    __slots__ = ("class_id", "day_of_week", "start_time", "end_time", "subject", "room")
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    DAY_OF_WEEK_FIELD_NUMBER: _ClassVar[int]
    START_TIME_FIELD_NUMBER: _ClassVar[int]
    END_TIME_FIELD_NUMBER: _ClassVar[int]
    SUBJECT_FIELD_NUMBER: _ClassVar[int]
    ROOM_FIELD_NUMBER: _ClassVar[int]
    class_id: int
    day_of_week: int
    start_time: str
    end_time: str
    subject: str
    room: str
    def __init__(self, class_id: _Optional[int] = ..., day_of_week: _Optional[int] = ..., start_time: _Optional[str] = ..., end_time: _Optional[str] = ..., subject: _Optional[str] = ..., room: _Optional[str] = ...) -> None: ...

class CreateScheduleResponse(_message.Message):
    __slots__ = ("schedule",)
    SCHEDULE_FIELD_NUMBER: _ClassVar[int]
    schedule: ClassSchedule
    def __init__(self, schedule: _Optional[_Union[ClassSchedule, _Mapping]] = ...) -> None: ...

class UpdateScheduleRequest(_message.Message):
    __slots__ = ("id", "day_of_week", "start_time", "end_time", "subject", "room")
    ID_FIELD_NUMBER: _ClassVar[int]
    DAY_OF_WEEK_FIELD_NUMBER: _ClassVar[int]
    START_TIME_FIELD_NUMBER: _ClassVar[int]
    END_TIME_FIELD_NUMBER: _ClassVar[int]
    SUBJECT_FIELD_NUMBER: _ClassVar[int]
    ROOM_FIELD_NUMBER: _ClassVar[int]
    id: int
    day_of_week: int
    start_time: str
    end_time: str
    subject: str
    room: str
    def __init__(self, id: _Optional[int] = ..., day_of_week: _Optional[int] = ..., start_time: _Optional[str] = ..., end_time: _Optional[str] = ..., subject: _Optional[str] = ..., room: _Optional[str] = ...) -> None: ...

class UpdateScheduleResponse(_message.Message):
    __slots__ = ("schedule",)
    SCHEDULE_FIELD_NUMBER: _ClassVar[int]
    schedule: ClassSchedule
    def __init__(self, schedule: _Optional[_Union[ClassSchedule, _Mapping]] = ...) -> None: ...

class DeleteScheduleRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class DeleteScheduleResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class EnrollStudentRequest(_message.Message):
    __slots__ = ("class_id", "user_id")
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    class_id: int
    user_id: int
    def __init__(self, class_id: _Optional[int] = ..., user_id: _Optional[int] = ...) -> None: ...

class EnrollStudentResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class UnenrollStudentRequest(_message.Message):
    __slots__ = ("class_id", "user_id")
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    class_id: int
    user_id: int
    def __init__(self, class_id: _Optional[int] = ..., user_id: _Optional[int] = ...) -> None: ...

class UnenrollStudentResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...
