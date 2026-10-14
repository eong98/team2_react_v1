/* --------------- css import --------------- */
import './home.css'
/* ------------------------------------------- */
import { Link } from 'react-router-dom';
import { useClock } from '../../hooks/useClock';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GlobalStoreSession } from '../../store/LoginStore';
import { axiosInstance } from '../../utils/Tool';
import HomeShowcase from './HomeShowcase';
import HeroCams from './HeroCams';

// 통계 출처: 경찰청 집계(무인점포 절도 신고), 유통업계 추산(무인점포 수)
const PROBLEMS = [
  { tag: '절도 3배 증가', num: '3,514 → 11,015건', text: '무인점포 절도 신고가 4년 사이 3배 넘게 늘었습니다.', sub: '2021 → 2025년 · 경찰청 집계' },
  { tag: '보는 사람 없음', num: '새벽 3시', text: '손님이 쓰러져도, 누가 결제기를 부숴도 그 시간엔 아무도 모릅니다.', sub: '24시간 열려 있는 무인 매장' },
  { tag: '늦은 발견', num: '다음 날 아침', text: '정산하다 이상한 걸 발견하고, 그제야 CCTV를 몇 시간씩 돌려 봅니다.', sub: '피해는 이미 끝난 뒤' },
];

// 서비스에 등록된 이상행동 유형 6종
const FEATURES = [
  { icon: 'door', title: '무단침입', text: '영업이 끝난 시간의 출입과 허락되지 않은 출입을 잡아냅니다.' },
  { icon: 'alert', title: '폭행', text: '두 사람 사이의 밀착과 격한 움직임이 반복되면 감지합니다.' },
  { icon: 'break', title: '기물파손', text: '결제기나 집기를 부수는 듯한 행동을 알아챕니다.' },
  { icon: 'fall', title: '쓰러짐 / 응급', text: '낮은 자세가 이어지면 응급 상황으로 보고 바로 알립니다.' },
  { icon: 'clock', title: '장시간 체류', text: '같은 사람이 오래 머무르면 체류 시간과 함께 알립니다.' },
  { icon: 'fire', title: '화재', text: '불꽃으로 의심되는 영역의 깜빡임을 감지합니다.' },
];

const ICONS: Record<string, ReactNode> = {
  door: <><path d="M6 21V4h10v17" /><path d="M4 21h16" /><path d="M13 12.5v.2" /></>,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4.5M12 17.3v.2" /></>,
  break: <><rect x="4" y="5" width="16" height="12" rx="2" /><path d="M11 5l-2 4 4 2-2 6" /><path d="M9 21h6" /></>,
  fall: <><circle cx="6" cy="9" r="2" /><path d="M8 11l5 2 6-1" /><path d="M13 13l-2 5" /><path d="M3 20h18" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  fire: <><path d="M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" /></>,
};

const STEPS = [
  { idx: '01', title: '영상 확인', text: '지금 쓰는 CCTV에 작은 분석 장치를 달아, 매장 안에서 바로 영상을 살펴봅니다.' },
  { idx: '02', title: '1차 감지', text: '사람의 움직임을 따라가며 이상행동 6가지를 먼저 찾아냅니다.' },
  { idx: '03', title: 'AI가 한 번 더 확인', text: '그날 매장 일정, 방문 기록, 지난 판단 기록을 살펴 잘못 울린 알림인지 다시 봅니다.' },
  { idx: '04', title: '바로 알림', text: '사이트 알림과 문자 · 메일로 바로 알리고, 메일은 받는 분의 언어로 번역해 보냅니다.' },
  { idx: '05', title: '확인 · 처리', text: '도면에 표시된 위치를 보고, 실제 상황인지 잘못된 감지인지 직접 정합니다.' },
];

// 도입 부담 — 구독 방식
const REASONS = [
  { title: '기존 CCTV 그대로', text: '지금 달려 있는 CCTV에 작은 분석 장치만 설치합니다. 카메라를 새로 사지 않아도 됩니다.' },
  { title: '약정 없는 구독', text: 'CCTV 대수에 맞춰 6개월 · 12개월 단위로 이용하고, 쓰는 중에도 대수를 바꿀 수 있습니다.' },
  { title: '6종 감지 기본 포함', text: '감지 종류마다 요금이 붙지 않습니다. 방문객 통계와 AI 상담도 함께 이용하세요.' },
];

