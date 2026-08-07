import { useLocation } from 'react-router-dom';
import { useClock } from '../hooks/useClock';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { pathname } = useLocation();
  const isLive = pathname.includes('/live');
  const clock = useClock();

  if (isLive) {
    return (
      <header className="topbar">
        <div className="topbar_left">
          <button className="menu_btn" onClick={onMenuClick} aria-label="전체 메뉴 열기">
            ☰
          </button>
          <div className="store_switch" id="storeSwitchBtn">
            <span className="st_dot" />
            <span id="currentStoreName">본점 · 스터디카페 A</span> ▾
          </div>
        </div>
        <div className="topbar_right">
          <span className="live_pill">LIVE</span>
          <span className="clock mono" id="clock">
            {clock}
          </span>
        </div>
      </header>
    );
  }

  return (
    <header className="topbar_mobile">
      <button className="menu_btn" onClick={onMenuClick} aria-label="전체 메뉴 열기">
        ☰
      </button>
      <div className="brand">
        <span className="logo_placeholder" aria-hidden="true" />
        allimio
      </div>
    </header>
  );
}
