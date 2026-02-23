import cv2
from fastapi.responses import StreamingResponse
from nicegui import app, ui
from nicegui.elements.table import Table
from nicegui.elements.html import Html
from detect import recognize_frame
from storage import list_person

# 1. Setup Camera
video_capture = cv2.VideoCapture(0)
camera_open = False

def generate_frames():
    global camera_open
    while True:

        success, frame = video_capture.read()
        if not success:
            break
        else:
            pframe = recognize_frame(frame=frame)
            if pframe is None:
                pframe = frame
            
            # Encode frame as JPEG
            try:

                ret, buffer = cv2.imencode('.jpg', pframe)
                frame_bytes = buffer.tobytes()
            except Exception as e:
                print(e)
            
            # Yield the frame in a format the browser understands (MJPEG)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

# 2. Create a FastAPI route for the video stream
@app.get('/video_feed')
def video_feed():
    return StreamingResponse(generate_frames(), 
                             media_type='multipart/x-mixed-replace; boundary=frame')

user_table: Table
video_element: Html


def toggle_camera():
    global video_element
    global camera_open

    if not video_element:
        return
    
    if camera_open:
        camera_open = False
        video_element.set_content('<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLbUBQA2Zj6FJ6wHxZtUn4zCUZms-mr93jIA&s">')
        
    else:
        camera_open = True
        video_element.set_content('<img src="/video_feed">')
    
    video_element.update()


def refresh_user():
    global user_table
    if user_table:
        user_table.rows = list(list_person())
        user_table.update()




# mulai render ui
ui.page_title("Absensi Pakai Wajah")
ui.timer(1, refresh_user)

with ui.grid(columns=2).classes('w-full'):
    with ui.element('div').classes('w-full'):
        columns = [
            {'name': 'name', 'label': 'Name', 'field': 'name'},
            {'name': 'status', 'label': 'Status', 'field': 'status', 'sortable': True},
        ]
        with ui.row().classes('mb-4'):
            ui.button("clear")
            ui.button("send")
        user_table = ui.table(columns=columns, rows=[], row_key='name').classes('w-full')
        

    with ui.card():
        # ui.html('<img src="/video_feed">')
        video_element = ui.html('<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLbUBQA2Zj6FJ6wHxZtUn4zCUZms-mr93jIA&s">')

        # ui.button("toggle camera", on_click=toggle_camera)
        


ui.run()