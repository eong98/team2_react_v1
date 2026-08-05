import { NavLink } from 'react-router-dom';

const tabItemClass = ({ isActive }: { isActive: boolean }) => `tab_item${isActive ? ' active' : ''}`;

export default function MobileTabbar() {
  return (
    <nav className="tabbar">
      <NavLink to="stores" className={tabItemClass}>
        <span className="ic">◫</span>매장
      </NavLink>
      <NavLink to="cctv" className={tabItemClass}>
        <span className="ic">🎥</span>CCTV
      </NavLink>
      <NavLink to="audio" className={tabItemClass}>
        <span className="ic">🎙</span>센서
      </NavLink>
      <NavLink to="types" className={tabItemClass}>
        <span className="ic">🏷</span>유형
      </NavLink>
    </nav>
  );
}
