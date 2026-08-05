import { NavLink } from 'react-router-dom';

const tabItemClass = ({ isActive }: { isActive: boolean }) => `tab_item${isActive ? ' active' : ''}`;

export default function MobileTabbar() {
  return (
    <nav className="tabbar">
      <NavLink to="login" className={tabItemClass}>
        <span className="ic">🔑</span>로그인
      </NavLink>
      <NavLink to="mypage" className={tabItemClass}>
        <span className="ic">👤</span>내 정보
      </NavLink>
      <NavLink to="voice-list" className={tabItemClass}>
        <span className="ic">💬</span>문의내역
      </NavLink>
    </nav>
  );
}