const ROAD = [
  { stage: '현재', title: '실시간 알림', text: '이상행동이 감지되면 사이트 알림과 문자 · 메일로 바로 알리고, 메일은 받는 분의 언어로 번역해 보냅니다.', now: true },
  { stage: '현재', title: 'AI 고객 응대', text: '궁금한 점은 챗봇이 이용 안내서를 바탕으로 바로 답하고, 문의 글에도 AI가 먼저 답을 달아 드립니다. 사람 상담이 필요하면 문의로 이어 드립니다.', now: true },
  { stage: '현재', title: '매장 운영 데이터', text: '감지에 쓰는 영상 분석으로 방문객 수와 머문 시간도 함께 세어, 매장별 통계로 보여 드립니다.', now: true },
  { stage: '다음 단계', title: '보안업체 연동', text: '위험한 상황은 계약한 보안업체에 자동으로 전달합니다.', now: false },
  { stage: '향후', title: '112 · 119 신고 연계', text: '폭행 · 응급 상황이면 바로 신고할 수 있게 연결하는 것을 목표로 합니다.', now: false },
  { stage: '향후', title: '휴대폰 앱 알림', text: '앱 알림으로 더 빨리 확인할 수 있게 넓혀 갑니다.', now: false },
];

interface PlanSummary { pname: string; min: number; max: number; price: number; }

interface RevealSectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

export function RevealSection({ id, className = '', children }: RevealSectionProps) {
  // 1. TypeScript 타입을 HTMLSectionElement로 명시
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const sectionClassName = `border_top reveal${visible ? ' in' : ''} ${className}`.trim();

  // 2. <section> 태그에 id, className, ref 바인딩
  return (
    <section id={id} className={sectionClassName} ref={ref}>
      {children}
    </section>
  );
}



