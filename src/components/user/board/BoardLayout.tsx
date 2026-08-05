import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileTabbar from './MobileTabbar';
import ChatWidget from './ChatWidget';
import NoticeView from './views/NoticeView';
import QnaView from './views/QnaView';
import AttachView from './views/AttachView';
import ChatlogView from './views/ChatlogView';
import PlansView from './views/PlansView';
import OrdersView from './views/OrdersView';

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
        <Route path="qna" element={<QnaView />} />
        <Route path="attach" element={<AttachView />} />
        <Route path="chatlog" element={<ChatlogView />} />
        <Route path="plans" element={<PlansView />} />
        <Route path="orders" element={<OrdersView />} />
      </Route>
    </Routes>
  );
}
