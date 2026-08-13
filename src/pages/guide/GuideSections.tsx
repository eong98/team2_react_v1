import { useState } from 'react';
import {
  AdminToolbar,
  AlertModal,
  ConfirmDeleteModal,
  DataAcc,
  DataCard,
  DataTable,
  DbmsPagination,
  Filterbar,
  UserPagination,
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import type { DataCardColumn } from '../../components/ui/common/DataCard';
import type { AccordionCardColumn } from '../../components/ui/common/DataAcc';
import { GuideBlock, GuideCompare, GuideSection, GuideStack } from './GuideBlock';

/* =========================================================================
   1. 컬러 팔레트
========================================================================= */
const COLOR_TOKENS = [
  { name: '--primary', ko: '기본(초록) — 강조 버튼, 성공 상태', value: 'var(--primary)' },
  { name: '--secondary', ko: '보조(틸) — 정보성 배지', value: 'var(--secondary)' },
  { name: '--cta', ko: '강조(오렌지) — 콜투액션', value: 'var(--cta)' },
  { name: '--warning', ko: '경고(앰버) — 대기/주의 상태', value: 'var(--warning)' },
  { name: '--danger', ko: '위험(레드) — 삭제/오류', value: 'var(--danger)' },
];

 
const COLOR_SCALES: { key: string; label: string; role: string; hex: string[] }[] = [
  {
    key: 'green',
    label: 'PRIMARY · GREEN',
    role: '브랜드 기본(관제 정상/시스템) 상태',
    hex: ['#EAFBF3', '#C9F5E1', '#9EEBC9', '#6FE0AF', '#4CDA9C', '#33D68A', '#22B975', '#189761', '#12734B', '#0B4E34'],
  },
  {
    key: 'teal',
    label: 'SECONDARY · TEAL',
    role: '보조 색상',
    hex: ['#EAFBF9', '#C7F4EE', '#98E9DF', '#67DCCE', '#42D3C0', '#22C4AF', '#17A997', '#128678', '#0D655C', '#08423D'],
  },
  {
    key: 'orange',
    label: 'ACCENT · ORANGE',
    role: 'CTA / 긴급 강조',
    hex: ['#FFF2ED', '#FFDCCC', '#FFB99A', '#FF9670', '#FF7D50', '#FF6A3D', '#E14E24', '#B53A18', '#872A13', '#591B0C'],
  },
  {
    key: 'amber',
    label: 'WARNING · AMBER',
    role: '주의 상태',
    hex: ['#FFF8E8', '#FFEBB8', '#FFDC85', '#FFCB53', '#FFBD30', '#FFB020', '#DB8E0E', '#AD6E09', '#7F5006', '#523203'],
  },
  {
    key: 'red',
    label: 'DANGER · RED',
    role: '위험 / 에러 상태',
    hex: ['#FFF0F1', '#FFD1D5', '#FFA4AC', '#FF7783', '#FF5D6B', '#FF4D5E', '#E01C30', '#B01424', '#7F0F1A', '#4F0910'],
  },
  {
    key: 'violet',
    label: 'DATA · VIOLET',
    role: '통계·차트 5번째 계열 (그 외엔 사용 지양)',
    hex: ['#F3F0FF', '#DED4FF', '#BDA8FF', '#9C7CFF', '#8A66FF', '#7C5CFF', '#5F3FE0', '#492FB0', '#352180', '#211450'],
  },
  {
    key: 'n',
    label: 'NEUTRAL',
    role: '배경/서페이스/테두리/텍스트 (n-900이 기본 배경)',
    hex: ['#E8EDF2', '#DDE3E9', '#B7C0CA', '#8A96A3', '#576372', '#2E3A47', '#232C37', '#1A222C', '#141B24', '#0F151C', '#0A0E13', '#05070A'],
  },
];
const SCALE_STEPS_10 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const SCALE_STEPS_N = [50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950];
function ColorScaleRow({ family }: { family: (typeof COLOR_SCALES)[number] }) {
  const steps = family.key === 'n' ? SCALE_STEPS_N : SCALE_STEPS_10;
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="b_caption" style={{ marginBottom: 8 }}>
        {family.label} — {family.role} · var(--{family.key}-{steps[0]} ~ --{family.key}-{steps[steps.length - 1]})
      </div>
      <div style={{ display: 'flex' }}>
        {family.hex.map((hex, i) => (
          <div key={hex} style={{ flex: 1, background: hex, padding: '14px 10px', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: i < steps.length / 2 ? '#111' : '#fff' }}>
              {steps[i]}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: i < steps.length / 2 ? '#333' : 'rgba(255,255,255,.75)' }}>
              --{family.key}-{steps[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
 
export function ColorSection() {
  return (
    <GuideSection
      title="컬러 팔레트"
      description="버튼·배지·상태 표시에 쓰이는 시맨틱 컬러 토큰입니다. 실제 hex 코드를 직접 쓰지 말고 항상 이 변수명으로 참조하세요 — 나중에 브랜드 컬러가 바뀌어도 index.css의 토큰 값만 고치면 전체 화면에 한 번에 반영됩니다."
    >
      <GuideBlock
        title="시맨틱 컬러 토큰"
        description="index.css의 :root에 정의된 색상 변수. 배경/글자색 어디든 var(--토큰명)으로 씁니다."
        code={`<div style={{ background: 'var(--primary)' }}>...</div>`}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, width: '100%' }}>
          {COLOR_TOKENS.map((c) => (
            <div key={c.name}>
              <div style={{ height: 44, borderRadius: 8, background: c.value, border: '1px solid var(--border)' }} />
              <div className="cell_title" style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {c.name}
              </div>
              <div className="cell_sub">{c.ko}</div>
            </div>
          ))}
        </div>
      </GuideBlock>
 
      <GuideBlock
        title="전체 컬러 스케일 (50~900)"
        description="계열별 10단계(neutral은 12단계) 원색 스케일입니다. 대부분의 화면에서는 아래 '시맨틱 컬러 토큰'만 쓰면 되고, 배지·차트처럼 진하기 단계가 여러 개 필요할 때만 이 스케일에서 직접 골라 씁니다."
        code={`<div style={{ background: 'var(--amber-500)' }}>...</div>`}
      >
        <div style={{ width: '100%' }}>
          {COLOR_SCALES.map((family) => (
            <ColorScaleRow key={family.key} family={family} />
          ))}
        </div>
      </GuideBlock>
 
    </GuideSection>
  );
}

/* =========================================================================
   1-1. 타이포그래피
   예전 가이드의 .h_display/.h_h1~4, .b_lg/.b_md/.b_sm는 지금 프로젝트엔 없고,
   .title(+xlg/lg/md/sm) 과 .b_title(+lg) 체계로 바뀌어 있어서 그 기준으로 새로 정리.
========================================================================= */
const TITLE_SAMPLES = [
  { cls: 'title xlg', size: '32px / 800', desc: '페이지 최상단 큰 타이틀' },
  { cls: 'title lg', size: '24px / 700', desc: '섹션 타이틀' },
  { cls: 'title md', size: '18px / 700', desc: '카드/블록 타이틀 (PageHeader 기본값)' },
  { cls: 'title sm', size: '16px / 700', desc: '작은 블록 타이틀' },
  { cls: 'title (기본)', size: '22px / 800', desc: '수식어 없이 기본 크기' },
];


export function TypographySection() {
  return (
    <GuideSection
      title="타이포그래피"
      description="Display/본문은 Pretendard, 숫자·코드·라벨류는 JetBrains Mono(.mono)를 씁니다. ⚠️ 예전 정적 가이드의 .h_h1~4 / .b_lg·b_md·b_sm 클래스는 이 프로젝트엔 없습니다 — 지금은 .title(+크기 수식어)과 .b_title 체계로 바뀌었으니 새 화면엔 이 클래스를 쓰세요."
    >
      <GuideBlock
        title="제목 — .title + 크기 수식어"
        description="h1~h4처럼 태그별로 나누지 않고, title 클래스에 xlg/lg/md/sm을 조합해서 크기를 정합니다. PageHeader.tsx의 title_size prop이 바로 이 수식어를 받습니다."
        code={`<h2 className="title xlg">32px 타이틀</h2>
<h3 className="title md">18px 타이틀</h3>

// PageHeader.tsx에서는:
<PageHeader title="문의사항" title_size="lg" />`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          {TITLE_SAMPLES.map((t) => (
            <div key={t.cls} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span className={t.cls === 'title (기본)' ? 'title' : t.cls}>가나다 Abc 123</span>
              <span className="cell_sub" style={{ fontFamily: 'var(--font-mono)' }}>
                .{t.cls.replace(' ', '.')} · {t.size} — {t.desc}
              </span>
            </div>
          ))}
        </div>
      </GuideBlock>

      <GuideBlock
        title="본문 — .b_title, 라벨·숫자 — .b_caption / .b_num"
        description="본문 설명 텍스트는 b_title(기본 13px, lg 수식어로 16px). 대문자 라벨/캡션은 b_caption, 강조된 숫자(통계 등)는 b_num."
        code={`<p className="b_title">기본 본문 설명 텍스트</p>
<p className="b_title lg">조금 더 큰 본문(16px)</p>
<span className="b_caption">SECTION LABEL</span>
<span className="b_num mono">128,402</span>
<p className="cell_title">.cell_title — 카드나 표 내부에 들어가는 타이틀 (13px)</p>
<p className="cell_sub">.cell_sub — 카드나 표 내부에 들어가는 텍스트 (11px)</p>`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p className="b_title">.b_title — 기본 본문 설명 텍스트 (13px)</p>
          <p className="b_title lg">.b_title.lg — 조금 더 큰 본문 (16px)</p>
          <span className="b_caption">.b_caption — SECTION LABEL</span>
          <span className="b_num mono">.b_num .mono — 128,402</span>

          
          <p className="cell_title">.cell_title — 카드나 표 내부에 들어가는 타이틀 (13px)</p>
          <p className="cell_sub">.cell_sub — 카드나 표 내부에 들어가는 텍스트 (11px)</p>
        </div>
      </GuideBlock>
    </GuideSection>
  );
}

/* =========================================================================
   1-2. 레이아웃 & 스페이싱
========================================================================= */
const SPACING_TOKENS = [
  { name: '--sp-1', px: 4 },
  { name: '--sp-2', px: 8 },
  { name: '--sp-3', px: 12 },
  { name: '--sp-4', px: 16 },
  { name: '--sp-5', px: 20 },
  { name: '--sp-6', px: 24 },
];

export function LayoutSection() {
  return (
    <GuideSection
      title="레이아웃 & 스페이싱"
      description="4px 기반 스페이싱 스케일과 카드/그리드 유틸리티 클래스입니다. 값은 index.css의 --sp-* 그대로이고, 클래스명도 예전 가이드와 동일하게 유지되고 있습니다 (변경 없음)."
    >
      <GuideBlock
        title="스페이싱 토큰"
        description="margin/padding/gap에 직접 px 값을 쓰지 말고 이 변수를 씁니다."
        code={`<div style={{ padding: 'var(--sp-4)', gap: 'var(--sp-3)' }}>...</div>`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {SPACING_TOKENS.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="cell_sub" style={{ width: 70, fontFamily: 'var(--font-mono)' }}>
                {s.name}
              </span>
              <div style={{ width: s.px, height: 14, background: 'var(--primary)', borderRadius: 2 }} />
              <span className="cell_sub">{s.px}px</span>
            </div>
          ))}
        </div>
      </GuideBlock>

      <GuideBlock
        title="카드 / 그리드 유틸리티"
        description="card_pad_md(카드 기본 패딩 20px), card_pad_lg(가이드/폼처럼 여유있게), grid_3(3열 그리드, gap 14px), stack_md(세로 배치 자식들 사이 16px 자동 적용)."
        code={`<div className="grid_3">
  <div className="card card_pad_md">...</div>
  <div className="card card_pad_md">...</div>
  <div className="card card_pad_md">...</div>
</div>

<div className="stack_md">
  <div>위 항목</div>
  <div>아래 항목 (자동으로 16px 간격)</div>
</div>


<div className="card card_pad_md danger">
  <div>빨간 보더라인 적용</div>
  <div>아래 항목 (자동으로 16px 간격)</div>
</div>`}
      >
        <div className="grid_4">
          <div className="card card_pad_md">
            <div className="title sm">.card_pad_md</div>
            <div className="b_title">기본 카드, radius-md(10px)</div>
          </div>
          <div className="card card_pad_md">
            <div className="title sm">.grid_3</div>
            <div className="b_title">3열 그리드, gap 14px</div>
          </div>
          <div className="card card_pad_md">
            <div className="title sm">.stack_md</div>
            <div className="b_title">세로 간격 16px 자동 적용</div>
          </div>
          
          <div className="card card_pad_md danger">
            <div className='title sm'>.card .danger</div>
            <div className="b_title">빨간 보더라인 적용</div>
          </div>
        </div>
      </GuideBlock>
    </GuideSection>
  );
}

/* =========================================================================
   2. 버튼
========================================================================= */
export function ButtonSection() {
  return (
    <GuideSection title="버튼" description="모든 버튼은 기본 .btn 클래스 + 색상 클래스 + (선택) 크기 클래스 조합으로 만듭니다.">
      <GuideBlock
        title="색상"
        description="btn_primary(강조/제출), btn_ghost(보조/취소), btn_danger(위험 액션 실행), btn_outline_primary·btn_danger_outline(테두리만 있는 약한 강조), btn[disabled](비활성 표시용 — 실제 비활성화는 disabled 속성으로)."
        code={`<button className="btn btn_md btn_primary">저장</button>
<button className="btn btn_md btn_ghost">취소</button>
<button className="btn btn_md btn_danger">삭제</button>`}
      >
        <button className="btn btn_md btn_primary" type="button">btn_primary</button>
        <button className="btn btn_md btn_secondary" type="button">btn_secondary</button>
        <button className="btn btn_md btn_cta" type="button">btn_cta</button>
        <button className="btn btn_md btn_ghost" type="button">btn_ghost</button>
        <button className="btn btn_md btn_danger" type="button">btn_danger</button>
        <button className="btn btn_md btn_outline_primary" type="button">btn_outline_primary</button>
        <button className="btn btn_md btn_danger_outline" type="button">btn_danger_outline</button>
        <button className="btn btn_md" type="button" disabled>btn disabled</button>
      </GuideBlock>

      <GuideBlock
        title="크기"
        description="btn_lg(폼 하단 주요 액션), btn_md(기본, 대부분의 버튼), btn_sm(테이블/카드 안의 작은 액션 버튼)."
        code={`<button className="btn btn_lg btn_primary">btn_lg</button>
<button className="btn btn_md btn_primary">btn_md</button>
<button className="btn btn_sm btn_primary">btn_sm</button>`}
      >
        <button className="btn btn_lg btn_primary" type="button">btn_lg</button>
        <button className="btn btn_md btn_primary" type="button">btn_md</button>
        <button className="btn btn_sm btn_primary" type="button">btn_sm</button>
      </GuideBlock>

      <GuideBlock
        title="버튼 그룹 배치"
        description="버튼 두세 개를 나란히 놓을 때, 상황에 따라 프로젝트 곳곳에서 쓰는 클래스가 다릅니다. gap 값이 미묘하게 달라서(6px/8px/10px) 아무거나 섞어 쓰지 말고 용도에 맞는 걸 고르세요."
        code={`{/* 표/카드/아코디언 행 안의 수정·삭제 버튼, 툴바 보조버튼 (gap 6px) */}
<div className="actions">
  <button className="btn btn_sm btn_ghost">수정</button>
  <button className="btn btn_sm btn_danger_outline">삭제</button>
</div>

{/* 상세페이지 하단 액션 (gap 10px) — EventDetailPanel의 오탐지/확인완료 등 */}
<div className="detail_actions">
  <button className="btn btn_ghost">오탐지 처리</button>
  <button className="btn btn_primary">확인 완료</button>
</div>

{/* 폼 하단 취소/저장 (form_page 전용, 위쪽 구분선 + 오른쪽 정렬) */}
<div className="form_page_footer">
  <button className="btn btn_md btn_ghost">취소</button>
  <button className="btn btn_md btn_primary">저장</button>
</div>

{/* 폼 하단 취소/저장 (form_page 전용, + 오른쪽 정렬) */}
<div className="form_row_inline">
  <button className="btn btn_ghost">취소</button>
  <button className="btn btn_primary">저장</button>
</div>`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
          <div>
            <div className="cell_sub" style={{ marginBottom: 4 }}>
              .actions (gap 6px) — 표/카드/아코디언 행 안 (좌측정렬)
            </div>
            <div className="actions">
              <button className="btn btn_sm btn_ghost" type="button">
                수정
              </button>
              <button className="btn btn_sm btn_danger_outline" type="button">
                삭제
              </button>
            </div>

            
            <div className="cell_sub" style={{ marginBottom: 4 }}>
              .actions.both (gap 6px) — 좌우정렬
            </div>
            <div className="actions both">
              <button className="btn btn_sm btn_ghost" type="button">
                수정
              </button>
              <button className="btn btn_sm btn_danger_outline" type="button">
                삭제
              </button>
            </div>
            
            <div className="cell_sub" style={{ marginBottom: 4 }}>
              .actions.right (gap 6px) — 우측정렬
            </div>
            <div className="actions right">
              <button className="btn btn_sm btn_ghost" type="button">
                수정
              </button>
              <button className="btn btn_sm btn_danger_outline" type="button">
                삭제
              </button>
            </div>
          </div>
          <div>
            <div className="cell_sub" style={{ marginBottom: 4 }}>
              .form_row_inline (gap 8px, 오른쪽 정렬) — 입력 서식구조 하단 버튼 영역 (선 없는거)
            </div>
            <div className="form_row_inline">
              <button className="btn btn_ghost" type="button">
                취소
              </button>
              <button className="btn btn_primary" type="button">
                저장
              </button>
            </div>
          </div>
          <div>
            <div className="cell_sub" style={{ marginBottom: 4 }}>
              .form_row_inline (gap 8px, 오른쪽 정렬) — 입력 서식구조 하단 버튼 영역 (선 있는거)
            </div>
            <div className="form_page_footer">
              <button className="btn btn_ghost" type="button">
                취소
              </button>
              <button className="btn btn_primary" type="button">
                저장
              </button>
            </div>
          </div>
          <div>
            <div className="cell_sub" style={{ marginBottom: 4 }}>
              .detail_actions (gap 10px) — 상세페이지 하단
            </div>
            <div className="detail_actions">
              <button className="btn btn_ghost" type="button">
                오탐지 처리
              </button>
              <button className="btn btn_primary" type="button">
                확인 완료
              </button>
            </div>
          </div>
        </div>
      </GuideBlock>
    </GuideSection>
  );
}

/* =========================================================================
   3. 배지 — 두 방식이 공존
========================================================================= */
export function BadgeSection() {
  return (
    <GuideSection
      title="배지 (badge)"
      description="이 프로젝트엔 배지를 만드는 방식이 두 가지 공존합니다. 새 화면을 만들 땐 방식 A를 우선 쓰고, QA/게시판처럼 이미 방식 B로 짜여진 데이터 맵(QA_TYPE_MAP 등)을 그대로 이어 쓸 때만 방식 B를 씁니다."
    >
      <GuideBlock
        title="배지 그룹"
        description="badge_area : gap(8px)"
        code={`
<div className='badge_area'>
  <span className="badge danger">danger</span>
  <span className="badge danger">danger</span>
  <span className="badge danger">danger</span>
</div>`}
      >
        <div className='badge_area'>
          <span className="badge danger">danger</span>
          <span className="badge danger">danger</span>
          <span className="badge danger">danger</span>
        </div>
      </GuideBlock>

      <GuideBlock
        title="방식 A — className='badge 색상' (권장)"
        description="badge와 색상 클래스를 공백으로 띄워 씁니다. QaType.ts의 QA_TYPE_MAP/QA_STATUS_MAP이 이 방식으로 되어 있어서, 그 맵을 그대로 쓰는 화면에서는 이 조합을 계속 씁니다."
        code={`<span className="badge orange">장비장애</span>
<span className="badge wait">답변대기</span>
<span className="badge done">답변완료</span>`}
      >
        <span className="badge danger">danger</span>
        <span className="badge warning">warning</span>
        <span className="badge ok">ok</span>
        <span className="badge neutral">neutral</span>
        <span className="badge neutral_30">neutral_30</span>
        <span className="badge check">check</span>
        <span className="badge orange">orange</span>
        <span className="badge wait">wait</span>
        <span className="badge progress">progress</span>
        <span className="badge done">done</span>
      </GuideBlock>

      <GuideBlock
        title="방식 B — badge_색상이름 (기존 화면 유지용)"
        description="badge 클래스에 언더바가 결합된 색상 클래스 하나를 더합니다. 신규 화면은 이 방식을 쓰세요."
        code={`<span className="badge badge_success">완료</span>
<span className="badge badge_warning">대기</span>
<span className="badge badge_danger">오류</span>`}
      >
        <span className="badge badge_success">badge_success</span>
        <span className="badge badge_warning">badge_warning</span>
        <span className="badge badge_danger">badge_danger</span>
        <span className="badge badge_info">badge_info</span>
        <span className="badge badge_neutral">badge_neutral</span>
      </GuideBlock>
    </GuideSection>
  );
}

/* =========================================================================
   4. 폼 요소 + 유효성 검사 — 위아래로 배치 (폭이 넓어서 좌우비교는 안 맞음)
   user/dbms 둘 다 동일하게 form_group > form_label + form_control 구조를 씁니다.
========================================================================= */
export function FormSection() {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);

  return (
    <GuideSection
      title="폼 요소 & 유효성 검사"
      description="user·dbms 화면 모두 같은 구조를 씁니다. 폼은 라벨+입력이 세로로 쌓이는 형태라 폭이 넓어서, 좌우 비교보다 위아래로 훑어보는 게 더 잘 보입니다."
    >
      <GuideStack>
        <GuideBlock
          title="입력 필드 구조 — 세로형 (기본)"
          description="form_group(한 줄 전체) > form_label(htmlFor로 연결) + form_control(input과 에러 메시지를 감쌈). 필수 항목은 라벨 옆에 req 클래스로 * 표시. 특별히 감싸는 부모가 없으면 이 세로형(라벨이 입력창 위)이 기본입니다."
          code={`const [title, setTitle] = useState('');
const [errors, setErrors] = useState<{ title?: string }>({});

<div className="form_group">
  <label className="form_label" htmlFor="title">
    제목<span className="req">*</span>
  </label>
  <div className="form_control">
    <input
      id="title"
      className={\`form_input \${errors.title ? 'is_error' : ''}\`}
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />
    {errors.title && <div className="form_hint error">{errors.title}</div>}
  </div>
</div>`}
        >
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div className="form_group">
              <label className="form_label" htmlFor="guide_input">
                일반 입력<span className="req">*</span>
              </label>
              <div className="form_control">
                <input
                  id="guide_input"
                  className={`form_input${showError && !value.trim() ? ' is_error' : ''}`}
                  placeholder="여기에 입력해보세요"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                {showError && !value.trim() ? (
                  <div className="form_hint error">필수 항목입니다.</div>
                ) : (
                  <div className="form_hint">비워두고 검증 버튼을 눌러보세요.</div>
                )}
              </div>
            </div>
            <button type="button" className="btn btn_sm btn_ghost" onClick={() => setShowError(true)}>
              검증 실행 (is_error / form_hint.error 미리보기)
            </button>
          </div>
        </GuideBlock>

        <GuideBlock
          title="입력 필드 구조 — 가로형 (.form_page 안에서)"
          description="form_page로 감싼 안에서는 같은 form_group 마크업이 자동으로 가로형(라벨이 입력창 왼쪽, 라벨 폭 110px 고정)으로 바뀝니다. 마크업은 세로형과 완전히 동일하고, 부모에 form_page 클래스만 있으면 됩니다. QaForm.tsx가 이 방식(card card_pad_lg form_page)을 씁니다. 640px 이하에서는 자동으로 세로형으로 접힙니다."
          code={`<div className="card card_pad_lg form_page">
  <div className="form_group">
    <label className="form_label" htmlFor="title">
      제목<span className="req">*</span>
    </label>
    <div className="form_control">
      <input id="title" className="form_input" ... />
    </div>
  </div>
  {/* form_group을 필요한 만큼 반복 */}

  <div className="form_page_footer">
    <button className="btn btn_md btn_ghost">취소</button>
    <button className="btn btn_md btn_primary">저장</button>
  </div>
</div>`}
        >
          <div className="card card_pad_lg form_page" style={{ width: '100%' }}>
            <div className="form_group">
              <label className="form_label" htmlFor="guide_row_title">
                제목<span className="req">*</span>
              </label>
              <div className="form_control">
                <input id="guide_row_title" className="form_input" placeholder="제목을 입력하세요" />
                <div className="form_hint">라벨 폭이 고정(110px)되고, 입력창이 오른쪽 남는 공간을 채웁니다.</div>
              </div>
            </div>
            <div className="form_group">
              <label className="form_label" htmlFor="guide_row_type">
                유형
              </label>
              <div className="form_control">
                <select id="guide_row_type" className="form_select">
                  <option>기타</option>
                </select>
              </div>
            </div>
            <div className="form_page_footer">
              <button type="button" className="btn btn_md btn_ghost">
                취소
              </button>
              <button type="button" className="btn btn_md btn_primary">
                저장
              </button>
            </div>
          </div>
        </GuideBlock>

        <GuideBlock
          title="유효성 검사 패턴 (REQUIRED_FIELDS 배열)"
          description={
            <>
              필드를 하나씩 if문으로 검사하지 않고, <code className="mono">{'{ field, label, id }'}</code> 배열을 순회합니다.
              필수 항목이 늘어나면 배열에 한 줄만 추가하면 되고, 저장 버튼을 눌렀을 때 전체를 검사해서 전부 에러 표시 +
              맨 첫 번째 오류 필드로만 포커스를 이동합니다 (QaForm.tsx 실제 구현).
            </>
          }
          code={`const [input, setInput] = useState({ title: '', content: '' });
const [errors, setErrors] = useState<Record<string, string>>({});

const REQUIRED_FIELDS = [
  { field: 'title', label: '제목', id: 'qa_title' },
  { field: 'content', label: '내용', id: 'qa_content' },
];

const validate = () => {
  const newErrors = {};
  let firstErrorId = null;

  for (const { field, label, id } of REQUIRED_FIELDS) {
    if (!String(input[field] ?? '').trim()) {
      newErrors[field] = \`\${label}을(를) 입력해주세요.\`;
      if (!firstErrorId) firstErrorId = id;
    }
  }

  setErrors(newErrors);
  if (firstErrorId) {
    set_focus(firstErrorId); // utils/Tool.ts — document.getElementById(id)?.focus()
    return false;
  }
  return true;
};`}
        >
          <p className="cell_sub">실제 코드는 우측 "코드 복사" 버튼으로 그대로 가져다 쓸 수 있습니다.</p>
        </GuideBlock>

        <GuideBlock
          title="체크박스 / 라디오 — .form_check"
          description="체크박스든 라디오든 같은 .form_check 래퍼 하나로 씁니다. 라디오는 여러 개의 form_check를 나란히 놓고 name을 똑같이 맞추면 그룹으로 묶입니다 (QaForm.tsx 비밀글 여부, InMenuForm.tsx 사용여부가 실제 사용처)."
          code={`const [secret, setSecret] = useState(false);
const [useYn, setUseYn] = useState<'Y' | 'N'>('Y');

{/* 체크박스 (단독) */}
<div className="form_check">
  <input type="checkbox" id="secret" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
  <label htmlFor="secret" className="b_title">비밀글 설정</label>
</div>

{/* 라디오 (같은 name으로 그룹핑) */}
<div className="form_check">
  <input type="radio" id="use_y" name="useYn" value="Y" checked={useYn === 'Y'} onChange={() => setUseYn('Y')} />
  <label htmlFor="use_y" className="b_title">사용</label>
</div>
<div className="form_check">
  <input type="radio" id="use_n" name="useYn" value="N" checked={useYn === 'N'} onChange={() => setUseYn('N')} />
  <label htmlFor="use_n" className="b_title">미사용</label>
</div>`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="form_check">
              <input type="checkbox" id="guide_secret" defaultChecked />
              <label htmlFor="guide_secret" className="b_title">
                체크박스 — 비밀글 설정
              </label>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="form_check">
                <input type="radio" id="guide_use_y" name="guide_useYn" defaultChecked />
                <label htmlFor="guide_use_y" className="b_title">
                  라디오 — 사용
                </label>
              </div>
              <div className="form_check">
                <input type="radio" id="guide_use_n" name="guide_useYn" />
                <label htmlFor="guide_use_n" className="b_title">
                  라디오 — 미사용
                </label>
              </div>
            </div>
          </div>
        </GuideBlock>

        <GuideBlock
          title="체크박스 대안 — .check_row / .switch (토글)"
          description="CSS는 이미 완성돼 있지만 지금은 예시 화면(Test1~5)에서만 쓰이고, 실제 서비스 화면은 아직 이 스타일을 쓰지 않고 있습니다. 여러 개를 세로로 쭉 나열하는 체크리스트엔 check_row, on/off 하나만 표시하는 설정값(알림 켜기/끄기 등)엔 switch가 더 어울립니다."
          code={`{/* check_row — 체크리스트형 */}
<div className="check_row">
  <input type="checkbox" id="push" checked={push} onChange={(e) => setPush(e.target.checked)} />
  <label htmlFor="push">앱 푸시 알림</label>
</div>

{/* switch — on/off 토글 */}
<label className="switch">
  <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
  <span className="slider_el"></span>
</label>`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="check_row">
              <input type="checkbox" id="guide_push" defaultChecked />
              <label htmlFor="guide_push">check_row — 앱 푸시 알림</label>
            </div>
          </div>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider_el"></span>
          </label>
        </GuideBlock>
      </GuideStack>
    </GuideSection>
  );
}

/* =========================================================================
   5. 공통 훅 & 유틸 함수 — QA 화면들이 실제로 쓰고 있는 hooks/, utils/, store/
========================================================================= */
export function HooksSection() {
  const [byteText, setByteText] = useState('안녕하세요 hello');

  return (
    <GuideSection
      title="공통 훅 & 유틸 함수"
      description="컴포넌트가 아니라서 눈에 안 보이지만, QA 목록/상세/작성 화면이 실제로 의존하고 있는 hooks·utils·store입니다. 새 화면 만들 때 이것부터 확인하고 재사용하세요."
    >
      <GuideBlock
        title="useTab — 탭 상태 (URL 쿼리 기반)"
        description="tab을 URL 쿼리(?tab=qa)로 관리해서, 새로고침하거나 뒤로가기해도 탭이 유지됩니다. changeTab은 탭이 바뀌면 page 쿼리도 같이 지워서(=1페이지로) usePaging과 자동으로 맞물립니다."
        code={`import { useTab } from 'hooks/useTab';

const { tab, changeTab, navigateWithTab, goToList } = useTab<'qa' | 'faq'>({
  defaultTab: 'qa',
  basePath: '/user/qa',
});

changeTab('faq');           // 탭 전환 + page 쿼리 초기화
navigateWithTab(\`\${no}\`);   // 지금 쿼리(tab, page)를 유지한 채 상세로 이동
goToList();                 // 지금 쿼리를 유지한 채 목록으로 복귀`}
      >
        <p className="cell_sub">
          hooks/useTab.ts · <code className="mono">tab</code>/<code className="mono">changeTab</code>/
          <code className="mono">navigateWithTab</code>/<code className="mono">goToList</code> 반환
        </p>
      </GuideBlock>

      <GuideBlock
        title="usePaging — 페이지 번호 (URL 쿼리 기반, useTab과 독립)"
        description="page를 URL 쿼리(?page=2)로 관리합니다. useTab과 완전히 분리된 훅이라 각자 따로 setSearchParams를 부르지 않고, changeTab이 page 쿼리를 지우는 방식으로만 서로 연동됩니다 (동시에 여러 번 URL을 바꾸다가 서로 덮어쓰는 문제를 피하기 위함)."
        code={`import { usePaging } from 'hooks/usePaging';

const { page, setPage, resetPage } = usePaging();

<UserPagination page={page} totalPages={5} totalCount={42} pageSize={10} onChange={setPage} />`}
      >
        <p className="cell_sub">
          hooks/usePaging.ts · <code className="mono">page</code>/<code className="mono">setPage</code>/
          <code className="mono">resetPage</code> 반환
        </p>
      </GuideBlock>

      <GuideBlock
        title="axiosInstance — 공용 axios 인스턴스"
        description="baseURL이 개발/배포 환경에 따라 자동으로 바뀝니다 (import.meta.env.PROD). 새 API 호출을 만들 때 axios를 직접 import하지 말고 이걸 씁니다."
        code={`import { axiosInstance } from 'utils/Tool';

const res = await axiosInstance.get('/qa/list', { params: { page: page - 1, size: 10 } });
await axiosInstance.post('/qa/faq', payload);
await axiosInstance.delete('/qa', { data: { no, pw } });`}
      >
        <p className="cell_sub">utils/Tool.ts · 개발: http://10.1.205.126:9102, 배포: 상대경로로 자동 전환</p>
      </GuideBlock>

      <GuideBlock
        title="set_focus — id로 엘리먼트 포커스"
        description="document.getElementById(id)?.focus()의 짧은 래퍼. QaForm.tsx의 유효성 검사에서 '맨 첫 번째 오류 필드로 포커스 이동'할 때 씁니다."
        code={`import { set_focus } from 'utils/Tool';

if (firstErrorId) {
  set_focus(firstErrorId); // 예: set_focus('qa_title')
}`}
      >
        <p className="cell_sub">utils/Tool.ts · 인자로 받은 id의 엘리먼트에 .focus() 호출</p>
      </GuideBlock>

      <GuideBlock
        title="getNowDate — 서버 저장용 현재 시각 문자열"
        description="'YYYY-MM-DD HH:mm:ss' 형식(24시간제)으로 현재 시각을 반환합니다. QaForm.tsx가 저장 시 cdate 필드에 씁니다."
        code={`import { getNowDate } from 'utils/Tool';

const payload = { ...input, cdate: getNowDate() };`}
      >
        <p className="cell_sub">
          지금 실행 결과:{' '}
          <span className="mono">
            {(() => {
              const now = new Date();
              const r = now
                .toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hourCycle: 'h23',
                })
                .replace(/\./g, '-')
                .replace(/- /g, '-')
                .trim();
              return r.replace(/-([0-9]{2}:)/, ' $1');
            })()}
          </span>
        </p>
      </GuideBlock>

      <GuideBlock
        title="getByteLength / cutByByte — 한글 바이트 기준 글자수 제한"
        description="영문/숫자는 1바이트, 한글은 3바이트로 계산합니다. input maxLength(글자 수 기준)만으로는 한글/영문 혼용 시 제목 길이 제한이 부정확해서, DB 컬럼이 바이트 기준(예: VARCHAR(100))일 때 이 둘을 씁니다. cutByByte는 한글이 중간에 깨지지 않게 잘라줍니다."
        code={`import { getByteLength, cutByByte } from 'utils/Tool';

const [title, setTitle] = useState('');

const byteLen = getByteLength(title);       // 한글 3바이트, 영문 1바이트로 계산
if (byteLen > 100) {
  setTitle(cutByByte(title, 100));          // 100바이트를 넘지 않게, 글자 중간이 안 잘리게 자름
}`}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          <input className="form_input" value={byteText} onChange={(e) => setByteText(e.target.value)} style={{ marginBottom: 8 }} />
          <p className="cell_sub">
            바이트:{' '}
            {(() => {
              let b = 0;
              for (let i = 0; i < byteText.length; i++) b += byteText.charCodeAt(i) > 128 ? 3 : 1;
              return b;
            })()}
            {' · '}
            20바이트로 자르면:{' '}
            <span className="mono">
              {(() => {
                let byte = 0;
                let result = '';
                for (let i = 0; i < byteText.length; i++) {
                  const ch = byteText.charAt(i);
                  const cb = byteText.charCodeAt(i) > 128 ? 3 : 1;
                  if (byte + cb > 20) break;
                  byte += cb;
                  result += ch;
                }
                return result || '(빈 문자열)';
              })()}
            </span>
          </p>
        </div>
      </GuideBlock>

    </GuideSection>
  );
}

/* =========================================================================
   6. 목록 표시 컴포넌트 — DataTable / DataCard / DataAcc
   셋 다 user/dbms 공용(components/ui/common)이라 좌우비교 대상이 아니라 순서대로 배치
========================================================================= */
interface DemoRow {
  id: number;
  title: string;
  status: '대기' | '완료';
  writer: string;
}

const DEMO_DATA: DemoRow[] = [
  { id: 1, title: '예시 항목 A', status: '대기', writer: '홍길동' },
  { id: 2, title: '예시 항목 B', status: '완료', writer: '김철수' },
];

export function TableSection() {
  const [deleteTarget, setDeleteTarget] = useState<DemoRow | null>(null);

  const tableColumns: DataTableColumn<DemoRow>[] = [
    { header: '제목', accessor: 'title' },
    {
      header: '상태',
      render: (r) => <span className={`badge ${r.status === '완료' ? 'badge_success' : 'badge_warning'}`}>{r.status}</span>,
    },
    { header: '작성자', accessor: 'writer' },
  ];

  const cardColumns: DataCardColumn<DemoRow>[] = [
    {
      header: '상태',
      render: (r) => <span className={`badge ${r.status === '완료' ? 'badge_success' : 'badge_warning'}`}>{r.status}</span>,
    },
    {
      header: '제목',
      render: (r) => (
        <div className="lt">
          <div className="cell_title">{r.title}</div>
          <div className="cell_sub">작성자: {r.writer}</div>
        </div>
      ),
    },
  ];

  const accColumns: AccordionCardColumn<DemoRow>[] = [{ header: '작성자', render: (r) => <div className="lt">{r.writer}</div> }];

  return (
    <GuideSection
      title="목록 표시 컴포넌트"
      description="같은 데이터를 보여주는 세 가지 방식. 화면 성격에 맞게 골라 쓰면 됩니다 — 표 형태가 어울리면 DataTable, 카드 형태가 어울리면 DataCard, 펼쳐봐야 하는 긴 내용(FAQ 답변 등)이면 DataAcc."
    >
      <GuideBlock
        title="DataTable — 표 형태 목록"
        description="columns 배열만 정의하면 되는 범용 관리자 테이블. onEdit/onDelete를 넘기면 행마다 자동으로 액션 버튼이 붙습니다."
        code={`const [rows, setRows] = useState(data);
const [deleteTarget, setDeleteTarget] = useState(null);

<DataTable
  columns={[
    { header: '제목', accessor: 'title' },
    { header: '상태', render: (r) => <span className="badge badge_success">{r.status}</span> },
  ]}
  data={rows}
  rowKey={(r) => r.id}
  onDelete={(r) => setDeleteTarget(r)}
/>`}
      >
        <div style={{ width: '100%' }}>
          <DataTable columns={tableColumns} data={DEMO_DATA} rowKey={(r) => r.id} onDelete={(r) => setDeleteTarget(r)} />
        </div>
      </GuideBlock>

      <GuideBlock
        title="DataCard — 카드 형태 목록"
        description="한 줄에 정보가 많거나 모바일 대응이 중요한 목록에 씁니다. columns 인터페이스는 DataTable과 동일해서 서로 바꿔 끼우기 쉽습니다."
        code={`const [rows, setRows] = useState(data);
const [deleteTarget, setDeleteTarget] = useState(null);

<DataCard
  columns={[
    { header: '상태', render: (r) => <span className="badge badge_warning">{r.status}</span> },
    { header: '제목', render: (r) => <div className="cell_title">{r.title}</div> },
  ]}
  data={rows}
  rowKey={(r) => r.id}
  onDelete={(r) => setDeleteTarget(r)}
/>`}
      >
        <div style={{ width: '100%' }}>
          <DataCard columns={cardColumns} data={DEMO_DATA} rowKey={(r) => r.id} onDelete={(r) => setDeleteTarget(r)} />
        </div>
      </GuideBlock>

      <GuideBlock
        title="DataAcc — 아코디언 목록"
        description="title에 항상 보이는 요약(질문 등)을, columns에 펼쳤을 때만 보이는 상세(답변 등)를 정의합니다. FAQ 목록이 대표 사용처."
        code={`const [rows, setRows] = useState(data);

<DataAcc
  title={(r) => <>Q. {r.title}</>}
  columns={[{ header: 'A. 답변', render: (r) => <div>{r.answer}</div> }]}
  data={rows}
  rowKey={(r) => r.id}
  allowMultiple={false} // 하나 펼치면 나머지는 자동으로 닫힘
/>`}
      >
        <div style={{ width: '100%' }}>
          <DataAcc title={(r) => <>{r.title}</>} columns={accColumns} data={DEMO_DATA} rowKey={(r) => r.id} onDelete={(r) => setDeleteTarget(r)} />
        </div>
      </GuideBlock>

      <ConfirmDeleteModal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={() => setDeleteTarget(null)} targetLabel={deleteTarget?.title} />
    </GuideSection>
  );
}

/* =========================================================================
   6. 모달
========================================================================= */
export function ModalSection() {
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' | 'info' } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <GuideSection title="모달" description="용도별로 3개의 모달 컴포넌트가 있습니다. 셋 다 내부적으로 Modal.tsx(포커스트랩 + ESC 닫기)를 재사용합니다.">
      <GuideBlock
        title="AlertModal — 단순 알림"
        description="저장/수정 완료, 유효성 검사 실패처럼 확인 버튼 하나만 있으면 되는 알림. onConfirm에 콜백을 넘기면 확인(혹은 배경클릭/ESC로 닫아도) 눌렀을 때 실행됩니다."
        code={`const [alert, setAlert] = useState(null);

setAlert({ message: '저장되었습니다.', variant: 'success', onConfirm: goBack });

<AlertModal
  open={alert !== null}
  onClose={() => setAlert(null)}
  onConfirm={alert?.onConfirm}
  message={alert?.message ?? ''}
  variant={alert?.variant}
/>`}
      >
        <button className="btn btn_sm btn_primary" type="button" onClick={() => setAlert({ message: '저장되었습니다.', variant: 'success' })}>
          success 예시
        </button>
        <button className="btn btn_sm btn_danger" type="button" onClick={() => setAlert({ message: '오류가 발생했습니다.', variant: 'error' })}>
          error 예시
        </button>
        <button className="btn btn_sm btn_ghost" type="button" onClick={() => setAlert({ message: '안내 메시지입니다.', variant: 'info' })}>
          info 예시
        </button>
        <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
      </GuideBlock>

      <GuideBlock
        title="ConfirmDeleteModal — 삭제 확인 (+ 선택적 비밀번호)"
        description="requirePassword를 true로 주면 비밀번호 입력창이 뜨고, 빈 값으로 삭제를 시도하면 다른 폼과 동일하게 is_error + form_hint.error로 에러를 보여줍니다."
        code={`const [deleteTarget, setDeleteTarget] = useState(null);

<ConfirmDeleteModal
  open={deleteTarget !== null}
  onClose={() => setDeleteTarget(null)}
  onConfirm={(pw) => handleDeleteWithPw(pw)}
  targetLabel={deleteTarget?.title}
  requirePassword={true}
/>`}
      >
        <button className="btn btn_sm btn_danger" type="button" onClick={() => setConfirmOpen(true)}>
          삭제 모달 열기 (비밀번호 필수 예시)
        </button>
        <ConfirmDeleteModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          targetLabel="예시 항목 A"
          requirePassword
        />
      </GuideBlock>
    </GuideSection>
  );
}

/* =========================================================================
   9. 탭 (.tabs / .tab) — QaList.tsx의 "전체 문의 / 내 문의 / 자주 묻는 질문"에서 실사용 중
========================================================================= */
export function TabSection() {
  const [active, setActive] = useState('all');
  return (
    <GuideSection title="탭 (.tabs / .tab)" description="QaList.tsx에서 이미 쓰고 있는 패턴입니다. role/aria 속성을 꼭 같이 넣어주세요 — 스크린리더가 '탭 목록'으로 인식합니다. 예시 코드이니 파일 참고하여 사용해주세요">
      <GuideBlock
        title="기본 탭"
        description="tabs가 감싸고, 각 버튼에 tab(선택된 것엔 on 추가). role=tablist/tab, aria-selected는 필수입니다."
        code={`const [active, setActive] = useState('all');


<div className="tabs" role="tablist" aria-label="문의 보기 전환">
  {(['qa', 'faq'] as TabKey[]).map((tKey) => {
    const labels: Partial<Record<TabKey, string>> = { qa: '전체 문의', faq: '자주 묻는 질문' };
    return (
      <button
        key={tKey}
        type="button"
        role="tab"
        className={\`tab\${tab === tKey ? ' on' : ''}\`}
        aria-selected={tab === tKey}
        onClick={() => handleTabChange(tKey)}
      >
        {labels[tKey]}
      </button>
    );
  })}
`}
      >
        <div className="tabs" role="tablist" aria-label="예시 탭">
          {[
            { key: 'all', label: '전체' },
            { key: 'wait', label: '답변대기' },
            { key: 'done', label: '답변완료' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              className={`tab${active === t.key ? ' on' : ''}`}
              aria-selected={active === t.key}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </GuideBlock>
    </GuideSection>
  );
}

/* =========================================================================
   10.  툴팁(.tooltip_wrap)
========================================================================= */
export function AccordionPrimitiveSection() {
  const [open, setOpen] = useState(true);

  return (
    <GuideSection
      title="툴팁"
      description="툴팁은 설정값 옆에 '이게 뭔지' 짧은 설명을 붙일 때 씁니다."
    >

      <GuideBlock
        title="툴팁 — .tooltip_wrap"
        description="호버뿐 아니라 포커스(키보드 Tab)로도 열립니다 — CSS의 :hover, :focus 셀렉터를 같이 걸어뒀기 때문. aria-describedby로 트리거와 말풍선을 연결하세요."
        code={`<span className="tooltip_wrap">
  <button className="tooltip_trigger" aria-describedby="tt1"><i>i</i></button>
  <span className="tooltip_bubble" id="tt1" role="tooltip">
    설명 텍스트
  </span>
</span>`}
      >
        <p className="b_title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          감지 임계값(threshold)
          <span className="tooltip_wrap">
            <button className="tooltip_trigger" aria-describedby="guide_tt1" type="button">
              <i>i</i>
            </button>
            <span className="tooltip_bubble" id="guide_tt1" role="tooltip">
              이 값(dB)을 넘는 소음이 감지되면 이슈로 기록됩니다.
            </span>
          </span>
        </p>
      </GuideBlock>
    </GuideSection>
  );
}

/* =========================================================================
   11. 검색/필터 바 — user(Filterbar) vs dbms(AdminToolbar) 좌우 비교
========================================================================= */
export function ToolbarCompareSection() {
  const [userKeyword, setUserKeyword] = useState('');
  const [dbmsKeyword, setDbmsKeyword] = useState('');

  return (
    <GuideSection
      title="검색/필터 바 — user vs dbms"
      description="같은 역할(검색창 + 필터 셀렉트)이지만 컴포넌트가 분리되어 있습니다. user는 Filterbar, dbms는 AdminToolbar. page/pageSize/totalCount를 넘기면 Filterbar는 '전체 N건 중...' 안내문구를 자동 계산해서 왼쪽에 보여줍니다 (AdminToolbar는 이 기능이 없음)."
    >
          <GuideBlock
            title="user — Filterbar"
            description="components/ui/user/Filterbar.tsx"
            code={`  /* 필터바 설정 */
// draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  
/* 페이징 설정 */
const [totalPages, setTotalPages] = useState<number>(1);
const [totalElements, setTotalElements] = useState(0);


<Filterbar
  page={page}
  pageSize={PAGE_SIZE}
  totalCount={totalElements}
  searchValue={draft.keyword}
  onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
  searchPlaceholder={isFaq ? 'FAQ 제목·답변으로 검색' : '제목으로 검색'}
  filters={<select className="form_select">...</select>}
  extra={
    <>
      <button type="button" className="btn btn_ghost" onClick={onReset}>
        초기화
      </button>
      <button type="button" className="btn btn_primary" onClick={onSearch}>
        검색
      </button>
    </>
  }
/>`}
          >
            <div style={{ width: '100%' }}>
              <Filterbar
                searchValue={userKeyword}
                onSearchChange={setUserKeyword}
                searchPlaceholder="검색어를 입력하세요"
                page={2}
                pageSize={10}
                totalCount={42}
                filters={
                  <select className="form_select" defaultValue="">
                    <option value="">전체 유형</option>
                  </select>
                }
                extra={
                  <>
                    <button type="button" className="btn btn_ghost">
                      초기화
                    </button>
                    <button type="button" className="btn btn_primary">
                      검색
                    </button>
                  </>
                }
              />
            </div>
          </GuideBlock>

          <GuideBlock
            title="dbms — AdminToolbar"
            description="components/ui/dbms/AdminToolbar.tsx (건수 안내문구 자동계산 기능 없음)"
            code={`
/* 필터바 설정 */
// draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  
/* 페이징 설정 */
const [totalPages, setTotalPages] = useState<number>(1);
const [totalElements, setTotalElements] = useState(0);


<AdminToolbar
  searchValue={draft.keyword}
  onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
  searchPlaceholder={tab === 'qa' ? '제목으로 검색' : 'FAQ 제목·답변으로 검색'}
  filters={<select className="form_select">...</select>}
  extra={
    <>
      <button type="button" className="btn btn_ghost" onClick={onReset}>
        초기화
      </button>
      <button type="button" className="btn btn_primary" onClick={onSearch}>
        검색
      </button>
    </>
  }
/>`}
          >
            <div style={{ width: '100%' }}>
              <AdminToolbar
                searchValue={dbmsKeyword}
                onSearchChange={setDbmsKeyword}
                searchPlaceholder="검색어를 입력하세요"
                filters={
                  <select className="form_select" defaultValue="">
                    <option value="">전체 유형</option>
                  </select>
                }
                extra={
                  <>
                    <button type="button" className="btn btn_ghost">
                      초기화
                    </button>
                    <button type="button" className="btn btn_primary">
                      검색
                    </button>
                  </>
                }
              />
            </div>
          </GuideBlock>
    </GuideSection>
  );
}

/* =========================================================================
   8. 페이지네이션 — user(UserPagination) vs dbms(DbmsPagination) 좌우 비교
========================================================================= */
export function PaginationCompareSection() {
  const [userPage, setUserPage] = useState(2);
  const [dbmsPage, setDbmsPage] = useState(2);

  return (
    <GuideSection
      title="페이지네이션 — user vs dbms"
      description="정렬 방식이 의도적으로 다릅니다 — UserPagination은 버튼이 가운데 정렬, DbmsPagination은 건수 안내문구가 왼쪽·버튼이 오른쪽(space-between)입니다."
    >
      <GuideCompare
        left={
          <GuideBlock
            title="user — UserPagination"
            description="justify-content: center — 버튼이 가운데 정렬됩니다."
            code={`const { page, setPage } = usePaging();
/* 페이징 설정 */
const [totalPages, setTotalPages] = useState<number>(1);
const [totalElements, setTotalElements] = useState(0);

<UserPagination
  page={page}
  totalPages={totalPages}
  totalCount={totalElements}
  pageSize={PAGE_SIZE}
  onChange={setPage}
/>
`}
          >
            <div style={{ width: '100%' }}>
              <UserPagination page={userPage} totalPages={5} totalCount={42} pageSize={10} onChange={setUserPage} />
            </div>
          </GuideBlock>
        }
        right={
          <GuideBlock
            title="dbms — DbmsPagination"
            description="justify-content: space-between — 안내문구 왼쪽, 버튼 오른쪽 끝."
            code={`const { page, setPage } = usePaging();
/* 페이징 설정 */
const [totalPages, setTotalPages] = useState<number>(1);
const [totalElements, setTotalElements] = useState(0);

<DbmsPagination
  page={page}
  totalPages={totalPages}
  totalCount={totalElements}
  pageSize={PAGE_SIZE}
  onChange={setPage}
/>`}
          >
            <div style={{ width: '100%' }}>
              <DbmsPagination page={dbmsPage} totalPages={5} totalCount={42} pageSize={10} onChange={setDbmsPage} />
            </div>
          </GuideBlock>
        }
      />
    </GuideSection>
  );
}