const Home = () => {
  const { login } = GlobalStoreSession();
  const clock = useClock();
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  // 판매 중인 구독권에서 등급별 최저 단가를 뽑아 보여 준다 (요금이 바뀌면 메인도 따라 바뀜)
  useEffect(() => {
    axiosInstance
      .get<{ pname: string; mincctv: number; maxcctv: number; bprice: number; issell?: string }[]>('/shop_plan/list')
      .then((res) => {
        const map = new Map<string, PlanSummary>();
        res.data.filter((p) => p.issell !== 'N').forEach((p) => {
          const cur = map.get(p.pname);
          const price = Number(p.bprice);
          if (!cur || price < cur.price) map.set(p.pname, { pname: p.pname, min: Number(p.mincctv), max: Number(p.maxcctv), price });
        });
        setPlans([...map.values()].sort((a, b) => a.min - b.min));
      })
      .catch(() => setPlans([]));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="wrap hero_grid">
          <div>
            <span className="eyebrow">AI 무인매장 실시간 관제</span>
            <h2 className='h_display'>
              사람이 없어도,
              <br />
              <em>매장은 지켜집니다</em>
            </h2>
            <p className="hero_sub">
              아이스크림 · 과자 무인 판매점의 CCTV 영상을 AI가 실시간으로 분석해 무단침입, 폭행, 기물파손, 쓰러짐을
              감지하고 점주님께 바로 알려 드립니다.
            </p>
            <div className="hero_actions">
              <Link to="/shopplan" className="btn btn_lg btn_primary">
                구독 하러가기
              </Link>
              <a href="#flow" className="btn btn_lg btn_ghost">
                작동 방식 보기
              </a>
            </div>
            <div className="hero_stats">
              <div>
                <div className="num mono">6종</div>
                <div className="lab">이상행동 실시간 감지</div>
              </div>
              <div>
                <div className="num mono">2번</div>
                <div className="lab">매장 장치 감지 + AI 재확인</div>
              </div>
              <div>
                <div className="num mono">24/7</div>
                <div className="lab">무중단 실시간 분석</div>
              </div>
            </div>
          </div>

          <div className="wall">
            <div className="wall_bar">
              <span className="live">LIVE</span>
              <span>본점 · CAM 01–04</span>
            </div>
            <HeroCams />
            <div className="wall_footer">
              <span>본점 · 무인 판매점</span>
              <span>{clock}</span>
            </div>
          </div>
        </div>
      </section>
      
      <RevealSection>
        <div className="wrap">
          <div className="section_head">
            <span className="eyebrow">문제 상황</span>
            <h2>이런 순간, 아무도 보고 있지 않습니다</h2>
            <p>CCTV는 24시간 녹화하지만, 그 화면을 지켜보는 사람은 없습니다.</p>
          </div>
          <div className="problem_grid">
            {PROBLEMS.map((p) => (
              <div className="problem_card" key={p.tag}>
                <span className="tag">{p.num}</span>
                <div className="num">{p.tag}</div>
                <p>{p.text}</p>
                <div className="sub">{p.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      
      <RevealSection id="features">
        <div className="wrap">
          <div className="section_head">
            <span className="eyebrow">핵심 기능</span>
            <h2>6가지 이상행동을 실시간으로 감지합니다</h2>
            <p>영상 속 사람의 움직임과 자세를 분석해 위험 상황을 자동으로 판별합니다.</p>
          </div>
          <div className="feat_grid">
            {FEATURES.map((f) => (
              <div className="feat_card" key={f.title}>
                <div className="feat_icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[f.icon]}</svg></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      
      <RevealSection id="flow">
        <div className="wrap">
          <div className="section_head">
            <span className="eyebrow">작동 방식</span>
            <h2>감지부터 대응까지, 하나의 흐름으로</h2>
            <p>매장의 분석 장치가 먼저 찾아내고, AI가 한 번 더 확인한 뒤 점주님께 알려 드립니다.</p>
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
      </RevealSection>
      
      
      <RevealSection id="dashboard">
        <div className="wrap">
          <div className="section_head">
            <span className="eyebrow">서비스 화면</span>
            <h2>감지된 순간, 점주가 받아 보는 것</h2>
            <p>알림 한 줄로 끝나지 않습니다. AI가 확인한 이유와 도면 위 발생 위치까지 함께 보고 바로 판단할 수 있습니다.</p>
          </div>
          <HomeShowcase />
        </div>
      </RevealSection>

      <RevealSection id="pricing">
        <div className="wrap">
          <div className="section_head">
            <span className="eyebrow">도입 부담</span>
            <h2>CCTV 대수만큼, 필요한 기간만큼</h2>
            <p>새 카메라도, 긴 약정도 없이 시작할 수 있습니다.</p>
          </div>
          <div className="reason_grid">
            {REASONS.map((r) => (
              <div className="reason_card" key={r.title}>
                <h4>{r.title}</h4>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
          {plans.length > 0 && (
            <div className="price_strip">
              {plans.map((p) => (
                <div className="price_item" key={p.pname}>
                  <div className="pn">{p.pname}</div>
                  <div className="pc">CCTV {p.min}~{p.max}대</div>
                  <div className="pp"><span className="mono">{p.price.toLocaleString('ko-KR')}</span>원<small> / 대 · 월부터</small></div>
                </div>
              ))}
              <Link to="/shopplan" className="btn btn_primary price_go">요금제 자세히 보기</Link>
            </div>
          )}
        </div>
      </RevealSection>

      <RevealSection id="roadmap">
        <div className="wrap">
          <div className="section_head">
            <span className="eyebrow">지금과 다음</span>
            <h2>관제를 넘어, 대응까지</h2>
            <p>지금 쓸 수 있는 기능과, 단계적으로 넓혀 갈 대응 체계입니다.</p>
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
      </RevealSection>

      <RevealSection className="cta border_top">
        <div className="wrap">
          <h2>지금, 매장에 눈을 달아주세요</h2>
          <p>구독을 신청하시면 담당자가 연락드려 CCTV 설치 · 등록을 도와드립니다.</p>
          <div className="cta_actions">
            <Link to="/shopplan" className="btn btn_lg btn_primary">
              구독하러 가기
            </Link>
            <Link to={login ? '/user/qa/new' : '/board/qa/new'} className="btn btn_lg btn_ghost">
              문의 상담하러 가기
            </Link>
          </div>
        </div>
      </RevealSection>
    </>
  )
}

export default Home

