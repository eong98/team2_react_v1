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
        <div className="nav_label">계정</div>
        <NavLink to="login" className={navItemClass} onClick={onNavigate}>
          로그인
        </NavLink>
        <NavLink to="signup" className={navItemClass} onClick={onNavigate}>
          회원가입
        </NavLink>
        <NavLink to="find" className={navItemClass} onClick={onNavigate}>
          아이디/비밀번호 찾기
        </NavLink>
      </div>

      <div className="nav_group">
        <div className="nav_label">마이페이지</div>
        <NavLink to="mypage" className={navItemClass} onClick={onNavigate}>
          내 정보 수정
        </NavLink>
        <NavLink to="history" className={navItemClass} onClick={onNavigate}>
          로그인 이력
        </NavLink>
        <NavLink to="withdraw" className={navItemClass} onClick={onNavigate}>
          회원 탈퇴
        </NavLink>
      </div>

      <div className="nav_group">
        <div className="nav_label">고객의 소리</div>
        <NavLink to="voice-list" className={navItemClass} onClick={onNavigate}>
          문의 내역
        </NavLink>
        <NavLink to="voice-write" className={navItemClass} onClick={onNavigate}>
          문의 작성
        </NavLink>
      </div>

      <div className="nav_group">
        <div className="nav_label">다른 관리 화면</div>
        <a className="nav_item" href="/dashboard">
          <span className="ic">📡</span>실시간 관제
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
      </div>
    </aside>
  );
}
