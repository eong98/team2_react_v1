import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileTabbar from './MobileTabbar';
import SendView from './views/SendView';
import HistoryView from './views/HistoryView';
import MailboxView from './views/MailboxView';
import ImagesView from './views/ImagesView';
import DiagramView from './views/DiagramView';

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

export default function NotifyLayout() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="send" replace />} />
        <Route path="send" element={<SendView />} />
        <Route path="history" element={<HistoryView />} />
        <Route path="mailbox" element={<MailboxView />} />
        <Route path="images" element={<ImagesView />} />
        <Route path="diagram" element={<DiagramView />} />
      </Route>
    </Routes>
  );
}
