import { useReveal } from "../../hooks/useReveal";

const STEPS = [
  { idx: '01', title: 'CCTV 영상 수집', text: '매장별 CCTV 영상을 실시간 스트리밍으로 수집합니다.' },
  { idx: '02', title: 'AI 행동 분석', text: 'AI 모델이 프레임 단위로 이상행동 여부를 판별합니다.' },
  { idx: '03', title: '교차 검증', text: '출입기록·소음·센서 데이터를 함께 대조해 신뢰도를 높입니다.' },
  { idx: '04', title: '실시간 알림', text: 'WebSocket으로 관리자에게 즉시 알림을 전송합니다.' },
  { idx: '05', title: '기록 저장', text: '이벤트 시점의 영상과 스냅샷을 자동으로 저장합니다.' },
];

export default function FlowSection() {
  const { ref, className } = useReveal<HTMLElement>();
  return (
    <section id="flow" className={`border_top ${className}`} ref={ref}>
      <div className="wrap">
        <div className="section_head">
          <span className="eyebrow">작동 방식</span>
          <h2>감지부터 대응까지, 하나의 흐름으로</h2>
          <p>여러 데이터를 함께 분석해 오탐지를 줄이고, 알림은 실시간으로 전달됩니다.</p>
        </div>
        <div className="flow">
          {STEPS.map((s) => (
            <div className="flow_step" key={s.idx}>
              <div className="flow_line" />
              <div className="idx mono">{s.idx}</div>
              <h4>{s.title}</h4>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
