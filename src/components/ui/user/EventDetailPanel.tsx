import { useEffect, useRef, useState } from 'react';
import { confColor, statusBadgeClass, type DashboardEvent, type EventStatus } from '../../../pages/user/dashboard/Live.mock';


interface EventDetailPanelProps {
  detailEvent: DashboardEvent | null;
  onClose: () => void;
  onMarkStatus: (id: number, status: EventStatus) => void;
}

function focusableEls(el: HTMLElement) {
  return Array.from(
    el.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  );
}


export default function EventDetailPanel({ detailEvent, onClose, onMarkStatus }: EventDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // 패널을 계속 DOM에 남겨둬야 닫힐 때 슬라이드 트랜지션이 재생된다.
  // detailEvent가 null이 되는 순간(닫힘) 내용까지 같이 비면 슬라이드 도중 텅 비어 보이므로,
  // 마지막으로 열렸던 이벤트를 따로 기억해뒀다가 트랜지션 동안에는 그걸로 렌더링한다.
  const [renderEvent, setRenderEvent] = useState<DashboardEvent | null>(null);
  const open = detailEvent !== null;

  useEffect(() => {
    if (detailEvent) setRenderEvent(detailEvent);
  }, [detailEvent]);

  // Modal.tsx와 동일한 포커스트랩: 열리면 첫 포커스 가능 요소로 이동, Tab으로 첫/끝 순환, 닫히면 원래 포커스 복귀
  useEffect(() => {
    if (!detailEvent) return;
    lastFocused.current = document.activeElement as HTMLElement;
    const panel = panelRef.current;
    if (panel) {
      const targets = focusableEls(panel);
      (targets[0] || panel).focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const targets = focusableEls(panel);
      if (targets.length === 0) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      lastFocused.current?.focus();
    };
  }, [detailEvent, onClose]);

  if (!renderEvent) return null;
  const ev = renderEvent;
  const c = confColor(ev.level);

  return (
    <>
      <div className={`overlay_bg${open ? ' open' : ''}`} onClick={onClose} />
      <div
        className={`detail_panel${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detailPanelTitle"
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="detail_head">
          <h2 id="detailPanelTitle">이벤트 상세</h2>
          <button className="close_btn" onClick={onClose} aria-label="이벤트 상세 닫기">
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
            <button className="btn btn_ghost" onClick={() => onMarkStatus(ev.id, '오탐지')}>
              오탐지 처리
            </button>
            <button className="btn btn_primary" onClick={() => onMarkStatus(ev.id, '처리완료')}>
              확인 완료
            </button>
          </div>
        </div>
      </div>
    </>
  );
}