/* --------------- css import --------------- */
import './home.css'
/* ------------------------------------------- */
import { Link } from 'react-router-dom';
import { useReveal } from '../../hooks/useReveal';
import { useClock } from '../../hooks/useClock';

const PROBLEMS = [
  { tag: '심야 시간대', text: '새벽 시간, 매장에는 CCTV만 돌아가고 이상 상황이 생겨도 발견까지 시간이 걸립니다.', sub: '관리 공백 시간대' },
  { tag: '응급 상황', text: '손님이 쓰러지는 등 응급 상황이 발생해도, 다음 방문객이 올 때까지 아무도 알아채지 못합니다.', sub: '골든타임 지연' },
  { tag: '사후 확인', text: '기물파손이나 무단침입은 대부분 다음날 정산이나 순찰 때가 되어서야 뒤늦게 발견됩니다.', sub: '사후 대응의 한계' },
];


const FEATURES = [
  { icon: '▲', title: '폭행 감지', text: '급격한 신체 접촉과 움직임 패턴을 분석해 폭력 상황을 감지합니다.' },
  { icon: '◆', title: '기물파손 감지', text: '집기 파손, 투척 행동 등 비정상적인 물리적 충격을 인식합니다.' },
  { icon: '●', title: '쓰러짐(응급) 감지', text: '자세 추정 기반으로 낙상·쓰러짐을 판별해 응급 상황을 즉시 알립니다.' },
  { icon: '▣', title: '무단침입 감지', text: '영업 종료 시간대 출입 및 비인가 접근을 실시간으로 포착합니다.' },
  { icon: '◐', title: '장시간 배회 감지', text: '동일 인물의 비정상적인 체류·배회 패턴을 추적해 사전 경고합니다.' },
];

const STEPS = [
  { idx: '01', title: 'CCTV 영상 수집', text: '매장별 CCTV 영상을 실시간 스트리밍으로 수집합니다.' },
  { idx: '02', title: 'AI 행동 분석', text: 'AI 모델이 프레임 단위로 이상행동 여부를 판별합니다.' },
  { idx: '03', title: '교차 검증', text: '출입기록·소음·센서 데이터를 함께 대조해 신뢰도를 높입니다.' },
  { idx: '04', title: '실시간 알림', text: 'WebSocket으로 관리자에게 즉시 알림을 전송합니다.' },
  { idx: '05', title: '기록 저장', text: '이벤트 시점의 영상과 스냅샷을 자동으로 저장합니다.' },
];

const STORES = ['본점 · 스터디카페 A', '2호점 · 무인카페 B', '3호점 · 스터디카페 C', '4호점 · 무인카페 D'];
const CAMS = ['CAM 01', 'CAM 02', 'CAM 03', 'CAM 04', 'CAM 05', 'CAM 06'];
const LOGS = [
  { level: 'danger', t: '14:32:07', d: 'CAM 02 · 이상행동 감지' },
  { level: 'warn', t: '13:58:41', d: 'CAM 04 · 장시간 배회' },
  { level: 'ok', t: '13:20:02', d: 'CAM 01 · 정상 출입' },
  { level: 'ok', t: '12:47:19', d: 'CAM 03 · 정상 출입' },
];



const ROAD = [
  { stage: '현재', title: '관리자 실시간 알림', text: '이상행동 감지 시 SMS·이메일로 즉시 전송하고, 웹메일함에서 해외 매장 회신까지 번역해 확인합니다.', now: true },
  { stage: '현재', title: '오디오 이상음 감지', text: 'CCTV 영상만으로 놓치는 상황을 오디오 센서(ESP32)로 함께 잡아내 감지 증거로 남깁니다.', now: true },
  { stage: '현재', title: '구독형 운영 관리', text: '매장별 구독 플랜과 결제 내역, 1:1문의·챗봇 상담까지 관리자 화면 하나로 운영합니다.', now: true },
  { stage: '다음 단계', title: '보안업체 자동 연동', text: '위험도가 높은 이벤트는 계약된 보안업체로 자동 전달합니다.', now: false },
  { stage: '향후', title: '경찰·119 신고 연계', text: '폭행·응급 상황을 자동으로 판별해 신고 시스템과 연동을 목표로 합니다.', now: false },
  { stage: '향후', title: '다국어 자동 회신', text: '지금은 번역해서 보여주는 수준이지만, 정형화된 문의는 AI가 현지어로 자동 회신하도록 넓혀갑니다.', now: false },
];


