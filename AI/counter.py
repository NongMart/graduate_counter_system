import cv2
import mediapipe as mp
from deep_sort_realtime.deepsort_tracker import DeepSort
import json
import requests
import time
import os

url_post = ""

RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
RESET = "\033[0m"


# ฟังก์ชัน Detect วัตถุ
def detect_by_pipe(crop, pose, x1=0, y1=0):
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb)
    coor = []

    if results.pose_landmarks:
        h, w, _ = crop.shape

        xs = [int(lm.x * w) + x1 for lm in results.pose_landmarks.landmark]
        ys = [int(lm.y * h) + y1 for lm in results.pose_landmarks.landmark]

        x_min, x_max = int(min(xs)), int(max(xs))
        y_min, y_max = int(min(ys)), int(max(ys))

        coor.append(([x_min, y_min, x_max, y_max], 1.0, "person"))

    return coor



tracker = DeepSort(max_age=3)

boolhabdle = False
frame_count = 0
count = 0 #ส่งออก จำนวนคนที่ผ่านเข้ามาในเฟรมที่ครอป
indexcapture = 0 #รับ input


mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False,
                    model_complexity=1,
                    enable_segmentation=False,
                    min_detection_confidence=0.58)

def fetch_command():
    try:
        resp = requests.get("http://localhost:5000/api/python/command", timeout=1)
        data = resp.json()
        return data
    except:
        return None


def startprogram(x1=0, y1=0, x2=0, y2=0):
    global frame_count
    global boolhabdle
    global count
    crop_warning = False
    lasted_count = 0
    timestamp = ""
    m_delta = 0
    
    x_start = min(x1,x2)
    x_end = max(x1,x2)
    y_start = min(y1,y2)
    y_end = max(y1,y2)

    cap = cv2.VideoCapture(indexcapture, cv2.CAP_DSHOW)
    fps = cap.get(cv2.CAP_PROP_FPS)
    windowname = "Camera"
    
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
            print(f"{YELLOW}can not capture{RESET}")
            break
        
        frame_count += 1
        frame = cv2.resize(frame, (640, 360))
        crop = []
        if x_end>x_start and y_end>y_start:
            crop = frame.copy()
            crop = crop[y_start:y_end , x_start:x_end]
        else:
            if not crop_warning:
                print(f"{YELLOW}Your crop is Empty{RESET}")
                print(f"{x1},{y1} -> {x2},{y2}")
                crop_warning = True

        local_time = time.localtime(time.time())


        if counting and len(crop) != 0:
            if frame_count % 3 == 0:
                coor = detect_by_pipe(crop,pose,x1, y1)
                tracks = tracker.update_tracks(coor, frame=frame)

                for track in tracks:
                    if not track.is_confirmed():
                        continue

                    track_id = track.track_id
                    if not boolhabdle:
                        count += 1
                        total_count_from_backend += 1
                        timestamp = time.strftime("%Y-%m-%d_%H:%M:%S", local_time)
                        boolhabdle = True

                    if len(coor) != 0:
                        tempbox = coor[0][0]
                    #print(f"{GREEN}Detected ID {track_id}{RESET}")
                    cv2.rectangle(frame, (tempbox[0], tempbox[1]), (tempbox[2], tempbox[3]), (0,255,0), 2, lineType=cv2.LINE_8)
                    cv2.putText(frame, f"ID", (tempbox[0], tempbox[1] - 5),cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 2)

                if len(tracks) == 0:
                    boolhabdle = False

        
        if fps == 0:
            fps = 30
        if frame_count % fps == 0:
            if m_delta != manual_delta:
                m_delta = manual_delta
                data = {
                    "People_Count_AI": count,
                    "Manual_Delta": manual_delta,
                    "People_Count_Total": total_count_from_backend,
                    "Time_Stamp": timestamp
                }
                writeFile(data, "data")


        cv2.imshow(windowname, frame)
        if len(crop) != 0:
            cv2.imshow("crop", crop)

        if lasted_count < count:
            data = {
                "People_Count_AI": count,
                "Manual_Delta": manual_delta,
                "People_Count_Total": total_count_from_backend,
                "Time_Stamp": timestamp
            }
            
            writeFile(data, "data")
            lasted_count = count

            if url_post:
                try:
                    resp = requests.post(
                        url_post,
                        json={"count": count}
                    )
                except Exception as e:
                    print(f"Error sending to backend: {e}")


        if cv2.waitKey(1) & 0xFF == ord('q'):
            print(f"{YELLOW}Exit by keyboard Interrupted 'Q'{RESET}")
            break
    cap.release()
    cv2.destroyAllWindows()

def writeFile(newdata, filname):
    #file_date = time.strftime("%Y-%m-%d", time.localtime(time.time()))
    file = f"{filname}.json"
    if os.path.exists(file):
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = []
    data.append(newdata)
    with open(file,"w",encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    #print(f"{GREEN}Save filie succeeded{RESET}")

def setCameraCapture(value):
    global indexcapture
    indexcapture = value

def setBackendPostUrl(url):
    global url_post
    url_post = url
