import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileTabbar from './MobileTabbar';
import LoginView from './views/LoginView';
import SignupView from './views/SignupView';
import FindView from './views/FindView';
import MyPageView from './views/MyPageView';
import HistoryView from './views/HistoryView';
import WithdrawView from './views/WithdrawView';
import VoiceListView from './views/VoiceListView';
import VoiceWriteView from './views/VoiceWriteView';

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

export default function MemberLayout() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<LoginView />} />
        <Route path="signup" element={<SignupView />} />
        <Route path="find" element={<FindView />} />
        <Route path="mypage" element={<MyPageView />} />
        <Route path="history" element={<HistoryView />} />
        <Route path="withdraw" element={<WithdrawView />} />
        <Route path="voice-list" element={<VoiceListView />} />
        <Route path="voice-write" element={<VoiceWriteView />} />
      </Route>
    </Routes>
  );
}
