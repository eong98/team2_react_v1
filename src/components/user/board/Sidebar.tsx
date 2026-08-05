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
        <div className="nav_label">게시판</div>
        <NavLink to="notice" className={navItemClass} onClick={onNavigate}>
          공지사항
        </NavLink>
        <NavLink to="qna" className={navItemClass} onClick={onNavigate}>
          1:1문의 · FAQ
        </NavLink>
        <NavLink to="attach" className={navItemClass} onClick={onNavigate}>
          첨부파일 관리
        </NavLink>
      </div>
      <div className="nav_group">
        <div className="nav_label">챗봇</div>
        <NavLink to="chatlog" className={navItemClass} onClick={onNavigate}>
          챗봇 대화로그
        </NavLink>
      </div>
      <div className="nav_group">
        <div className="nav_label">구독</div>
        <NavLink to="plans" className={navItemClass} onClick={onNavigate}>
          구독권 안내/결제
        </NavLink>
        <NavLink to="orders" className={navItemClass} onClick={onNavigate}>
          구독·결제 내역
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
        <a className="nav_item" href="/notify">
          <span className="ic">✉</span>알림 · 메일
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
