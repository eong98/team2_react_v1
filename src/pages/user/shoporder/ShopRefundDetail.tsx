import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { REFUND_STATUS_MAP, type ShopRefundTypes } from '../../../components/ts/ShopRefund';
import { ORDER_STATUS_MAP, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';

/* ---------------------------------------------------------------------
   환불 상세 (/user/shoporder/refunds/:ono) — 환불계좌 1건의 전체 정보를
   보여주는 조회 전용 화면입니다. 연결된 구독 내역 요약도 같이 표시합니다.

   API
   GET /shop_refund/order/{ono} → ShopRefundTypes[]
   GET /shop_order/{ono}        → ShopOrderTypes
   GET /shop_plan/list          → 구독권 이름 매핑용
--------------------------------------------------------------------- */

export default function ShopRefundDetail() {
  const { ono } = useParams<{ ono: string }>();
  const navigate = useNavigate();

  const [refund, setRefund] = useState<ShopRefundTypes | null>(null);
  const [order, setOrder] = useState<ShopOrderTypes | null>(null);
  const [plans, setPlans] = useState<ShopPlanTypes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ono) return;
    setLoading(true);

    Promise.all([
      axiosInstance.get<ShopRefundTypes[]>(`/shop_refund/order/${ono}`),
      axiosInstance.get<ShopOrderTypes>(`/shop_order/${ono}`),
      axiosInstance.get<ShopPlanTypes[]>('/shop_plan/list'),
    ])
      .then(([refundRes, orderRes, planRes]) => {
        setRefund(refundRes.data[0] ?? null);
        setOrder(orderRes.data);
        setPlans(planRes.data);
      })
      .catch((err) => console.error('환불 상세 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [ono]);

  const planName = (pno: number) => plans.find((p) => p.no === pno)?.pname ?? `구독권 #${pno}`;

  if (loading) return <p className="b_title">환불 상세 정보를 불러오는 중...</p>;
  if (!refund) return <p className="cell_sub">환불계좌 내역을 찾을 수 없습니다.</p>;

  return (
    <section className="view active">
      <PageHeader title="환불 상세" description={`주문번호 ${refund.ono}`} />

      <div className="card card_pad_lg" style={{ maxWidth: 480, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="cell_sub" style={{ marginBottom: 4 }}>{refund.cdate}</div>
            <h3 style={{ fontSize: 20, margin: 0 }}>{refund.amount.toLocaleString('ko-KR')}원</h3>
          </div>
          <span className={`badge ${REFUND_STATUS_MAP[refund.status].className}`}>
            {REFUND_STATUS_MAP[refund.status].label}
          </span>
        </div>

        <div className="order_lines">
          <div className="order_line"><span>은행</span><span>{refund.bankName}</span></div>
          <div className="order_line"><span>계좌번호</span><span className="mono">{refund.accountNo}</span></div>
          <div className="order_line"><span>예금주</span><span>{refund.accountHolder}</span></div>
          <div className="order_line"><span>환불금액</span><span>{refund.amount.toLocaleString('ko-KR')}원</span></div>
          <div className="order_line"><span>등록일시</span><span>{refund.cdate}</span></div>
          {refund.udate && <div className="order_line"><span>처리일시</span><span>{refund.udate}</span></div>}
        </div>

        {refund.status === 0 && (
          <div className="form_hint" style={{ marginTop: 12 }}>
            아직 관리자 확인 전입니다. 처리가 완료되면 상태가 "완료"로 바뀝니다.
          </div>
        )}
      </div>

      {order && (
        <div className="card card_pad_lg" style={{ maxWidth: 480, marginBottom: 16 }}>
          <div className="cell_sub" style={{ marginBottom: 10 }}>연결된 구독</div>
          <div className="order_lines">
            <div className="order_line"><span>구독권</span><span>{planName(order.pno)}</span></div>
            <div className="order_line"><span>이용 기간</span><span>{order.pmonth}개월 · {order.ccnt}대</span></div>
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