const INQUIRIES = [
  { title: '[관제신청] 5호점 CCTV 추가 연동 문의', meta: '2026-08-01 · 접수유형: 관제신청', status: '답변대기', tone: 'badge_warning' },
  { title: '[영상요청] 7/22 21시 CCTV 03 영상 요청드립니다', meta: '2026-07-23 · 접수유형: 영상요청', status: '답변완료', tone: 'badge_success' },
  { title: '[장비장애] CAM 05 화면 끊김 현상', meta: '2026-07-20 · 접수유형: 장비장애', status: '답변완료', tone: 'badge_success' },
];

export default function VoiceListView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>고객의 소리 · 문의 내역</h1>
        <p>등록한 문의와 답변 상태를 확인할 수 있습니다. (shop_qna·shop_qna_list·shop_qna_cate 테이블 기준)</p>
      </div>
      <div className="stat_mini">
        <div className="card">
          <div className="lab">전체 문의</div>
          <div className="val">12건</div>
        </div>
        <div className="card">
          <div className="lab">답변대기</div>
          <div className="val" style={{ color: 'var(--amber-400)' }}>
            2건
          </div>
        </div>
        <div className="card">
          <div className="lab">답변완료</div>
          <div className="val" style={{ color: 'var(--green-400)' }}>
            10건
          </div>
        </div>
      </div>
      <div className="card">
        {INQUIRIES.map((q) => (
          <button type="button" className="list_row" key={q.title} onClick={() => alert('상세 화면 예시')}>
            <div className="lt">
              <div className="ti">{q.title}</div>
              <div className="me">{q.meta}</div>
            </div>
            <span className={`badge ${q.tone}`}>{q.status}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
