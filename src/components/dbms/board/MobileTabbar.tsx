import { NavLink } from 'react-router-dom';

const tabItemClass = ({ isActive }: { isActive: boolean }) => `tab_item${isActive ? ' active' : ''}`;

export default function MobileTabbar() {
  return (
    <nav className="tabbar">
      <NavLink to="notice" className={tabItemClass}>
        <span className="ic">📌</span>공지
      </NavLink>
      <NavLink to="qna" className={tabItemClass}>
        <span className="ic">💬</span>문의
      </NavLink>
      <NavLink to="chatlog" className={tabItemClass}>
        <span className="ic">🤖</span>챗봇
      </NavLink>
      <NavLink to="plans" className={tabItemClass}>
        <span className="ic">💳</span>구독
      </NavLink>
    </nav>
  );
}
