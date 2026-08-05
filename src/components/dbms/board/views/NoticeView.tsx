const NOTICES = [
  { tag: '긴급', tone: 'badge_danger', title: '8/5(수) 02:00~04:00 서버 점검 안내', meta: '2026-08-03 · 조회 214' },
  { tag: '신규', tone: 'badge_neutral', title: "이상행동 유형에 '흡연 감지'가 추가되었습니다", meta: '2026-07-29 · 조회 152' },
  { tag: '중요', tone: 'badge_warning', title: '7월 구독 결제 관련 안내', meta: '2026-07-20 · 조회 341' },
];

export default function NoticeView() {
  return (
    <section className="view active">
      <div className="view_head">
        <div>
          <h1>공지사항</h1>
          <p>서비스 업데이트와 점검 안내를 확인하세요.</p>
        </div>
        <button className="btn btn_md btn_primary">+ 공지 작성</button>
      </div>
      <div className="card">
        {NOTICES.map((n) => (
          <div className="list_row" key={n.title}>
            <span className={`badge ${n.tone}`} style={{ marginRight: 4 }}>
              {n.tag}
            </span>
            <div className="lt">
              <div className="ti">{n.title}</div>
              <div className="me">{n.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
