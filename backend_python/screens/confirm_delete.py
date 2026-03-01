from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.screen import ModalScreen
from textual.widgets import Button, Label
from textual import on


class ConfirmDeleteScreen(ModalScreen):

    CSS = """
    ConfirmDeleteScreen { align: center middle; }
    #confirm-box {
        width: 54; height: auto;
        border: thick $error; background: #161b22; padding: 2 4;
    }
    #confirm-title { text-style: bold; color: #f85149; text-align: center; margin-bottom: 1; }
    #confirm-msg   { text-align: center; color: #c9d1d9; margin-bottom: 1; height: auto; }
    #confirm-btns  { height: auto; margin-top: 1; }
    #confirm-btns Button { margin: 0 1; width: 1fr; }
    """

    def __init__(self, message: str):
        super().__init__()
        self._message = message

    def compose(self) -> ComposeResult:
        with Container(id="confirm-box"):
            yield Label("⚠  Confirm Delete", id="confirm-title")
            yield Label(self._message, id="confirm-msg")
            with Horizontal(id="confirm-btns"):
                yield Button("Yes, Delete", variant="error",   id="btn-confirm-yes")
                yield Button("Cancel",      variant="default", id="btn-confirm-no")

    @on(Button.Pressed, "#btn-confirm-yes")
    def confirm(self): self.dismiss(True)

    @on(Button.Pressed, "#btn-confirm-no")
    def cancel(self):  self.dismiss(False)
