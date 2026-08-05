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
        <div className="nav_label">알림 발송</div>
        <NavLink to="send" className={navItemClass} onClick={onNavigate}>
          발송 관리
        </NavLink>
        <NavLink to="history" className={navItemClass} onClick={onNavigate}>
          발송 이력 조회
        </NavLink>
      </div>
      <div className="nav_group">
        <div className="nav_label">메일</div>
        <NavLink to="mailbox" className={navItemClass} onClick={onNavigate}>
          웹메일함 · 번역결과
        </NavLink>
      </div>
      <div className="nav_group">
        <div className="nav_label">AI 생성</div>
        <NavLink to="images" className={navItemClass} onClick={onNavigate}>
          생성이미지 관리
        </NavLink>
        <NavLink to="diagram" className={navItemClass} onClick={onNavigate}>
          AI 도면 생성/관리
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
        <a className="nav_item" href="/store">
          <span className="ic">🏬</span>매장 · CCTV 관리
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
