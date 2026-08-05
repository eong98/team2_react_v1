const ORDERS = [
  { no: 'ORD-20260701-01', store: '본점', plan: '프로', period: '2026-07-01 ~ 2026-07-31', status: 'Y · 결제완료', tone: 'badge_success' },
  { no: 'ORD-20260701-02', store: '2호점', plan: '스탠다드', period: '2026-07-01 ~ 2026-07-31', status: 'Y · 결제완료', tone: 'badge_success' },
  { no: 'ORD-20260801-01', store: '3호점', plan: '프로', period: '2026-08-01 ~ 2026-08-31', status: 'N · 결제대기', tone: 'badge_warning' },
];

export default function OrdersView() {
  return (
    <section className="view active">
      <div className="view_head">
        <h1>구독 주문 · 결제 내역</h1>
        <p>매장별 구독 상태와 결제 기록을 확인합니다. (SHOP_ORDER: orderno·pno·sno·paystate·sdate·edate)</p>
      </div>
      <div className="table_wrap">
        <table className="table">
          <thead>
            <tr>
              <th>주문번호(orderno)</th>
              <th>매장(sno)</th>
              <th>구독권(pno)</th>
              <th>구독기간(sdate~edate)</th>
              <th>결제상태(paystate)</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr key={o.no}>
                <td className="mono">{o.no}</td>
                <td>{o.store}</td>
                <td>{o.plan}</td>
                <td className="mono">{o.period}</td>
                <td>
                  <span className={`badge ${o.tone}`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 10 }}>
        ※ 결제 상세(승인번호·카드사 등)는 SHOP_ORDER_INI_RESULT 테이블 연동 후 행 클릭 시 상세 패널로 노출 예정
      </p>
    </section>
  );
}
