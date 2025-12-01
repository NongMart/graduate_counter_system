const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000; // frontend จะเรียกที่ http://localhost:5000

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // ปรับตาม port frontend
}));
app.use(express.json());

// --------- STATE หลักของระบบ ---------
let state = {
  totalGraduates: 0,          // จำนวนบัณฑิตทั้งหมด
  durationMinutes: 0,         // เวลารวม (นาที)
  isRunning: false,           // สถานะ start/stop
  startTime: null,            // timestamp ตอนเริ่ม run รอบล่าสุด (ms)
  accumulatedElapsedSeconds: 0, // เวลาที่สะสมไปแล้วตอนกดหยุด (sec)
  pythonCount: 0,             // จำนวนที่ส่งมาจากฝั่ง Python (absolute count)
  manualDelta: 0              // การปรับเพิ่มลดด้วยปุ่ม + / -
};

// ฟังก์ชันคำนวณเวลาที่ผ่านไปทั้งหมด (sec)
function getElapsedSeconds() {
  let elapsed = state.accumulatedElapsedSeconds;
  if (state.isRunning && state.startTime) {
    const now = Date.now();
    elapsed += (now - state.startTime) / 1000;
  }
  return Math.max(0, Math.floor(elapsed));
}

// ฟังก์ชันสร้าง status สำหรับส่งให้ frontend
function buildStatus() {
  const elapsedSeconds = getElapsedSeconds();
  const totalDurationSeconds = (state.durationMinutes || 0) * 60;
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

  const totalCount = Math.max(0, state.pythonCount + state.manualDelta);
  const elapsedMinutes = elapsedSeconds / 60;
  const avgPerMinute = elapsedMinutes > 0 ? totalCount / elapsedMinutes : 0;

  const remainingCount = Math.max(0, (state.totalGraduates || 0) - totalCount);

  return {
    totalGraduates: state.totalGraduates,
    durationMinutes: state.durationMinutes,
    isRunning: state.isRunning,
    elapsedSeconds,
    remainingSeconds,
    pythonCount: state.pythonCount,
    manualDelta: state.manualDelta,
    totalCount,
    remainingCount,
    avgPerMinute
  };
}

// --------- ROUTES ---------

// set config: จำนวนบัณฑิต + เวลาที่ใช้ (นาที)
app.post('/api/config', (req, res) => {
  const { totalGraduates, durationMinutes } = req.body;

  state.totalGraduates = Number(totalGraduates) || 0;
  state.durationMinutes = Number(durationMinutes) || 0;

  // reset ค่าอื่นเมื่อ config ใหม่
  state.isRunning = false;
  state.startTime = null;
  state.accumulatedElapsedSeconds = 0;
  state.pythonCount = 0;
  state.manualDelta = 0;

  res.json({ success: true, status: buildStatus() });
});

// start counting
app.post('/api/control/start', (req, res) => {
  if (!state.isRunning) {
    state.isRunning = true;
    state.startTime = Date.now();
  }
  res.json({ success: true, status: buildStatus() });
});

// stop counting
app.post('/api/control/stop', (req, res) => {
  if (state.isRunning && state.startTime) {
    const now = Date.now();
    state.accumulatedElapsedSeconds += (now - state.startTime) / 1000;
    state.startTime = null;
    state.isRunning = false;
  }
  res.json({ success: true, status: buildStatus() });
});

// clear / reset ทุกอย่าง
app.post('/api/control/clear', (req, res) => {
  state = {
    totalGraduates: 0,
    durationMinutes: 0,
    isRunning: false,
    startTime: null,
    accumulatedElapsedSeconds: 0,
    pythonCount: 0,
    manualDelta: 0
  };
  res.json({ success: true, status: buildStatus() });
});

// ปรับ manual + / -
app.post('/api/control/adjust', (req, res) => {
  const { delta } = req.body;
  const d = Number(delta) || 0;
  state.manualDelta += d;
  res.json({ success: true, status: buildStatus() });
});

// Python ส่งค่า count (absolute) เข้ามา real-time
app.post('/api/python/update-count', (req, res) => {
  const { count } = req.body;

  // ***************************************
  // *** ตรงนี้คือจุดรับค่าจากฝั่ง Python ***
  //
  // - ฝั่ง Python ควรส่ง JSON แบบ:
  //   { "count": <จำนวนที่นับได้ทั้งหมดจนถึงตอนนี้> }
  //
  // - ถ้าใน Python ใช้ชื่อ key อย่างอื่น (เช่น "total" หรือ "people")
  //   ให้เปลี่ยนชื่อ 'count' ตรงนี้ให้ตรงกับฝั่ง Python
  //   เช่น:
  //   const { total } = req.body;
  //   state.pythonCount = Number(total) || 0;
  //
  // ***************************************

  if (typeof count === 'number' && count >= 0) {
    state.pythonCount = count;
  }

  res.json({ success: true, status: buildStatus() });
});

// frontend จะเรียกเพื่อดึง status ทุก ๆ 1 วินาที
app.get('/api/status', (req, res) => {
  res.json(buildStatus());
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
