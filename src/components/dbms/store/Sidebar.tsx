import { NavLink } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

const navItemClass = ({ isActive }: { isActive: boolean }) => `nav_item${isActive ? ' active' : ''}`;

export default function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">
        <span className="logo_placeholder" aria-hidden="true" />
        allimio
      </div>

      <div className="nav_group">
        <div className="nav_label">매장 관리</div>
        <NavLink to="stores" className={navItemClass} onClick={onNavigate}>
          매장 등록/관리
        </NavLink>
      </div>
      <div className="nav_group">
        <div className="nav_label">CCTV 관리</div>
        <NavLink to="cctv" className={navItemClass} onClick={onNavigate}>
          CCTV 등록/관리
        </NavLink>
        <NavLink to="issues" className={navItemClass} onClick={onNavigate}>
          CCTV 이슈 원장
        </NavLink>
      </div>
      <div className="nav_group">
        <div className="nav_label">센서 기기</div>
        <NavLink to="audio" className={navItemClass} onClick={onNavigate}>
          오디오 센서(ESP32) 관리
        </NavLink>
      </div>
      <div className="nav_group">
        <div className="nav_label">이벤트 설정</div>
        <NavLink to="types" className={navItemClass} onClick={onNavigate}>
          이상행동 유형코드
        </NavLink>
      </div>

      <div className="nav_group">
        <div className="nav_label">다른 관리 화면</div>
        <a className="nav_item" href="/dashboard">
          <span className="ic">📡</span>실시간 관제
        </a>
        <a className="nav_item" href="/member">
          <span className="ic">👤</span>회원
        </a>
        <a className="nav_item" href="/notify">
          <span className="ic">✉</span>알림 · 메일
        </a>
        <a className="nav_item" href="/board">
          <span className="ic">💬</span>게시판 · 챗봇 · 구독
        </a>
      </div>

      <div className="sidebar_foot">
        <a className="nav_item" href="/" style={{ marginBottom: 10 }}>
          <span className="ic">🏠</span>랜딩 페이지로
        </a>
      </div>
    </aside>
  );
}
