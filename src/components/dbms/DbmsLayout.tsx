import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
// import MobileTabbar from './MobileTabbar';
import ChatWidget from './ChatWidget';
import NoticeView from './board/NoticeList';
import NoticeFormView from './board/NoticeForm';

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

      {/* <MobileTabbar /> */}
      <ChatWidget />
    </div>
  );
}

export default function BoardLayout() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="notice" replace />} />
        <Route path="notice" element={<NoticeView />} />
        <Route path="notice/new" element={<NoticeFormView />} />
        <Route path="notice/:no/edit" element={<NoticeFormView />} />
      </Route>
    </Routes>
  );
}
