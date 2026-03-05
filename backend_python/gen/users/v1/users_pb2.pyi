import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class User(_message.Message):
    __slots__ = ("id", "name", "student_id", "class_name", "email", "photo_url", "registered_at", "parent_name", "parent_phone", "parent_email", "study_program_id", "study_program_name", "grade_id", "grade_label")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_NAME_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    PHOTO_URL_FIELD_NUMBER: _ClassVar[int]
    REGISTERED_AT_FIELD_NUMBER: _ClassVar[int]
    PARENT_NAME_FIELD_NUMBER: _ClassVar[int]
    PARENT_PHONE_FIELD_NUMBER: _ClassVar[int]
    PARENT_EMAIL_FIELD_NUMBER: _ClassVar[int]
    STUDY_PROGRAM_ID_FIELD_NUMBER: _ClassVar[int]
    STUDY_PROGRAM_NAME_FIELD_NUMBER: _ClassVar[int]
    GRADE_ID_FIELD_NUMBER: _ClassVar[int]
    GRADE_LABEL_FIELD_NUMBER: _ClassVar[int]
    id: int
    name: str
    student_id: str
    class_name: str
    email: str
    photo_url: str
    registered_at: _timestamp_pb2.Timestamp
    parent_name: str
    parent_phone: str
    parent_email: str
    study_program_id: int
    study_program_name: str
    grade_id: int
    grade_label: str
    def __init__(self, id: _Optional[int] = ..., name: _Optional[str] = ..., student_id: _Optional[str] = ..., class_name: _Optional[str] = ..., email: _Optional[str] = ..., photo_url: _Optional[str] = ..., registered_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., parent_name: _Optional[str] = ..., parent_phone: _Optional[str] = ..., parent_email: _Optional[str] = ..., study_program_id: _Optional[int] = ..., study_program_name: _Optional[str] = ..., grade_id: _Optional[int] = ..., grade_label: _Optional[str] = ...) -> None: ...

class RegisterUserRequest(_message.Message):
    __slots__ = ("name", "student_id", "email", "face_image", "parent_name", "parent_phone", "parent_email", "study_program_id", "grade_id")
    NAME_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    FACE_IMAGE_FIELD_NUMBER: _ClassVar[int]
    PARENT_NAME_FIELD_NUMBER: _ClassVar[int]
    PARENT_PHONE_FIELD_NUMBER: _ClassVar[int]
    PARENT_EMAIL_FIELD_NUMBER: _ClassVar[int]
    STUDY_PROGRAM_ID_FIELD_NUMBER: _ClassVar[int]
    GRADE_ID_FIELD_NUMBER: _ClassVar[int]
    name: str
    student_id: str
    email: str
    face_image: bytes
    parent_name: str
    parent_phone: str
    parent_email: str
    study_program_id: int
    grade_id: int
    def __init__(self, name: _Optional[str] = ..., student_id: _Optional[str] = ..., email: _Optional[str] = ..., face_image: _Optional[bytes] = ..., parent_name: _Optional[str] = ..., parent_phone: _Optional[str] = ..., parent_email: _Optional[str] = ..., study_program_id: _Optional[int] = ..., grade_id: _Optional[int] = ...) -> None: ...

class RegisterUserResponse(_message.Message):
    __slots__ = ("user",)
    USER_FIELD_NUMBER: _ClassVar[int]
    user: User
    def __init__(self, user: _Optional[_Union[User, _Mapping]] = ...) -> None: ...

class GetUserRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class GetUserResponse(_message.Message):
    __slots__ = ("user",)
    USER_FIELD_NUMBER: _ClassVar[int]
    user: User
    def __init__(self, user: _Optional[_Union[User, _Mapping]] = ...) -> None: ...

class UpdateUserRequest(_message.Message):
    __slots__ = ("id", "name", "student_id", "email", "parent_name", "parent_phone", "parent_email", "study_program_id", "grade_id")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    PARENT_NAME_FIELD_NUMBER: _ClassVar[int]
    PARENT_PHONE_FIELD_NUMBER: _ClassVar[int]
    PARENT_EMAIL_FIELD_NUMBER: _ClassVar[int]
    STUDY_PROGRAM_ID_FIELD_NUMBER: _ClassVar[int]
    GRADE_ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    name: str
    student_id: str
    email: str
    parent_name: str
    parent_phone: str
    parent_email: str
    study_program_id: int
    grade_id: int
    def __init__(self, id: _Optional[int] = ..., name: _Optional[str] = ..., student_id: _Optional[str] = ..., email: _Optional[str] = ..., parent_name: _Optional[str] = ..., parent_phone: _Optional[str] = ..., parent_email: _Optional[str] = ..., study_program_id: _Optional[int] = ..., grade_id: _Optional[int] = ...) -> None: ...

class UpdateUserResponse(_message.Message):
    __slots__ = ("user",)
    USER_FIELD_NUMBER: _ClassVar[int]
    user: User
    def __init__(self, user: _Optional[_Union[User, _Mapping]] = ...) -> None: ...

class DeleteUserRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: int
    def __init__(self, id: _Optional[int] = ...) -> None: ...

class DeleteUserResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ListUserFilter(_message.Message):
    __slots__ = ("search", "class_id")
    SEARCH_FIELD_NUMBER: _ClassVar[int]
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    search: str
    class_id: int
    def __init__(self, search: _Optional[str] = ..., class_id: _Optional[int] = ...) -> None: ...

class ListUsersRequest(_message.Message):
    __slots__ = ("filter", "page", "page_size")
    FILTER_FIELD_NUMBER: _ClassVar[int]
    PAGE_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    filter: ListUserFilter
    page: int
    page_size: int
    def __init__(self, filter: _Optional[_Union[ListUserFilter, _Mapping]] = ..., page: _Optional[int] = ..., page_size: _Optional[int] = ...) -> None: ...

class ListUsersResponse(_message.Message):
    __slots__ = ("users", "total")
    USERS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    users: _containers.RepeatedCompositeFieldContainer[User]
    total: int
    def __init__(self, users: _Optional[_Iterable[_Union[User, _Mapping]]] = ..., total: _Optional[int] = ...) -> None: ...
