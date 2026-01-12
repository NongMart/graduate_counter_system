const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { pool } = require('./db.js');

const app = express();
const PORT = 5000; // frontend จะเรียกที่ http://localhost:5000

// app.use(cors({
//   origin: ['http://localhost:5173', 'http://localhost:3000'], // ปรับตาม port frontend
// }));

// app.use(cors());

app.use(cors({ origin: true }));

app.use(express.json());

// --------- STATE หลักของระบบ ---------
let state = {
  totalGraduates: 0,          // จำนวนบัณฑิตทั้งหมด
  durationMinutes: 0,         // เวลารวม (นาที)
  isRunning: false,           // สถานะ start/stop
  startTime: null,            // timestamp ตอนเริ่ม run รอบล่าสุด (ms)
  accumulatedElapsedSeconds: 0, // เวลาที่สะสมไปแล้วตอนกดหยุด (sec)
  pythonCount: 0,             // จำนวนที่ส่งมาจากฝั่ง Python (absolute count)
  manualDelta: 0,              // การปรับเพิ่มลดด้วยปุ่ม + / -
  cameraOn: false,
  counting: false,
  videoSource: "camera", // "camera" | "video"
};

let pythonProcess = null;

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

app.get('/api/python/command', (req, res) => {
  res.json({
    cameraOn: state.cameraOn,
    counting: state.counting,
    manualDelta: state.manualDelta,   // ⭐ สำคัญ
    totalCount: Math.max(
      0,
      state.pythonCount + state.manualDelta
    )
  });
});


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

app.post('/api/control/camera-on', (req, res) => {
  // ❌ ห้าม reset state ตรงนี้เด็ดขาด
  state.cameraOn = true;

  if (!pythonProcess) {
    pythonProcess = spawn('python', ['../AI/controller.py'], {
      stdio: 'inherit',
    });

    pythonProcess.on('exit', () => {
      pythonProcess = null;
      state.cameraOn = false;
      state.counting = false;
      state.isRunning = false;
    });
  }

  res.json({ success: true, status: buildStatus() });
});


// start counting
app.post('/api/control/start', (req, res) => {
  if (!state.cameraOn) {
    return res.status(400).json({ error: 'Camera not opened' });
  }

  if (!state.isRunning) {
    state.isRunning = true;
    state.startTime = Date.now();
  }

  state.counting = true;
  res.json({ success: true, status: buildStatus() });
});



// stop counting
app.post('/api/control/stop', (req, res) => {
  if (state.isRunning && state.startTime) {
    state.accumulatedElapsedSeconds +=
      (Date.now() - state.startTime) / 1000;
  }

  state.isRunning = false;
  state.startTime = null;

  // หยุดนับ แต่ไม่ปิดกล้อง
  state.counting = false;

  res.json({ success: true, status: buildStatus() });
});



// clear / reset ทุกอย่าง
app.post('/api/control/clear', async (req, res) => {
  const snapshot = buildStatus();

  const {
    totalGraduates,
    durationMinutes,
    elapsedSeconds,
    remainingCount,
    avgPerMinute,
    totalCount
  } = snapshot;

  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - (elapsedSeconds || 0) * 1000);

  // บันทึกลงฐานข้อมูล
  try {
    if (totalGraduates > 0 || totalCount > 0) {
      await pool.query(
        `
        INSERT INTO count_sessions (
          started_at,
          ended_at,
          total_graduates,
          duration_minutes,
          final_count,
          remaining_count,
          elapsed_seconds,
          avg_per_minute
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          startedAt,
          endedAt,
          totalGraduates || 0,
          durationMinutes || 0,
          totalCount || 0,
          remainingCount || 0,
          elapsedSeconds || 0,
          avgPerMinute || 0
        ]
      );
    }
  } catch (err) {
    console.error('Error saving session:', err);
  }

  // Reset state
  state = {
    totalGraduates: 0,
    durationMinutes: 0,
    isRunning: false,
    startTime: null,
    accumulatedElapsedSeconds: 0,
    pythonCount: 0,
    manualDelta: 0,
  };

  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }

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
  res.json({
    ...buildStatus(),
    cameraOn: state.cameraOn ?? false,
    counting: state.counting ?? false,
  });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
