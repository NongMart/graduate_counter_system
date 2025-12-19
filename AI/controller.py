import counter
import cv2
import os

drawing = False      
x_start, y_start = -1, -1
x_end, y_end = -1, -1

# ฟังก์ชัน Mouse Callback
def click_event(event, x, y, flags, param):
    global drawing,x_start, y_start,x_end, y_end

    # กดเมาส์ซ้าย
    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        x_start, y_start = x, y
        x_end, y_end = x, y

    # ลากเมาส์
    elif event == cv2.EVENT_MOUSEMOVE:
        if drawing:
            x_end, y_end = x, y

    # ปล่อยเมาส์
    elif event == cv2.EVENT_LBUTTONUP:
        drawing = False
        x_end, y_end = x, y

        print(f"{x_start},{y_start} - > {x_end}, {y_end}")



file_parth = "data.json"

relative_parth = "source/testvdo.mp4"
dir_name = os.path.dirname(os.path.abspath(__file__))
vdo_parth = os.path.join(dir_name,relative_parth)

BACKEND_URL = "http://localhost:5000/api/python/update-count"

counter.setBackendPostUrl(BACKEND_URL)
counter.setCameraCapture(0)

new_x1, new_y1 = 237, 61
new_x2, new_y2 = 338, 291 #ถ้าเดินกันไวมากต้องลด new_x2 เพื่อกันคนซ้อนกันใน Zone of Detection


cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
windowname = "Prepare"
cv2.namedWindow(windowname)
cv2.setMouseCallback(windowname, click_event)
while True:
    ret, frame = cap.read()

    if not ret:
        break

    frame = cv2.resize(frame,(640,360))

    if x_start > 0 and x_end > 0:
        cv2.rectangle(
        frame,
        (x_start, y_start),
        (x_end, y_end),
        (0, 255, 0),
        2
    )
    cv2.imshow(windowname, frame)

    if cv2.waitKey(30) & 0xFF == ord('q'):
        break
cap.release()
cv2.destroyAllWindows()

print(f"{x_start},{y_start} - > {x_end}, {y_end}")
counter.startprogram(x_start, y_start,x_end, y_end)
