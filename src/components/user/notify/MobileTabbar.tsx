import { NavLink } from 'react-router-dom';

const tabItemClass = ({ isActive }: { isActive: boolean }) => `tab_item${isActive ? ' active' : ''}`;

export default function MobileTabbar() {
  return (
    <nav className="tabbar">
      <NavLink to="send" className={tabItemClass}>
        <span className="ic">📤</span>발송
      </NavLink>
      <NavLink to="mailbox" className={tabItemClass}>
        <span className="ic">✉</span>메일함
      </NavLink>
      <NavLink to="images" className={tabItemClass}>
        <span className="ic">🖼</span>생성이미지
      </NavLink>
      <NavLink to="diagram" className={tabItemClass}>
        <span className="ic">📐</span>AI도면
      </NavLink>
    </nav>
  );
}