const LINKS = [
  { href: '/', stage: 'LIVE', title: '실시간 관제 대시보드', text: 'CCTV 화면, 이벤트 이력, 통계 리포트를 한 화면에서 확인합니다.', now: true },
  { href: '/', stage: '회원', title: '로그인 · 마이페이지 · 고객의 소리', text: '회원가입, 정보수정, 로그인 이력, 문의 접수까지.', now: true },
  { href: '/', stage: '매장', title: '매장 · CCTV 관리', text: '매장 등록, CCTV·오디오 센서 등록, 이상행동 유형코드 관리.', now: true },
  { href: '/', stage: '알림', title: '알림 · 메일 · AI 생성', text: 'SMS·메일 발송, 웹메일함 번역, 생성이미지·AI 도면 관리.', now: true },
  { href: '/', stage: '고객지원', title: '게시판 · 챗봇 · 구독', text: '공지사항, 1:1문의, 챗봇 상담, 구독권 결제까지.', now: true },
  { href: '/', stage: 'DESIGN', title: '공통 디자인 가이드', text: '컬러·타이포·버튼·폼 등 실무 퍼블리싱 클래스 레퍼런스.', now: false },
];

const Home = () => {
  const { ref, className } = useReveal<HTMLElement>();
  const clock = useClock();
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
              무인카페·스터디카페의 CCTV 영상을 AI가 실시간으로 분석해 폭행, 기물파손, 쓰러짐, 무단침입을 즉시
              감지하고 관리자에게 알립니다.
            </p>
            <div className="hero_actions">
              <Link to="/" className="btn btn_primary">
                데모 신청하기
              </Link>
              <a href="#flow" className="btn btn_ghost">
                작동 방식 보기
              </a>
            </div>
            <div className="hero_stats">
              <div>
                <div className="num mono">2.3초</div>
                <div className="lab">평균 알림 전송 속도</div>
              </div>
              <div>
                <div className="num mono">5종</div>
                <div className="lab">실시간 이상행동 감지</div>
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
            <div className="cams">
              <div className="cam">
                <span className="cam_tag">CAM 01</span>
                <div className="cam_noise" />
              </div>
              <div className="cam alert">
                <span className="cam_tag">CAM 02</span>
                <div className="cam_noise" />
                <div className="bbox" />
              </div>
              <div className="cam">
                <span className="cam_tag">CAM 03</span>
                <div className="cam_noise" />
              </div>
              <div className="cam">
                <span className="cam_tag">CAM 04</span>
                <div className="cam_noise" />
              </div>
            </div>
            <div className="wall_footer">
              <span>본점 · 스터디카페 A</span>
              <span>{clock}</span>
            </div>
          </div>
        </div>
      </section>
      
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

      
      <section className={`border_top ${className}`} ref={ref}>
        <div className="wrap">
          <div className="section_head">
            <span className="eyebrow">바로가기</span>
            <h2>이미 만들어진 관리 화면을 둘러보세요</h2>
            <p>영업 준비 중인 목업이 아니라, 실제로 동작하는 관리자 화면입니다.</p>
          </div>
          <div className="road">
            {LINKS.map((l) => (
              <Link to={l.href} className={`road_card${l.now ? ' now' : ''}`} style={{ display: 'block' }} key={l.href}>
                <div className="stage mono">{l.stage}</div>
                <h4>{l.title}</h4>
                <p>{l.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      <section className="cta border_top">
        <div className="wrap">
          <h2>지금, 매장에 눈을 달아주세요</h2>
          <p>도입 상담과 데모 시연을 신청하시면 담당자가 안내해드립니다.</p>
          <div className="cta_actions">
            <Link to="/" className="btn btn_primary">
              데모 신청하기
            </Link>
            <Link to="/" className="btn btn_ghost">
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home

