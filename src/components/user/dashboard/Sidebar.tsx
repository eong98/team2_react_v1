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
        <div className="nav_label">관제</div>
        <NavLink to="live" className={navItemClass} onClick={onNavigate}>
          <span className="ic">▣</span>실시간 관제
        </NavLink>
        <NavLink to="history" className={navItemClass} onClick={onNavigate}>
          <span className="ic">≣</span>이벤트 이력
        </NavLink>
        <NavLink to="stats" className={navItemClass} onClick={onNavigate}>
          <span className="ic">◧</span>통계 리포트
        </NavLink>
      </div>

      <div className="nav_group">
        <div className="nav_label">관리</div>
        <NavLink to="stores" className={navItemClass} onClick={onNavigate}>
          <span className="ic">◫</span>매장 목록
        </NavLink>
        <NavLink to="settings" className={navItemClass} onClick={onNavigate}>
          <span className="ic">⚙</span>설정
        </NavLink>
      </div>

      <div className="nav_group">
        <div className="nav_label">관리자 도구</div>
        <a className="nav_item" href="/member">
          <span className="ic">👤</span>회원
        </a>
        <a className="nav_item" href="/store">
          <span className="ic">🏬</span>매장 · CCTV 관리
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
        <div className="user_chip">
          <div className="avatar">관</div>
          <div>
            <div className="name">관리자</div>
            <div className="role">본점 · 스터디카페 A</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
