import { useReveal } from "../../hooks/useReveal";


const ROAD = [
  { stage: '현재', title: '관리자 실시간 알림', text: '이상행동 감지 시 SMS·이메일로 즉시 전송하고, 웹메일함에서 해외 매장 회신까지 번역해 확인합니다.', now: true },
  { stage: '현재', title: '오디오 이상음 감지', text: 'CCTV 영상만으로 놓치는 상황을 오디오 센서(ESP32)로 함께 잡아내 감지 증거로 남깁니다.', now: true },
  { stage: '현재', title: '구독형 운영 관리', text: '매장별 구독 플랜과 결제 내역, 1:1문의·챗봇 상담까지 관리자 화면 하나로 운영합니다.', now: true },
  { stage: '다음 단계', title: '보안업체 자동 연동', text: '위험도가 높은 이벤트는 계약된 보안업체로 자동 전달합니다.', now: false },
  { stage: '향후', title: '경찰·119 신고 연계', text: '폭행·응급 상황을 자동으로 판별해 신고 시스템과 연동을 목표로 합니다.', now: false },
  { stage: '향후', title: '다국어 자동 회신', text: '지금은 번역해서 보여주는 수준이지만, 정형화된 문의는 AI가 현지어로 자동 회신하도록 넓혀갑니다.', now: false },
];

export default function RoadmapSection() {
  const { ref, className } = useReveal<HTMLElement>();
  return (
    <section id="roadmap" className={`border_top ${className}`} ref={ref}>
      <div className="wrap">
        <div className="section_head">
          <span className="eyebrow">지금과 다음</span>
          <h2>관제를 넘어, 대응까지</h2>
          <p>알림 하나로 끝나지 않도록, 이미 갖춘 기능과 단계적으로 넓혀갈 대응 체계입니다.</p>
        </div>
        <div className="road">
          {ROAD.map((r) => (
            <div className={`road_card${r.now ? ' now' : ''}`} key={r.title}>
              <div className="stage mono">{r.stage}</div>
              <h4>{r.title}</h4>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
