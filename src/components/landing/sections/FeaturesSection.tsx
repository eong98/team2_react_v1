import { useReveal } from "../../hooks/useReveal";

const FEATURES = [
  { icon: '▲', title: '폭행 감지', text: '급격한 신체 접촉과 움직임 패턴을 분석해 폭력 상황을 감지합니다.' },
  { icon: '◆', title: '기물파손 감지', text: '집기 파손, 투척 행동 등 비정상적인 물리적 충격을 인식합니다.' },
  { icon: '●', title: '쓰러짐(응급) 감지', text: '자세 추정 기반으로 낙상·쓰러짐을 판별해 응급 상황을 즉시 알립니다.' },
  { icon: '▣', title: '무단침입 감지', text: '영업 종료 시간대 출입 및 비인가 접근을 실시간으로 포착합니다.' },
  { icon: '◐', title: '장시간 배회 감지', text: '동일 인물의 비정상적인 체류·배회 패턴을 추적해 사전 경고합니다.' },
];

export default function FeaturesSection() {
  const { ref, className } = useReveal<HTMLElement>();
  return (
    <section id="features" className={`border_top ${className}`} ref={ref}>
      <div className="wrap">
        <div className="section_head">
          <span className="eyebrow">핵심 기능</span>
          <h2>5가지 이상행동을 실시간으로 감지합니다</h2>
          <p>영상 속 사람의 움직임과 자세를 분석해 위험 상황을 자동으로 판별합니다.</p>
        </div>
        <div className="feat_grid">
          {FEATURES.map((f) => (
            <div className="feat_card" key={f.title}>
              <div className="feat_icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
