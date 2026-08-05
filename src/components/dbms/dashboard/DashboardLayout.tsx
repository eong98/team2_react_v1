import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { DashboardProvider, useDashboard } from './DashboardContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileTabbar from './MobileTabbar';
import EventDetailPanel from './EventDetailPanel';
import LiveView from './views/LiveView';
import HistoryView from './views/HistoryView';
import StatsView from './views/StatsView';
import StoresView from './views/StoresView';
import SettingsView from './views/SettingsView';

function SimToggle() {
  const { alertMode, setAlertMode } = useDashboard();
  return (
    <button className="sim_toggle" onClick={() => setAlertMode(!alertMode)}>
      <span className="dot" />
      <span>{alertMode ? '이상행동 감지 시뮬레이션 중' : '평상시 상태'}</span>
    </button>
  );
}

function Shell() {
  const [navOpen, setNavOpen] = useState(false);
  const { alertMode } = useDashboard();

  // body.alert_mode — contents.css의 알림 배너/브래킷/REC 점멸 등 알림 상태 스타일이 이 클래스에 걸려있음
  useEffect(() => {
    document.body.classList.toggle('alert_mode', alertMode);
    return () => document.body.classList.remove('alert_mode');
  }, [alertMode]);

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
      <SimToggle />
      <EventDetailPanel />
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <DashboardProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="live" replace />} />
          <Route path="live" element={<LiveView />} />
          <Route path="history" element={<HistoryView />} />
          <Route path="stats" element={<StatsView />} />
          <Route path="stores" element={<StoresView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </DashboardProvider>
  );
}
