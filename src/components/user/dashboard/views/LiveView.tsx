import { useEffect, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { CAMERAS } from '../mock';

function formatClock(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
}

export default function LiveView() {
  const { mainCam, setMainCam, alertMode, events, openDetail } = useDashboard();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const recent = events.slice(0, 4);
  const topEvent = events[0];

  return (
    <section className="view active">
      <div className="view_head">
        <h1>실시간 관제</h1>
        <p>CCTV 영상을 AI가 실시간으로 분석해 이상행동을 감지합니다.</p>
      </div>

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
        {/* 메인 모니터 */}
        <div>
          <div className="card monitor_card">
            <div className="monitor_head">
              <div className="camlabel">
                현재 화면 · <b>{mainCam}</b>
              </div>
              <div className="rec">REC</div>
            </div>
            <div className="monitor_screen">
              <div className="monitor_noise" />
              <div className="brackets">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="mon_tag_tl">본점 · 스터디카페 A</div>
              <div className="mon_tag_tr mono">{formatClock(now)}</div>
              <div className="mon_ai_tag">
                <span className="aidot" />
                <span>{alertMode && mainCam === 'CAM 03' ? 'AI 분석 중 · 이상행동 감지' : 'AI 분석 중 · 정상'}</span>
              </div>
              <div className="bbox" />
            </div>

            <div className="cam_strip">
              {CAMERAS.map((c) => {
                const selected = c === mainCam;
                const alerting = alertMode && c === 'CAM 03';
                return (
                  <div
                    key={c}
                    className={`cam_thumb${selected ? ' selected' : ''}${alerting ? ' alerting' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`${c}${selected ? ' (선택됨)' : ''}${alerting ? ' · 이상행동 감지됨' : ''}`}
                    onClick={() => setMainCam(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setMainCam(c);
                      }
                    }}
                  >
                    <div className="noise" />
                    <div className="lbl">{c}</div>
                    <div className="pulse_dot" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 우측 요약 컬럼 */}
        <div className="side_col">
          <div className="stat_mini_grid">
            <div className="card stat_mini">
              <div className="lab">현재 인원</div>
              <div className="val green">3명</div>
            </div>
            <div className="card stat_mini">
              <div className="lab">오늘 이벤트</div>
              <div className="val amber">5건</div>
            </div>
            <div className="card stat_mini">
              <div className="lab">소음 레벨</div>
              <div className="val">32dB</div>
            </div>
            <div className="card stat_mini">
              <div className="lab">출입 상태</div>
              <div className="val green">정상</div>
            </div>
          </div>

          <div className="card recent_card">
            <h3>최근 이벤트</h3>
            <div>
              {recent.map((ev) => (
                <div
                  key={ev.id}
                  className="ev_row"
                  role="button"
                  tabIndex={0}
                  aria-label={`${ev.cam} · ${ev.type} 이벤트 상세보기`}
                  onClick={() => openDetail(ev.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail(ev.id);
                    }
                  }}
                >
                  <div className={`ev_bar ${ev.level}`} />
                  <div className="ev_main">
                    <div className="ev_type">
                      {ev.cam} · {ev.type}
                    </div>
                    <div className="ev_meta">{ev.time}</div>
                  </div>
                  <div className="chev">›</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
