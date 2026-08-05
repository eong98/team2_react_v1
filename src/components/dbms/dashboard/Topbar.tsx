import { useEffect, useState } from 'react';
import { useDashboard } from './DashboardContext';

function formatClock(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
}

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { currentStoreName } = useDashboard();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar_left">
        <button className="menu_btn" onClick={onMenuClick} aria-label="전체 메뉴 열기">
          ☰
        </button>
        <div className="store_switch" id="storeSwitchBtn">
          <span className="st_dot" />
          <span>{currentStoreName}</span> ▾
        </div>
      </div>
      <div className="topbar_right">
        <span className="live_pill">LIVE</span>
        <span className="clock mono">{formatClock(now)}</span>
      </div>
    </header>
  );
}
