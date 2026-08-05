import { useState } from 'react';

const MY_INQUIRIES = [
  { title: '[관제신청] 5호점 CCTV 추가 연동 문의', meta: '2026-08-01', status: '답변대기', tone: 'badge_warning' },
  { title: '[결제] 구독 자동갱신 해지 방법 문의', meta: '2026-07-18', status: '답변완료', tone: 'badge_success' },
];

const FAQS = [
  { q: 'Q. CCTV는 몇 대까지 연동할 수 있나요?', a: '구독 플랜에 따라 4대~무제한까지 연동 가능합니다' },
  { q: 'Q. 오탐지가 잦을 때 어떻게 하나요?', a: '설정 > 알림 민감도에서 유형별 감지 기준을 조정할 수 있습니다' },
];

export default function QnaView() {
  const [tab, setTab] = useState<'list' | 'faq'>('list');

  return (
    <section className="view active">
      <div className="view_head">
        <div>
          <h1>1:1 문의 · 자주 묻는 질문</h1>
          <p>문의 등록 및 FAQ를 확인할 수 있습니다. (QA 테이블: type·title·content·status·vmode)</p>
        </div>
        <button className="btn btn_md btn_primary">+ 문의 작성</button>
      </div>

      <div className="tabs" role="tablist" aria-label="문의 보기 전환">
        <button
          type="button"
          className={`tab${tab === 'list' ? ' on' : ''}`}
          role="tab"
          aria-selected={tab === 'list'}
          aria-controls="qnaList"
          onClick={() => setTab('list')}
        >
          내 문의
        </button>
        <button
          type="button"
          className={`tab${tab === 'faq' ? ' on' : ''}`}
          role="tab"
          aria-selected={tab === 'faq'}
          aria-controls="qnaFaq"
          onClick={() => setTab('faq')}
        >
          자주 묻는 질문
        </button>
      </div>

      {tab === 'list' && (
        <div id="qnaList">
          <div className="card">
            {MY_INQUIRIES.map((q) => (
              <div className="list_row" key={q.title}>
                <div className="lt">
                  <div className="ti">{q.title}</div>
                  <div className="me">{q.meta}</div>
                </div>
                <span className={`badge ${q.tone}`}>{q.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'faq' && (
        <div id="qnaFaq">
          <div className="card">
            {FAQS.map((f) => (
              <div className="list_row" key={f.q}>
                <div className="lt">
                  <div className="ti">{f.q}</div>
                  <div className="me">{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
