import counter
import requests
import os

file_parth = "data.json"

relative_parth = "source/testvdo.mp4"
dir_name = os.path.dirname(os.path.abspath(__file__))
vdo_parth = os.path.join(dir_name,relative_parth)

BACKEND_URL = "http://localhost:5000/api/python/update-count"

counter.setBackendPostUrl(BACKEND_URL)
counter.setCameraCapture(0)

#Region Of Interested
x1, y1 = 503, 0  #ซ้้ายบน รับเข้ามา
x2, y2 = 672, 720  #ขวาล่าง รับเข้ามา

new_x1, new_y1 = 237, 61
new_x2, new_y2 = 338, 291 #ถ้าเดินกันไวมากต้องลด new_x2 เพื่อกันคนซ้อนกันใน Zone of Detection


counter.runPrepare()
#counter.startprogram(new_x1,new_y1,new_x2,new_y2)
