import { useEffect } from 'react';
import { DashboardProvider, useDashboard } from './DashboardContext';
import LiveView from './LiveView';
import EventDetailPanel from './EventDetailPanel';

function SimToggle() {
  const { alertMode, setAlertMode } = useDashboard();
  return (
    <button className="sim_toggle" onClick={() => setAlertMode(!alertMode)}>
      <span className="dot" />
      <span>{alertMode ? '이상행동 감지 시뮬레이션 중' : '평상시 상태'}</span>
    </button>
  );
}

function LiveInner() {
  const { alertMode } = useDashboard();

  // body.alert_mode — contents.css의 알림 배너/브래킷/REC 점멸 등 알림 상태 스타일이 이 클래스에 걸려있음
  useEffect(() => {
    document.body.classList.toggle('alert_mode', alertMode);
    return () => document.body.classList.remove('alert_mode');
  }, [alertMode]);

  return (
    <>
      <LiveView />
      <SimToggle />
      <EventDetailPanel />
    </>
  );
}

/** /user/live 라우트에 실제로 걸리는 컴포넌트. LiveView가 useDashboard()를 쓰므로 Provider로 감싸준다. */
export default function Live() {
  return (
    <DashboardProvider>
      <LiveInner />
    </DashboardProvider>
  );
}
