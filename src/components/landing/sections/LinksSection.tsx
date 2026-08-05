import { Link } from "react-router-dom";
import { useReveal } from "../../hooks/useReveal";


const LINKS = [
  { href: '/dashboard', stage: 'LIVE', title: '실시간 관제 대시보드', text: 'CCTV 화면, 이벤트 이력, 통계 리포트를 한 화면에서 확인합니다.', now: true },
  { href: '/member', stage: '회원', title: '로그인 · 마이페이지 · 고객의 소리', text: '회원가입, 정보수정, 로그인 이력, 문의 접수까지.', now: true },
  { href: '/store', stage: '매장', title: '매장 · CCTV 관리', text: '매장 등록, CCTV·오디오 센서 등록, 이상행동 유형코드 관리.', now: true },
  { href: '/notify', stage: '알림', title: '알림 · 메일 · AI 생성', text: 'SMS·메일 발송, 웹메일함 번역, 생성이미지·AI 도면 관리.', now: true },
  { href: '/board', stage: '고객지원', title: '게시판 · 챗봇 · 구독', text: '공지사항, 1:1문의, 챗봇 상담, 구독권 결제까지.', now: true },
  { href: '/design-guide', stage: 'DESIGN', title: '공통 디자인 가이드', text: '컬러·타이포·버튼·폼 등 실무 퍼블리싱 클래스 레퍼런스.', now: false },
];

export default function LinksSection() {
  const { ref, className } = useReveal<HTMLElement>();
  return (
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
  );
}
