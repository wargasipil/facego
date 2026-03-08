from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class FaceRecord(_message.Message):
    __slots__ = ("student_id", "embeddings", "embedding_count")
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    EMBEDDINGS_FIELD_NUMBER: _ClassVar[int]
    EMBEDDING_COUNT_FIELD_NUMBER: _ClassVar[int]
    student_id: int
    embeddings: bytes
    embedding_count: int
    def __init__(self, student_id: _Optional[int] = ..., embeddings: _Optional[bytes] = ..., embedding_count: _Optional[int] = ...) -> None: ...

class UpsertFaceEmbeddingsRequest(_message.Message):
    __slots__ = ("record",)
    RECORD_FIELD_NUMBER: _ClassVar[int]
    record: FaceRecord
    def __init__(self, record: _Optional[_Union[FaceRecord, _Mapping]] = ...) -> None: ...

class UpsertFaceEmbeddingsResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class LoadFaceEmbeddingsRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class LoadFaceEmbeddingsResponse(_message.Message):
    __slots__ = ("records",)
    RECORDS_FIELD_NUMBER: _ClassVar[int]
    records: _containers.RepeatedCompositeFieldContainer[FaceRecord]
    def __init__(self, records: _Optional[_Iterable[_Union[FaceRecord, _Mapping]]] = ...) -> None: ...

class ListFaceEmbeddingsRequest(_message.Message):
    __slots__ = ("q", "page", "page_size")
    Q_FIELD_NUMBER: _ClassVar[int]
    PAGE_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    q: str
    page: int
    page_size: int
    def __init__(self, q: _Optional[str] = ..., page: _Optional[int] = ..., page_size: _Optional[int] = ...) -> None: ...

class ListFaceEmbeddingsResponse(_message.Message):
    __slots__ = ("records", "total")
    RECORDS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    records: _containers.RepeatedCompositeFieldContainer[FaceRecord]
    total: int
    def __init__(self, records: _Optional[_Iterable[_Union[FaceRecord, _Mapping]]] = ..., total: _Optional[int] = ...) -> None: ...

class DeleteFaceEmbeddingsRequest(_message.Message):
    __slots__ = ("student_id",)
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    student_id: int
    def __init__(self, student_id: _Optional[int] = ...) -> None: ...

class DeleteFaceEmbeddingsResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class DeleteAllFaceEmbeddingsRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class DeleteAllFaceEmbeddingsResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...
