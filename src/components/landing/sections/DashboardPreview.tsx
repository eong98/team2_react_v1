import { useReveal } from "../../hooks/useReveal";

const STORES = ['본점 · 스터디카페 A', '2호점 · 무인카페 B', '3호점 · 스터디카페 C', '4호점 · 무인카페 D'];
const CAMS = ['CAM 01', 'CAM 02', 'CAM 03', 'CAM 04', 'CAM 05', 'CAM 06'];
const LOGS = [
  { level: 'danger', t: '14:32:07', d: 'CAM 02 · 이상행동 감지' },
  { level: 'warn', t: '13:58:41', d: 'CAM 04 · 장시간 배회' },
  { level: 'ok', t: '13:20:02', d: 'CAM 01 · 정상 출입' },
  { level: 'ok', t: '12:47:19', d: 'CAM 03 · 정상 출입' },
];

export default function DashboardPreview() {
  const { ref, className } = useReveal<HTMLElement>();
  return (
    <section id="dashboard" className={`border_top ${className}`} ref={ref}>
      <div className="wrap">
        <div className="section_head">
          <span className="eyebrow">관리자 대시보드</span>
          <h2>매장 상태를 한 화면에서 확인하세요</h2>
          <p>여러 매장의 CCTV, 이벤트 이력, 통계를 하나의 화면에서 관리합니다.</p>
        </div>
        <div className="dash">
          <div className="dash_top">
            <span />
            <span />
            <span />
          </div>
          <div className="dash_body">
            <div className="dash_side">
              {STORES.map((s, i) => (
                <div className={`store${i === 0 ? ' active' : ''}`} key={s}>
                  {s}
                </div>
              ))}
            </div>
            <div className="dash_main">
              <div className="cams">
                {CAMS.map((c, i) => (
                  <div className={`cam${i === 1 ? ' alert' : ''}`} key={c}>
                    <span className="cam_tag">{c}</span>
                    <div className="cam_noise" />
                    {i === 1 && <div className="bbox" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="dash_log">
              <h5>이벤트 로그</h5>
              {LOGS.map((l) => (
                <div className={`log_item ${l.level}`} key={l.t}>
                  <div className="bar" />
                  <div>
                    <div className="t">{l.t}</div>
                    <div className="d">{l.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
