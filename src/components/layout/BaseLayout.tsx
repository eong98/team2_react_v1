/* --------------- css import --------------- */
import './baseLayout.css'
/* ------------------------------------------- */

import { useState, type ComponentType } from 'react';
import { Outlet } from 'react-router-dom';
import { getCopyright } from '../../utils/Tool';

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

interface TopbarProps {
  onMenuClick: () => void;
}

interface AppShellProps {
  Sidebar: ComponentType<SidebarProps>;
  Topbar: ComponentType<TopbarProps>;
  MobileTabbar?: ComponentType;
  ChatWidget?: ComponentType;
}

/**
 * 사이드바 + 모바일 드로어 + 상단바 + 콘텐츠(Outlet) 뼈대.
 * DbmsLayout, UserLayout 등 각 도메인 Layout에서 자기 Sidebar/Topbar만 넘겨서 재사용한다.
 */
export default function BaseLauout({
  Sidebar,
  Topbar,
  MobileTabbar,
  ChatWidget,
}: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="service">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && <div className="sidebar_backdrop open" onClick={() => setNavOpen(false)} />}

      <main id="container">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <div className="views">
          <Outlet />
        </div>

        <div className='copyright'>{getCopyright()}</div>
      </main>

      {ChatWidget && <ChatWidget />}
    </div>
  );
}
