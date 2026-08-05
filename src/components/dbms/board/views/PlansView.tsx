const PLANS = [
  {
    name: '스탠다드',
    price: '₩49,000',
    unit: '/월',
    features: ['CCTV 4대 연동', '5종 이상행동 감지', 'SMS 알림'],
    reco: false,
    cta: '선택하기',
    btnClass: 'btn_ghost',
  },
  {
    name: '프로',
    price: '₩129,000',
    unit: '/월',
    features: ['CCTV 10대 연동', '5종 감지 + 신뢰도 융합분석', 'SMS·이메일 알림', '이벤트 영상 90일 보관'],
    reco: true,
    cta: '선택하기',
    btnClass: 'btn_primary',
  },
  {
    name: '엔터프라이즈',
    price: '문의',
    unit: ' 별도',
    features: ['무제한 CCTV 연동', '보안업체·112·119 연동', '전담 매니저 지원'],
    reco: false,
    cta: '상담 신청',
    btnClass: 'btn_ghost',
  },
];

export default function PlansView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>구독권 안내 · 결제</h1>
        <p>매장 규모에 맞는 구독 플랜을 선택하세요.</p>
      </div>
      <div className="plan_grid">
        {PLANS.map((p) => (
          <div className={`card plan_card${p.reco ? ' reco' : ''}`} key={p.name}>
            {p.reco && <span className="reco_tag">추천</span>}
            <h3>{p.name}</h3>
            <div className="price mono">
              {p.price}
              <span>{p.unit}</span>
            </div>
            <ul>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button className={`btn btn_md ${p.btnClass}`} style={{ width: '100%', justifyContent: 'center' }}>
              {p.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
