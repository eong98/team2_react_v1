import { useDashboard } from './DashboardContext';
import LiveMonitor from './LiveMonitor';
import LiveEventList from './LiveEventList';
import { UserPageHeader } from '../common';

export default function LiveView() {
  const { mainCam, setMainCam, alertMode, events, openDetail } = useDashboard();
  const topEvent = events[0];

  return (
    <section className="view active">


      
      <UserPageHeader
        title="실시간 관제"
        description="CCTV 영상을 AI가 실시간으로 분석해 이상행동을 감지합니다."
      />

      {alertMode && (
        <div className="alert_banner">
          <div className="aicon">!</div>
          <div className="atext">
            <div className="t1">
              {topEvent.cam} · 이상행동 감지 — {topEvent.type} 의심 (신뢰도 {topEvent.confidence}%)
            </div>
            <div className="t2">{topEvent.time} · 열람실 A구역 · 확인이 필요합니다</div>
          </div>
          <button className="abtn" onClick={() => openDetail(topEvent.id)}>
            자세히 보기
          </button>
        </div>
      )}

      <div className="live_grid">
        <div>
          <LiveMonitor mainCam={mainCam} setMainCam={setMainCam} alertMode={alertMode} />
        </div>
        <LiveEventList events={events} openDetail={openDetail} />
      </div>
    </section>
  );
}
