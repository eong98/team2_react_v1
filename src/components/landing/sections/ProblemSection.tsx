import { useReveal } from "../../hooks/useReveal";

const PROBLEMS = [
  { tag: '심야 시간대', text: '새벽 시간, 매장에는 CCTV만 돌아가고 이상 상황이 생겨도 발견까지 시간이 걸립니다.', sub: '관리 공백 시간대' },
  { tag: '응급 상황', text: '손님이 쓰러지는 등 응급 상황이 발생해도, 다음 방문객이 올 때까지 아무도 알아채지 못합니다.', sub: '골든타임 지연' },
  { tag: '사후 확인', text: '기물파손이나 무단침입은 대부분 다음날 정산이나 순찰 때가 되어서야 뒤늦게 발견됩니다.', sub: '사후 대응의 한계' },
];

export default function ProblemSection() {
  const { ref, className } = useReveal<HTMLElement>();
  return (
    <section className={`border_top ${className}`} ref={ref}>
      <div className="wrap">
        <div className="section_head">
          <span className="eyebrow">문제 상황</span>
          <h2>이런 순간, 아무도 보고 있지 않습니다</h2>
          <p>CCTV는 항상 돌아가지만, 그 화면을 실시간으로 지켜보는 사람은 없습니다.</p>
        </div>
        <div className="problem_grid">
          {PROBLEMS.map((p) => (
            <div className="problem_card" key={p.tag}>
              <span className="tag">{p.tag}</span>
              <p>{p.text}</p>
              <div className="sub">{p.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
