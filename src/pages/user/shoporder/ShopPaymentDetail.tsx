import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { PMETHOD_MAP, PSTATUS_MAP, type ShopPaymentTypes } from '../../../components/ts/ShopPayment';
import { REFUND_STATUS_MAP, type ShopRefundTypes } from '../../../components/ts/ShopRefund';
import { ORDER_STATUS_MAP, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';

/* ---------------------------------------------------------------------
   결제 상세 (/user/shoporder/payments/:no) — 결제 1건의 전체 정보를 보여주는
   조회 전용 화면입니다. 결제 건에 연결된 구독 내역 요약도 같이 표시합니다.
   해당 결제가 환불(pstatus=2)이면 SHOP_REFUND 정보도 같이 조회해서 보여줍니다.

   ※ GET /shop_payment/{no} 단건 조회 API가 아직 없다면, 목록 API에서 no로
   찾아오는 방식으로 임시 구현했습니다 — 단건 조회 API가 생기면 교체 필요.

   API
   GET /shop_payment/order/{ono} → ShopPaymentTypes[] (결제번호로 특정 후 필터링)
   GET /shop_refund/order/{ono}  → ShopRefundTypes[]
   GET /shop_order/{ono}         → ShopOrderTypes
   GET /shop_plan/list           → 구독권 이름 매핑용
--------------------------------------------------------------------- */

export default function ShopPaymentDetail() {
  const { no, ono } = useParams<{ no: string; ono: string }>();
  const navigate = useNavigate();

  const [payment, setPayment] = useState<ShopPaymentTypes | null>(null);
  const [refund, setRefund] = useState<ShopRefundTypes | null>(null);
  const [order, setOrder] = useState<ShopOrderTypes | null>(null);
  const [plans, setPlans] = useState<ShopPlanTypes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ono || !no) return;
    setLoading(true);

    Promise.all([
      axiosInstance.get<ShopPaymentTypes[]>(`/shop_payment/order/${ono}`),
      axiosInstance.get<ShopOrderTypes>(`/shop_order/${ono}`),
      axiosInstance.get<ShopPlanTypes[]>('/shop_plan/list'),
    ])
      .then(([paymentRes, orderRes, planRes]) => {
        const found = paymentRes.data.find((p) => String(p.no) === no) ?? null;
        setPayment(found);
        setOrder(orderRes.data);
        setPlans(planRes.data);

        if (found?.pstatus === 2) {
          return axiosInstance.get<ShopRefundTypes[]>(`/shop_refund/order/${ono}`).then((r) => {
            setRefund(r.data.find((rf) => rf.paymentno === found.no) ?? r.data[0] ?? null);
          });
        }
      })
      .catch((err) => console.error('결제 상세 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [ono, no]);

  const planName = (pno: number) => plans.find((p) => p.no === pno)?.pname ?? `구독권 #${pno}`;

  if (loading) return <p className="b_title">결제 상세 정보를 불러오는 중...</p>;
  if (!payment) return <p className="cell_sub">결제 내역을 찾을 수 없습니다.</p>;

  return (
    <section className="view active">
      <PageHeader title="결제 상세" description={`결제번호 #${payment.no}`} />

      <div className="card card_pad_lg" style={{ maxWidth: 480, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="cell_sub" style={{ marginBottom: 4 }}>{payment.cdate}</div>
            <h3 style={{ fontSize: 20, margin: 0 }}>
              {payment.price.toLocaleString('ko-KR')}원
            </h3>
          </div>
          <span className={`badge ${PSTATUS_MAP[payment.pstatus].className}`}>
            {PSTATUS_MAP[payment.pstatus].label}
          </span>
        </div>

        <div className="order_lines">
          <div className="order_line">
            <span>결제수단</span>
            <span>{payment.pmethod !== null ? PMETHOD_MAP[payment.pmethod].label : '-'}</span>
          </div>
          <div className="order_line"><span>결제금액</span><span>{payment.price.toLocaleString('ko-KR')}원</span></div>
          {payment.udate && <div className="order_line"><span>상태 변경일시</span><span>{payment.udate}</span></div>}
        </div>
      </div>

      {refund && (
        <div className="card card_pad_lg" style={{ maxWidth: 480, marginBottom: 16 }}>
          <div className="cell_sub" style={{ marginBottom: 10 }}>환불계좌</div>
          <div className="order_lines">
            <div className="order_line"><span>은행</span><span>{refund.bankName}</span></div>
            <div className="order_line"><span>계좌번호</span><span className="mono">{refund.accountNo}</span></div>
            <div className="order_line"><span>예금주</span><span>{refund.accountHolder}</span></div>
            <div className="order_line"><span>환불금액</span><span>{refund.amount.toLocaleString('ko-KR')}원</span></div>
            <div className="order_line">
              <span>처리상태</span>
              <span className={`badge ${REFUND_STATUS_MAP[refund.status].className}`}>
                {REFUND_STATUS_MAP[refund.status].label}
              </span>
            </div>
            <div className="order_line"><span>등록일시</span><span>{refund.cdate}</span></div>
            {refund.udate && <div className="order_line"><span>처리일시</span><span>{refund.udate}</span></div>}
          </div>
        </div>
      )}

      {order && (
        <div className="card card_pad_lg" style={{ maxWidth: 480, marginBottom: 16 }}>
          <div className="cell_sub" style={{ marginBottom: 10 }}>연결된 구독</div>
          <div className="order_lines">
            <div className="order_line"><span>구독권</span><span>{planName(order.pno)}</span></div>
            <div className="order_line"><span>주문번호</span><span className="mono">{order.orderno}</span></div>
            <div className="order_line">
              <span>구독상태</span>
              <span className={`badge ${ORDER_STATUS_MAP[order.status].className}`}>{ORDER_STATUS_MAP[order.status].label}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn_sm btn_ghost"
            style={{ marginTop: 12 }}
            onClick={() => navigate(`/user/shoporder/${order.orderno}`)}
          >
            구독 상세 보기
          </button>
        </div>
      )}

      <button type="button" className="btn btn_md btn_ghost" onClick={() => navigate(-1)}>
        목록으로
      </button>
    </section>
  );
}