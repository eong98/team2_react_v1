import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { EVENTS, type DashboardEvent, type EventStatus } from './Live.mock';

interface DashboardContextValue {
  mainCam: string;
  setMainCam: (cam: string) => void;
  currentStoreName: string;
  setCurrentStoreName: (name: string) => void;
  alertMode: boolean;
  setAlertMode: (v: boolean) => void;
  events: DashboardEvent[];
  detailEvent: DashboardEvent | null;
  openDetail: (id: number) => void;
  closeDetail: () => void;
  markStatus: (id: number, status: EventStatus) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [mainCam, setMainCam] = useState('CAM 03');
  const [currentStoreName, setCurrentStoreName] = useState('본점 · 스터디카페 A');
  const [alertMode, setAlertMode] = useState(false);
  const [events, setEvents] = useState<DashboardEvent[]>(EVENTS);
  const [detailId, setDetailId] = useState<number | null>(null);

  const detailEvent = useMemo(() => events.find((e) => e.id === detailId) ?? null, [events, detailId]);

  const markStatus = (id: number, status: EventStatus) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  };

  const value: DashboardContextValue = {
    mainCam,
    setMainCam,
    currentStoreName,
    setCurrentStoreName,
    alertMode,
    setAlertMode,
    events,
    detailEvent,
    openDetail: (id) => setDetailId(id),
    closeDetail: () => setDetailId(null),
    markStatus,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard는 DashboardProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
