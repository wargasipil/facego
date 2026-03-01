from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.screen import ModalScreen
from textual.widgets import Button, Input, Label, Select
from textual import on

from config import (
    CFG, camera_index, capture_samples, cosine_threshold,
    faces_db_path, model_det_size, model_name, model_provider, model_root,
    save_config,
)
from face_engine import reset_face_app


class SettingsScreen(ModalScreen):

    CSS = """
    SettingsScreen { align: center middle; }
    #settings-box {
        width: 72; height: auto;
        border: thick $accent; background: #161b22; padding: 2 4;
    }
    #settings-title {
        text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1;
        border-bottom: solid #30363d; padding-bottom: 1;
    }
    .field-row   { height: 3; margin-bottom: 0; }
    .field-label { color: #8b949e; width: 24; content-align: left middle; }
    Input  { width: 1fr; }
    Select { width: 1fr; }
    #hint    { color: #484f58; text-align: center; margin-top: 1;
               border-top: solid #30363d; padding-top: 1; height: auto; }
    #btn-row { margin-top: 1; height: auto; }
    Button   { margin: 0 1; }
    """

    PROVIDERS = [
        ("CPU  (CPUExecutionProvider)",      "CPUExecutionProvider"),
        ("CUDA (CUDAExecutionProvider)",     "CUDAExecutionProvider"),
        ("CoreML (CoreMLExecutionProvider)", "CoreMLExecutionProvider"),
    ]

    def compose(self) -> ComposeResult:
        w, h = model_det_size()
        with Container(id="settings-box"):
            yield Label("⚙  Settings", id="settings-title")
            for label, value, inp_id, placeholder in [
                ("Model name",      model_name(), "inp-model-name", "buffalo_l / buffalo_s / antelopev2"),
                ("Model root path", model_root(), "inp-model-root", "Leave blank for default (~/.insightface/models)"),
            ]:
                with Horizontal(classes="field-row"):
                    yield Label(label, classes="field-label")
                    yield Input(value=value, id=inp_id, placeholder=placeholder)
            with Horizontal(classes="field-row"):
                yield Label("ONNX provider", classes="field-label")
                yield Select(options=self.PROVIDERS, value=model_provider(), id="sel-provider")
            for label, value, inp_id, placeholder in [
                ("Det size (W H)",   f"{w} {h}",                                  "inp-det-size",  "640 640"),
                ("Cosine threshold", str(CFG["recognition"]["cosine_threshold"]),  "inp-threshold", "0.40"),
                ("Capture samples",  str(capture_samples()),                       "inp-samples",   "8"),
                ("Camera index",     str(camera_index()),                          "inp-cam-idx",   "0"),
                ("Faces DB path",    faces_db_path(),                              "inp-db-path",   "registered_faces.pkl"),
            ]:
                with Horizontal(classes="field-row"):
                    yield Label(label, classes="field-label")
                    yield Input(value=value, id=inp_id, placeholder=placeholder)
            yield Label("Changes saved to config.yaml and applied immediately.\n"
                        "Model reloads on next detection/registration start.", id="hint")
            with Horizontal(id="btn-row"):
                yield Button("Save",   variant="primary", id="btn-save")
                yield Button("Cancel", variant="error",   id="btn-cancel")

    @on(Button.Pressed, "#btn-cancel")
    def cancel(self): self.dismiss(False)

    @on(Button.Pressed, "#btn-save")
    def save_settings(self):
        errs  = []
        name  = self.query_one("#inp-model-name", Input).value.strip()
        root  = self.query_one("#inp-model-root", Input).value.strip()
        prov  = self.query_one("#sel-provider",   Select).value
        dsize = self.query_one("#inp-det-size",   Input).value.strip()
        thr   = self.query_one("#inp-threshold",  Input).value.strip()
        samp  = self.query_one("#inp-samples",    Input).value.strip()
        cam   = self.query_one("#inp-cam-idx",    Input).value.strip()
        db    = self.query_one("#inp-db-path",    Input).value.strip()

        try:
            parts = dsize.split(); assert len(parts) == 2
            w, h  = int(parts[0]), int(parts[1])
        except Exception: errs.append("Det size: two integers e.g. '640 640'")

        try:    thr_f  = float(thr);  assert 0 < thr_f < 1
        except: errs.append("Threshold: float 0–1")

        try:    samp_i = int(samp);   assert samp_i >= 1
        except: errs.append("Samples: positive integer")

        try:    cam_i  = int(cam);    assert cam_i >= 0
        except: errs.append("Camera index: non-negative integer")

        if errs:
            self.query_one("#hint", Label).update("⚠ " + "  |  ".join(errs))
            return

        CFG["model"]["name"]                   = name
        CFG["model"]["root"]                   = root
        CFG["model"]["det_size"]               = [w, h]
        CFG["model"]["provider"]               = str(prov)
        CFG["recognition"]["cosine_threshold"] = thr_f
        CFG["recognition"]["capture_samples"]  = samp_i
        CFG["camera"]["device_index"]          = cam_i
        CFG["storage"]["faces_db"]             = db or "registered_faces.pkl"
        save_config(CFG)
        reset_face_app()
        self.dismiss(True)
