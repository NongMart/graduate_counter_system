import cv2 
from ultralytics import YOLO
import math
import requests
import json
import time

model = YOLO("yolov8s.pt", verbose=False)
count = 0
cameraindex = 0
url_post = ""

def setPostURL(value):
    global url_post
    url_post = value
    
def setCameracapture(value):
    global cameraindex
    cameraindex = value

def fetch_command():
    try:
        resp = requests.get("http://localhost:5000/api/python/command", timeout=1)
        data = resp.json()
        return data
    except:
        return None
    
def YOLODetect(frame,crop,x1,y1):
    results = model(crop, conf = 0.5, iou = 0.5, verbose=False)
    coor = []

    for box in results[0].boxes:
        cls = int(box.cls[0]) 
        if cls == 0:
            mx1, my1, mx2, my2 = box.xyxy[0].cpu().numpy().astype(int)

            mx1 += x1
            my1 += y1
            mx2 += x1
            my2 += y1

            cv2.rectangle(frame, (mx1, my1), (mx2, my2), (0, 255, 0), 2)
            cv2.putText(frame, "person", (mx1, my1-10),cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            coor.append([[(mx1 + mx2)/2, (my2 + my1)/2],False])
    return coor, frame

def StartCounter(line_co=0,x1=0, y1=0, x2=0, y2=0):
    counting = True
    count = 0
    cap = cv2.VideoCapture(cameraindex, cv2.CAP_DSHOW)
    obj = []
    d_threshold = 55
    if not cap.isOpened():
        print("Error: Could not open camera.")
        exit()
    frame_count = 0
    line_thick = 2
    line_color = (0,255,0)

    x_start = min(x1,x2)
    x_end = max(x1,x2)
    y_start = min(y1,y2)
    y_end = max(y1,y2)
    
    while True:
        cmd = fetch_command()
        if cmd:
            camera_on = cmd.get("cameraOn", False)
            counting = cmd.get("counting", False)
            manual_delta = cmd.get("manualDelta", 0)
            total_count_from_backend = cmd.get("totalCount", count)

            if not camera_on:
                time.sleep(0.1)
                continue
        ret, frame = cap.read()
        
        if not ret:
            break

        frame = cv2.resize(frame,(640,360))
        frame_count += 1
        roi = frame.copy()
        roi = roi[y_start:y_end, x_start:x_end]
        if frame_count % 3 == 0 and counting:
            coor, frame = YOLODetect(frame,roi,x1,y1)
            coor.sort()
            for i in range(len(coor)):
                if coor[i][0][0] < line_co:
                    for j in range(len(obj)):
                        new = coor[i][0]
                        old = obj[j][0]
                        eucl = math.sqrt((new[0] - old[0])**2 + (new[1] - old [1])**2)
                        if eucl < d_threshold:
                            #print(eucl)
                            #same obj
                            if not obj[j][1]:
                                #print(obj[j][1])
                                coor[i][1] = True
                                count += 1
                                print(count)
                                break
                            else:
                                coor[i][1] = True
                                break
            if len(coor) != 0:
                obj = coor
            
            if url_post and counting:
                try:
                    resp = requests.post(
                        url_post,
                        json={"count": count}
                    )
                except Exception as e:
                    print(f"Error sending to backend: {e}")

        
        cv2.line(frame, (line_co, 0),(line_co, 360), line_color, line_thick)
        cv2.imshow('Camera Feed', frame)
        if len(roi) != 0:
            cv2.imshow('ROI Capture', roi)
        
        if cv2.waitKey(30) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()