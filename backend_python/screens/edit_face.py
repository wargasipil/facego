from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.message import Message
from textual.screen import ModalScreen
from textual.widgets import Button, Input, Label
from textual import on

from face_engine import validate_name, validate_person_id


class EditFaceScreen(ModalScreen):

    CSS = """
    EditFaceScreen { align: center middle; }
    #edit-box {
        width: 66; height: auto;
        border: thick $accent; background: #161b22; padding: 2 4;
    }
    #edit-title  { text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1; }
    .field-row   { height: 3; margin-bottom: 0; }
    .field-label { color: #8b949e; width: 18; content-align: left middle; }
    .field-error { color: #f85149; height: 1; margin-left: 19; margin-bottom: 0; }
    Input        { width: 1fr; }
    #btn-row     { margin-top: 1; height: auto; }
    Button       { margin: 0 1; }
    """

    class Updated(Message):
        def __init__(self, old_pid: str, new_pid: str, new_name: str):
            super().__init__()
            self.old_pid  = old_pid
            self.new_pid  = new_pid
            self.new_name = new_name

    def __init__(self, pid: str, db: dict):
        super().__init__()
        self._pid = pid
        self._db  = db

    def compose(self) -> ComposeResult:
        record = self._db.get(self._pid, {})
        with Container(id="edit-box"):
            yield Label(f"✏  Edit  —  {record.get('name', self._pid)}", id="edit-title")
            with Horizontal(classes="field-row"):
                yield Label("Person ID *", classes="field-label")
                yield Input(value=record.get("person_id", self._pid),
                            id="inp-pid", placeholder="e.g. EMP001")
            yield Label("", id="err-pid", classes="field-error")
            with Horizontal(classes="field-row"):
                yield Label("Name *", classes="field-label")
                yield Input(value=record.get("name", ""),
                            id="inp-name", placeholder="e.g. Alice Smith")
            yield Label("", id="err-name", classes="field-error")
            with Horizontal(id="btn-row"):
                yield Button("Save",   variant="primary", id="btn-save")
                yield Button("Cancel", variant="error",   id="btn-cancel")

    @on(Button.Pressed, "#btn-cancel")
    def cancel(self): self.dismiss(None)

    @on(Button.Pressed, "#btn-save")
    def save(self):
        new_pid  = self.query_one("#inp-pid",  Input).value.strip()
        new_name = self.query_one("#inp-name", Input).value.strip()
        err_pid  = validate_person_id(new_pid, self._db, exclude_pid=self._pid)
        err_name = validate_name(new_name)
        self.query_one("#err-pid",  Label).update(f"  ⚠ {err_pid}"  if err_pid  else "")
        self.query_one("#err-name", Label).update(f"  ⚠ {err_name}" if err_name else "")
        if err_pid or err_name:
            return
        self.dismiss(self.Updated(self._pid, new_pid, new_name))
