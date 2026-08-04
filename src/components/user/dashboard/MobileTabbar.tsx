import { NavLink } from 'react-router-dom';

const tabItemClass = ({ isActive }: { isActive: boolean }) => `tab_item${isActive ? ' active' : ''}`;

export default function MobileTabbar() {
  return (
    <nav className="tabbar">
      <NavLink to="live" className={tabItemClass}>
        <span className="ic">▣</span>관제
      </NavLink>
      <NavLink to="history" className={tabItemClass}>
        <span className="ic">≣</span>이력
      </NavLink>
      <NavLink to="stats" className={tabItemClass}>
        <span className="ic">◧</span>통계
      </NavLink>
      <NavLink to="stores" className={tabItemClass}>
        <span className="ic">◫</span>매장
      </NavLink>
      <NavLink to="settings" className={tabItemClass}>
        <span className="ic">⚙</span>설정
      </NavLink>
    </nav>
  );
}
