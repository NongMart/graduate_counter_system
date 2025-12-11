import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000';

function App() {
  // input สำหรับตั้งค่า
  const [totalGraduatesInput, setTotalGraduatesInput] = useState('');
  const [durationHoursInput, setDurationHoursInput] = useState('3'); // default 3 ชั่วโมง

  // state จาก backend
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);
  const [error, setError] = useState('');

  // ดึง status ทุก 1 วินาที (real time feel)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoadingStatus(true);
        const res = await fetch(`${API_BASE}/api/status`);
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        setError('ไม่สามารถเชื่อมต่อกับ backend ได้');
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchStatus(); // ดึงครั้งแรก

    const id = setInterval(fetchStatus, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSaveConfig = async () => {
    setError('');
    setConfigSaving(true);
    try {
      const totalGraduates = Number(totalGraduatesInput) || 0;
      const durationHours = Number(durationHoursInput) || 0;
      const durationMinutes = durationHours * 60;

      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalGraduates, durationMinutes })
      });

      const data = await res.json();
      setStatus(data.status);
    } catch (err) {
      setError('บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setConfigSaving(false);
    }
  };

  const callControl = async (path, body = {}) => {
    setError('');
    setControlLoading(true);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setStatus(data.status);
    } catch (err) {
      setError('ไม่สามารถสั่งการ backend ได้');
    } finally {
      setControlLoading(false);
    }
  };

  const handleStart = () => callControl('/api/control/start');
  const handleStop = () => callControl('/api/control/stop');
  const handleClear = () => callControl('/api/control/clear');
  const handleAdjust = (delta) => callControl('/api/control/adjust', { delta });

  const formatTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  };

  const renderStatus = () => {
    if (!status) {
      return (
        <div className="status-empty">
          <p>ยังไม่มีข้อมูลสถานะจากระบบ</p>
        </div>
      );
    }

    const {
      totalGraduates,
      durationMinutes,
      isRunning,
      elapsedSeconds,
      remainingSeconds,
      totalCount,
      remainingCount,
      avgPerMinute
    } = status;

    const durationHours = (durationMinutes || 0) / 60;
    const total = totalGraduates || 0;
    const done = totalCount ?? 0;
    const left = remainingCount ?? 0;
    const percentDone = total > 0 ? (done / total) * 100 : 0;
    const percentLeft = total > 0 ? (left / total) * 100 : 0;

    return (
      <div className="status-layout">
        {/* แถวบน: จำนวนที่รับไปแล้ว / Running / จำนวนที่เหลือ */}
        <div className="counts-row">
          <div className="count-block count-done">
            <div className="count-title">จำนวนที่รับไปแล้ว (คน)</div>
            <div className="count-number">{done}</div>
            <div className="count-subrow">
              <span className="count-percent">
                {percentDone.toFixed(2)}% ของทั้งหมด {total} คน
              </span>
            </div>
            <div className="adjust-buttons">
              <button
                className="btn small-btn"
                onClick={() => handleAdjust(-1)}
                disabled={controlLoading}
              >
                - 1
              </button>
              <button
                className="btn small-btn"
                onClick={() => handleAdjust(1)}
                disabled={controlLoading}
              >
                + 1
              </button>
            </div>
            <div className="hint">
              ปรับค่าด้วยปุ่ม + / - หากระบบ AI นับผิดพลาด
            </div>
          </div>

          <div className="status-center">
            <div className="status-center-label">สถานะระบบ</div>
            <div className="status-center-pill-row">
              <span
                className={
                  'status-pill ' +
                  (isRunning ? 'status-pill-running' : 'status-pill-stopped')
                }
              >
                {isRunning ? 'Running…' : 'Stopped'}
              </span>
            </div>
            <div className="status-center-sub">
              เวลาทั้งหมดที่กำหนด: {durationHours || 0} ชั่วโมง
            </div>
          </div>

          <div className="count-block count-left">
            <div className="count-title">จำนวนที่เหลือ (คน)</div>
            <div className="count-number count-number-left">{left}</div>
            <div className="count-subrow">
              <span className="count-percent">
                {percentLeft.toFixed(2)}% ที่ยังไม่ได้รับ
              </span>
            </div>
          </div>
        </div>

        {/* แถวเวลา */}
        <div className="time-row">
          <div className="time-card">
            <div className="time-label">ใช้เวลาไปแล้ว</div>
            <div className="time-value">{formatTime(elapsedSeconds)}</div>
          </div>
          <div className="time-card time-card-right">
            <div className="time-label">เหลือเวลาอีก</div>
            <div className="time-value">{formatTime(remainingSeconds)}</div>
          </div>
        </div>

        {/* ค่าเฉลี่ย */}
        <div className="average-row">
          <div className="avg-card">
            <div className="avg-label">เฉลี่ยจำนวนรับ</div>
            <div className="avg-value">
              {avgPerMinute.toFixed(2)} <span className="unit">คน/นาที</span>
            </div>
            <div className="avg-sub">
              จากทั้งหมด {totalGraduates || 0} คน
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="app-root">
      <div className="app-container">
        <header className="app-header">
          <img src="public/Logo.png" alt="" style={{height: "200px"}}/>
          <h1 className="system-title">
            ระบบนับจำนวนบัณฑิต ที่เข้ารับพระราชทานปริญญาบัตร
          </h1>
          <p className="system-subtitle">
            โดยสำนักส่งเสริมวิชาการและงานทะเบียน
            มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา
          </p>
        </header>

        <main className="main-content">
          {/* Config Section */}
          <section className="card config-card">
            <h2 className="section-title">การตั้งค่าเริ่มต้น</h2>
            <div className="config-grid">
              <div className="form-group">
                <label htmlFor="totalGraduates" className="form-label">
                  จำนวนบัณฑิตทั้งหมด (คน)
                </label>
                <input
                  id="totalGraduates"
                  type="number"
                  min="0"
                  className="form-input"
                  value={totalGraduatesInput}
                  onChange={(e) => setTotalGraduatesInput(e.target.value)}
                  placeholder="เช่น 1200"
                />
              </div>

              <div className="form-group">
                <label htmlFor="durationHours" className="form-label">
                  เวลาที่ใช้ในการรับ (ชั่วโมง)
                </label>
                <input
                  id="durationHours"
                  type="number"
                  min="0"
                  className="form-input"
                  value={durationHoursInput}
                  onChange={(e) => setDurationHoursInput(e.target.value)}
                  placeholder="เช่น 3"
                />
              </div>

              <div className="form-group full-width">
                <button
                  className="btn primary-btn"
                  onClick={handleSaveConfig}
                  disabled={configSaving}
                >
                  {configSaving ? 'กำลังบันทึก...' : 'ยืนยันการตั้งค่า'}
                </button>
                <div className="hint">
                  เมื่อตั้งค่าใหม่ ระบบจะรีเซ็ตตัวนับและเวลาให้เริ่มใหม่
                </div>
              </div>
            </div>
          </section>

          {/* Control Section */}
          <section className="card control-card">
            <h2 className="section-title">การควบคุมการทำงาน</h2>
            <div className="control-row">
              <button
                className="btn success-btn"
                onClick={handleStart}
                disabled={controlLoading}
              >
                เริ่มนับ (Start)
              </button>
              <button
                className="btn warn-btn"
                onClick={handleStop}
                disabled={controlLoading}
              >
                หยุดชั่วคราว (Stop)
              </button>
              <button
                className="btn danger-btn"
                onClick={handleClear}
                disabled={controlLoading}
              >
                Clear / Reset
              </button>
            </div>
            <div className="hint">
              * ปุ่ม Start/Stop ควบคุมเฉพาะเวลาและสถานะการนับ
              (ค่าจำนวนคนจะมาจากฝั่ง Python + Manual)
            </div>
          </section>

          {/* Status Section */}
          <section className="card status-section">
            <h2 className="section-title">สถานะการนับแบบ Real-time</h2>
            {error && <div className="error-banner">{error}</div>}
            {loadingStatus && !status && <p>กำลังโหลดสถานะระบบ...</p>}
            {renderStatus()}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
