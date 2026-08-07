import { useEffect, useRef } from 'react';
import { useDashboard } from './DashboardContext';
import { confColor, statusBadgeClass } from './Live.mock';

export default function EventDetailPanel() {
  const { detailEvent, closeDetail, markStatus } = useDashboard();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (detailEvent) {
      lastFocused.current = document.activeElement as HTMLElement;
      panelRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeDetail();
      };
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('keydown', onKey);
        lastFocused.current?.focus();
      };
    }
  }, [detailEvent, closeDetail]);

  if (!detailEvent) return null;
  const ev = detailEvent;
  const c = confColor(ev.level);

  return (
    <>
      <div className="overlay_bg open" onClick={closeDetail} />
      <div
        className="detail_panel open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detailPanelTitle"
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="detail_head">
          <h2 id="detailPanelTitle">이벤트 상세</h2>
          <button className="close_btn" onClick={closeDetail} aria-label="이벤트 상세 닫기">
            ✕
          </button>
        </div>
        <div className="detail_body">
          <div className="detail_video">
            <div className="vtag mono">
              {ev.cam} · {ev.date} {ev.time}
            </div>
            <div className="playbtn">▶</div>
            <div className="timeline">
              <div className="fill" />
            </div>
          </div>

          <div className="conf_box">
            <div className="conf_ring" style={{ background: `${c}22`, border: `2px solid ${c}`, color: c }}>
              {ev.confidence}%
            </div>
            <div>
              <div className="clabel">AI 감지 신뢰도</div>
              <div className="ctype">{ev.type}</div>
            </div>
          </div>

          <div className="detail_info_grid">
            <div className="info_cell">
              <div className="k">발생 시각</div>
              <div className="v">{ev.time}</div>
            </div>
            <div className="info_cell">
              <div className="k">카메라</div>
              <div className="v">{ev.cam}</div>
            </div>
            <div className="info_cell">
              <div className="k">처리 상태</div>
              <div className="v">
                <span className={`badge ${statusBadgeClass(ev.status)}`}>{ev.status}</span>
              </div>
            </div>
            <div className="info_cell">
              <div className="k">매장</div>
              <div className="v" style={{ fontSize: 11.5 }}>
                본점 · 스터디카페 A
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 18, lineHeight: 1.6 }}>{ev.desc}</p>

          <div className="sensor_list">
            <h4>연관 센서 데이터</h4>
            {ev.sensor.map(([k, v]) => (
              <div className="sensor_item" key={k}>
                <span className="sk">{k}</span>
                <span className="sv">{v}</span>
              </div>
            ))}
          </div>

          <div className="detail_actions">
            <button className="btn btn_ghost" onClick={() => markStatus(ev.id, '오탐지')}>
              오탐지 처리
            </button>
            <button className="btn btn_primary" onClick={() => markStatus(ev.id, '처리완료')}>
              확인 완료
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
