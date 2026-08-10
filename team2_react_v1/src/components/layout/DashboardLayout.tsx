import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import EventDetailPanel from '../ui/user/EventDetailPanel';
import { EVENTS, type DashboardEvent, type EventStatus } from '../../pages/user/dashboard/Live.mock';

/** Test1~5 등 하위 라우트에서 useOutletContext<LiveOutletContext>()로 받아쓰는 공유 상태 */
export interface LiveOutletContext {
  mainCam: string;
  setMainCam: (cam: string) => void;
  alertMode: boolean;
  setAlertMode: (v: boolean) => void;
  events: DashboardEvent[];
  detailId: number | null;
  setDetailId: (id: number | null) => void;
  markStatus: (id: number, status: EventStatus) => void;
}

/* =========================================================================
   /user/dashboard/* 레이아웃.
   사이드바 메뉴(test1~5 등)가 전부 이 레이아웃 하위 라우트로 들어오고,
   시뮬레이션 토글 / 이벤트 상세 패널은 여기서 한 번만 렌더링합니다.
   각 하위 페이지(Test1.tsx 등)는 <Outlet/>으로 전달되는 context를 받아서
   같은 alertMode/events/detailId 상태를 공유합니다.
========================================================================= */
export default function DashboardLayout() {
  const [mainCam, setMainCam] = useState('CAM 03');
  const [alertMode, setAlertMode] = useState(false);
  const [events, setEvents] = useState<DashboardEvent[]>(EVENTS);
  const [detailId, setDetailId] = useState<number | null>(null);

  const detailEvent = useMemo(() => events.find((e) => e.id === detailId) ?? null, [events, detailId]);

  // body.alert_mode — contents.css의 알림 배너/브래킷/REC 점멸 등 알림 상태 스타일이 이 클래스에 걸려있음
  useEffect(() => {
    document.body.classList.toggle('alert_mode', alertMode);
    return () => document.body.classList.remove('alert_mode');
  }, [alertMode]);

  const markStatus = (id: number, status: EventStatus) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  };

  const outletContext: LiveOutletContext = {
    mainCam,
    setMainCam,
    alertMode,
    setAlertMode,
    events,
    detailId,
    setDetailId,
    markStatus,
  };

  return (
    <>
      <Outlet context={outletContext} />

      {/* ---- 시뮬레이션 토글 ---- */}
      <button className="sim_toggle" onClick={() => setAlertMode(!alertMode)}>
        <span className="dot" />
        <span>{alertMode ? '이상행동 감지 시뮬레이션 중' : '평상시 상태'}</span>
      </button>

      {/* ---- 이벤트 상세 오버레이 ---- */}
      <EventDetailPanel detailEvent={detailEvent} onClose={() => setDetailId(null)} onMarkStatus={markStatus} />
    </>
  );
}