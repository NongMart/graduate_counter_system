import counter
import requests

file_part = "data.json"
vdo_parth = "C:/Users/acer/Desktop/graduate_counter_system/AI/source/testvdo.mp4"
BACKEND_URL = "http://localhost:5000/api/python/update-count"

counter.setBackendPostUrl(BACKEND_URL)
counter.setCameraCapture(vdo_parth)

#Region Of Interested
x1, y1 = 503, 0  #ซ้้ายบน รับเข้ามา
x2, y2 = 672, 720  #ขวาล่าง รับเข้ามา

new_x1, new_y1 = 237, 61
new_x2, new_y2 = 338, 291 #ถ้าเดินกันไวมากต้องลด new_x2 เพื่อกันคนซ้อนกันใน Zone of Detection


# counter.runPrepare()
counter.startprogram(new_x1,new_y1,new_x2,new_y2)
