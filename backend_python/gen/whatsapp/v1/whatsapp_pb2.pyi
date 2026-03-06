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

class WhatsappMessageStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    WHATSAPP_MESSAGE_STATUS_UNSPECIFIED: _ClassVar[WhatsappMessageStatus]
    WHATSAPP_MESSAGE_STATUS_PENDING: _ClassVar[WhatsappMessageStatus]
    WHATSAPP_MESSAGE_STATUS_SENT: _ClassVar[WhatsappMessageStatus]
    WHATSAPP_MESSAGE_STATUS_ERROR: _ClassVar[WhatsappMessageStatus]
WHATSAPP_MESSAGE_STATUS_UNSPECIFIED: WhatsappMessageStatus
WHATSAPP_MESSAGE_STATUS_PENDING: WhatsappMessageStatus
WHATSAPP_MESSAGE_STATUS_SENT: WhatsappMessageStatus
WHATSAPP_MESSAGE_STATUS_ERROR: WhatsappMessageStatus

class WStreamRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class NeedLogin(_message.Message):
    __slots__ = ("code",)
    CODE_FIELD_NUMBER: _ClassVar[int]
    code: str
    def __init__(self, code: _Optional[str] = ...) -> None: ...

class WStreamResponse(_message.Message):
    __slots__ = ("need_login", "sync_completed")
    NEED_LOGIN_FIELD_NUMBER: _ClassVar[int]
    SYNC_COMPLETED_FIELD_NUMBER: _ClassVar[int]
    need_login: NeedLogin
    sync_completed: bool
    def __init__(self, need_login: _Optional[_Union[NeedLogin, _Mapping]] = ..., sync_completed: _Optional[bool] = ...) -> None: ...

class StatusRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class StatusResponse(_message.Message):
    __slots__ = ("connected", "phone_number")
    CONNECTED_FIELD_NUMBER: _ClassVar[int]
    PHONE_NUMBER_FIELD_NUMBER: _ClassVar[int]
    connected: bool
    phone_number: str
    def __init__(self, connected: _Optional[bool] = ..., phone_number: _Optional[str] = ...) -> None: ...

class WhatsappMessage(_message.Message):
    __slots__ = ("id", "student_id", "class_id", "class_schedule_id", "attendance_id", "student_name", "parent_name", "phone", "message", "status", "error", "sent_at", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    STUDENT_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_ID_FIELD_NUMBER: _ClassVar[int]
    CLASS_SCHEDULE_ID_FIELD_NUMBER: _ClassVar[int]
    ATTENDANCE_ID_FIELD_NUMBER: _ClassVar[int]
    STUDENT_NAME_FIELD_NUMBER: _ClassVar[int]
    PARENT_NAME_FIELD_NUMBER: _ClassVar[int]
    PHONE_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    SENT_AT_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: int
    student_id: int
    class_id: int
    class_schedule_id: int
    attendance_id: int
    student_name: str
    parent_name: str
    phone: str
    message: str
    status: WhatsappMessageStatus
    error: str
    sent_at: _timestamp_pb2.Timestamp
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[int] = ..., student_id: _Optional[int] = ..., class_id: _Optional[int] = ..., class_schedule_id: _Optional[int] = ..., attendance_id: _Optional[int] = ..., student_name: _Optional[str] = ..., parent_name: _Optional[str] = ..., phone: _Optional[str] = ..., message: _Optional[str] = ..., status: _Optional[_Union[WhatsappMessageStatus, str]] = ..., error: _Optional[str] = ..., sent_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class ListMessagesRequest(_message.Message):
    __slots__ = ("page", "page_size")
    PAGE_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    page: int
    page_size: int
    def __init__(self, page: _Optional[int] = ..., page_size: _Optional[int] = ...) -> None: ...

class ListMessagesResponse(_message.Message):
    __slots__ = ("messages", "total")
    MESSAGES_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    messages: _containers.RepeatedCompositeFieldContainer[WhatsappMessage]
    total: int
    def __init__(self, messages: _Optional[_Iterable[_Union[WhatsappMessage, _Mapping]]] = ..., total: _Optional[int] = ...) -> None: ...

class WhatsappConfig(_message.Message):
    __slots__ = ("enabled", "late_message_template", "absent_message_template", "sender_name")
    ENABLED_FIELD_NUMBER: _ClassVar[int]
    LATE_MESSAGE_TEMPLATE_FIELD_NUMBER: _ClassVar[int]
    ABSENT_MESSAGE_TEMPLATE_FIELD_NUMBER: _ClassVar[int]
    SENDER_NAME_FIELD_NUMBER: _ClassVar[int]
    enabled: bool
    late_message_template: str
    absent_message_template: str
    sender_name: str
    def __init__(self, enabled: _Optional[bool] = ..., late_message_template: _Optional[str] = ..., absent_message_template: _Optional[str] = ..., sender_name: _Optional[str] = ...) -> None: ...

class SendAttendanceAlertsRequest(_message.Message):
    __slots__ = ("date", "notify_late", "notify_absent", "class_filter", "user_ids")
    DATE_FIELD_NUMBER: _ClassVar[int]
    NOTIFY_LATE_FIELD_NUMBER: _ClassVar[int]
    NOTIFY_ABSENT_FIELD_NUMBER: _ClassVar[int]
    CLASS_FILTER_FIELD_NUMBER: _ClassVar[int]
    USER_IDS_FIELD_NUMBER: _ClassVar[int]
    date: _timestamp_pb2.Timestamp
    notify_late: bool
    notify_absent: bool
    class_filter: str
    user_ids: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, date: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., notify_late: _Optional[bool] = ..., notify_absent: _Optional[bool] = ..., class_filter: _Optional[str] = ..., user_ids: _Optional[_Iterable[int]] = ...) -> None: ...

class SendAttendanceAlertsResponse(_message.Message):
    __slots__ = ("queued", "skipped", "messages")
    QUEUED_FIELD_NUMBER: _ClassVar[int]
    SKIPPED_FIELD_NUMBER: _ClassVar[int]
    MESSAGES_FIELD_NUMBER: _ClassVar[int]
    queued: int
    skipped: int
    messages: _containers.RepeatedCompositeFieldContainer[WhatsappMessage]
    def __init__(self, queued: _Optional[int] = ..., skipped: _Optional[int] = ..., messages: _Optional[_Iterable[_Union[WhatsappMessage, _Mapping]]] = ...) -> None: ...

class SendMessageRequest(_message.Message):
    __slots__ = ("phone", "message")
    PHONE_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    phone: str
    message: str
    def __init__(self, phone: _Optional[str] = ..., message: _Optional[str] = ...) -> None: ...

class SendMessageResponse(_message.Message):
    __slots__ = ("success", "error")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    success: bool
    error: str
    def __init__(self, success: _Optional[bool] = ..., error: _Optional[str] = ...) -> None: ...

class GetConfigRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class GetConfigResponse(_message.Message):
    __slots__ = ("config",)
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    config: WhatsappConfig
    def __init__(self, config: _Optional[_Union[WhatsappConfig, _Mapping]] = ...) -> None: ...

class SaveConfigRequest(_message.Message):
    __slots__ = ("config",)
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    config: WhatsappConfig
    def __init__(self, config: _Optional[_Union[WhatsappConfig, _Mapping]] = ...) -> None: ...

class SaveConfigResponse(_message.Message):
    __slots__ = ("config",)
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    config: WhatsappConfig
    def __init__(self, config: _Optional[_Union[WhatsappConfig, _Mapping]] = ...) -> None: ...
