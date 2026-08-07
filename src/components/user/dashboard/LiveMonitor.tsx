import { useEffect, useState } from 'react';
import { CAMERAS } from './Live.mock';

function formatClock(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
}

interface LiveMonitorProps {
  mainCam: string;
  setMainCam: (cam: string) => void;
  alertMode: boolean;
}

export default function LiveMonitor({ mainCam, setMainCam, alertMode }: LiveMonitorProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card monitor_card">
      <div className="monitor_head">
        <div className="camlabel">
          현재 화면 · <b>{mainCam}</b>
        </div>
        <div className="rec">REC</div>
      </div>
      <div className="monitor_screen">
        <div className="monitor_noise" />
        <div className="brackets">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="mon_tag_tl">본점 · 스터디카페 A</div>
        <div className="mon_tag_tr mono">{formatClock(now)}</div>
        <div className="mon_ai_tag">
          <span className="aidot" />
          <span>{alertMode && mainCam === 'CAM 03' ? 'AI 분석 중 · 이상행동 감지' : 'AI 분석 중 · 정상'}</span>
        </div>
        <div className="bbox" />
      </div>

      <div className="cam_strip">
        {CAMERAS.map((c) => {
          const selected = c === mainCam;
          const alerting = alertMode && c === 'CAM 03';
          return (
            <div
              key={c}
              className={`cam_thumb${selected ? ' selected' : ''}${alerting ? ' alerting' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${c}${selected ? ' (선택됨)' : ''}${alerting ? ' · 이상행동 감지됨' : ''}`}
              onClick={() => setMainCam(c)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setMainCam(c);
                }
              }}
            >
              <div className="noise" />
              <div className="lbl">{c}</div>
              <div className="pulse_dot" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
