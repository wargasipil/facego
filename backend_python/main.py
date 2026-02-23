from textual.app import App, ComposeResult
from textual.containers import Horizontal, HorizontalGroup, Vertical
from textual.reactive import reactive
from textual.screen import ModalScreen
from textual.widgets import Button, Footer, Header, Input, Label, RichLog, Static


from detect import detect_thread


class RegisterForm(ModalScreen[dict[str, str] | None]):
    def compose(self) -> ComposeResult:
        with Vertical(id="register_form"):
            yield Static("Register Face User", id="register_title")
            yield Input(placeholder="user_code", id="user_code")
            yield Input(placeholder="name", id="name")
            with Horizontal(id="register_actions"):
                yield Button("Cancel", id="cancel_register")
                yield Button("Register", id="submit_register", variant="success")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "cancel_register":
            self.dismiss(None)
            return

        if event.button.id != "submit_register":
            return

        user_code = self.query_one("#user_code", Input).value.strip()
        name = self.query_one("#name", Input).value.strip()
        if not user_code or not name:
            return

        self.dismiss({"user_code": user_code, "name": name})


class ButtonGroup(HorizontalGroup):

    def compose(self) -> ComposeResult:
        yield Button("register face", id="register")
        yield Button("run detection", id="run")

  
class FaceDetectionApp(App):
    """A Textual app to manage face registration and detection actions."""
    detection_running = reactive(False)

    CSS = """
    RegisterForm {
        align: center middle;
    }

    #register_form {
        width: 52;
        height: auto;
        max-height: 80%;
        padding: 1 2;
        border: tall $accent;
        background: $surface;
    }

    #register_title {
        width: 1fr;
        text-style: bold;
        margin-bottom: 1;
    }

    #register_form Input {
        margin-bottom: 1;
    }

    #register_actions {
        width: 100%;
        margin-top: 1;
    }

    #register_actions Button {
        width: 1fr;
    }
    """

    # BINDINGS = [("d", "toggle_dark", "Toggle dark mode")]

    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        yield Header()
        yield ButtonGroup()
        yield RichLog(id="log")
        yield Footer()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "register":
            self.push_screen(RegisterForm(), self._on_register_submitted)
            return

        if event.button.id == "run":
            self.detection_running = not self.detection_running
            run_button = self.query_one("#run", Button)
            group = self.query_one(ButtonGroup)
            log = self.query_one("#log", RichLog)

            if self.detection_running:
                run_button.label = "stop detection"
                group.label = "detection running"
                log.write("Detection started")
                detect_thread.start()
            else:
                run_button.label = "run detection"
                group.label = "detection stopped"
                log.write("Detection stopped")

    def _on_register_submitted(self, result: dict[str, str] | None) -> None:
        if result is None:
            return

        user_code = result["user_code"]
        name = result["name"]

        self.query_one(ButtonGroup).label = f"registered: {user_code}"
        self.query_one("#log", RichLog).write(
            f"Register next action -> user_code={user_code}, name={name}"
        )


if __name__ == "__main__":
    app = FaceDetectionApp()
    app.run()
