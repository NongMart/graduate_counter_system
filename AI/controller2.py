import cv2
import counter2

x_start, y_start = -1, -1
x_end, y_end = -1, -1
drawing = False

def DrawROI(event, x, y, flags, param):
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

line_co = 0
line_thick = 2
line_color = (0,255,0)

def DrawLine(event, x, y, flags, param):
    global drawing,line_co

    # กดเมาส์ซ้าย
    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        line_co = x

    # ลากเมาส์
    elif event == cv2.EVENT_MOUSEMOVE:
        if drawing:
            line_co = x

    elif event == cv2.EVENT_LBUTTONUP:
        drawing = False

######################################### P R E P A R E ###################################

BACKEND_URL = "http://localhost:5000/api/python/update-count"
counter2.setPostURL(BACKEND_URL)

def ROI():
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    windowname = "Prepare"
    cv2.namedWindow(windowname)
    cv2.setMouseCallback(windowname, DrawROI)
    
    while True:
        ret, frame = cap.read()

        if not ret:
            break

        frame = cv2.resize(frame,(640,360))
        cv2.line(frame, (line_co, 0),(line_co, 360), line_color, line_thick)
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

def Line():
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    windowname = "Prepare"
    cv2.namedWindow(windowname)
    cv2.setMouseCallback(windowname, DrawLine)
    while True:
        ret, frame = cap.read()

        if not ret:
            break

        frame = cv2.resize(frame,(640,360))

        cv2.line(frame, (line_co, 0),(line_co, 360), line_color, line_thick)
        cv2.imshow(windowname, frame)

        if cv2.waitKey(30) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()

#####################################    P R O G R A M   #########################################################

Line()
ROI()
print(f" ROI : {x_start},{y_start} - > {x_end}, {y_end} Line Coordinate: {line_co}")

counter2.setCameracapture(0)
counter2.StartCounter(line_co,x_start,y_start,x_end,y_end)
