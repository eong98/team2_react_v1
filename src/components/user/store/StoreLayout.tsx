import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileTabbar from './MobileTabbar';
import StoresView from './views/StoresView';
import CctvView from './views/CctvView';
import IssuesView from './views/IssuesView';
import AudioView from './views/AudioView';
import TypesView from './views/TypesView';

function Shell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && <div className="sidebar_backdrop open" onClick={() => setNavOpen(false)} />}

      <main className="main">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <div className="views">
          <Outlet />
        </div>
      </main>

      <MobileTabbar />
    </div>
  );
}

export default function StoreLayout() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="stores" replace />} />
        <Route path="stores" element={<StoresView />} />
        <Route path="cctv" element={<CctvView />} />
        <Route path="issues" element={<IssuesView />} />
        <Route path="audio" element={<AudioView />} />
        <Route path="types" element={<TypesView />} />
      </Route>
    </Routes>
  );
}
