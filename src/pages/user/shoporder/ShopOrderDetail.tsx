import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, DataTable, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { ORDER_STATUS_MAP, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { PMETHOD_MAP, PSTATUS_MAP, type ShopPaymentTypes } from '../../../components/ts/ShopPayment';
import { LOG_ACTION_MAP, type ShopOrderLogTypes } from '../../../components/ts/ShopOrderLog';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';
import type { ShopType } from '../../../components/ts/ShopUser';
import { usePaging } from '../../../hooks/usePaging';

/* ---------------------------------------------------------------------
   구독 내역 상세 (/user/shoporder/:orderno) — 구독내용/결제내역/변경이력을
   탭으로 묶어서 보여주는 조회 전용 화면입니다.

   구독내용: SHOP_ORDER 단건 정보 요약
   결제내역: 이 주문에 딸린 SHOP_PAYMENT 전체 (결제/환불 포함)
   변경이력: 이 주문에 딸린 SHOP_ORDER_LOG 전체 (결제/매장연결/갱신/취소 이벤트)

   API
   GET /shop_order/{orderno}           → ShopOrderTypes
   GET /shop_payment/order/{ono}       → ShopPaymentTypes[]
   GET /shop_order_log/order/{orderno} → ShopOrderLogTypes[]
   GET /shop_plan/list, /shop/search   → 구독권 이름/매장 이름 매핑용
--------------------------------------------------------------------- */

type Tab = 'info' | 'payment' | 'history';

export default function ShopOrderDetail() {
  const { orderno } = useParams<{ orderno: string }>();
  const { goToList, navigateWithQuery } = usePaging({ basePath: '/user/shoporder' });

  const [order, setOrder] = useState<ShopOrderTypes | null>(null);
  const [payments, setPayments] = useState<ShopPaymentTypes[]>([]);
  const [logs, setLogs] = useState<ShopOrderLogTypes[]>([]);
  const [plans, setPlans] = useState<ShopPlanTypes[]>([]);
  const [shops, setShops] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');

  useEffect(() => {
    if (!orderno) return;
    setLoading(true);

    Promise.all([
      axiosInstance.get<ShopOrderTypes>(`/shop_order/${orderno}`),
      axiosInstance.get<ShopPaymentTypes[]>(`/shop_payment/order/${orderno}`),
      axiosInstance.get<ShopOrderLogTypes[]>(`/shop_order_log/order/${orderno}`),
      axiosInstance.get<ShopPlanTypes[]>('/shop_plan/list'),
    ])
      .then(([orderRes, paymentRes, logRes, planRes]) => {
        setOrder(orderRes.data);
        setPayments(paymentRes.data);
        setLogs(logRes.data);
        setPlans(planRes.data);

        // 매장 정보는 order.sno가 확정된 이후에 조회
        if (orderRes.data.sno) {
          return axiosInstance
            .get(`/shop/search`, { params: { mno: orderRes.data.mno, page: 0, size: 100 } })
            .then((res) => setShops(res.data.content ?? []));
        }
      })
      .catch((err) => console.error('구독 상세 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [orderno]);

  const planName = (pno: number) => plans.find((p) => p.no === pno)?.pname ?? `구독권 #${pno}`;
  const shopName = (sno: number | null) => (sno ? shops.find((s) => s.no === sno)?.title ?? `매장 #${sno}` : null);

  const paymentColumns: DataTableColumn<ShopPaymentTypes>[] = [
    { header: '결제일시', width: '160px', mono: true, render: (p) => p.cdate },
    {
      header: '결제수단',
      width: '100px',
      render: (p) => (p.pmethod !== null ? PMETHOD_MAP[p.pmethod].label : <span className="cell_sub">-</span>),
    },
    {
      header: '상태',
      width: '90px',
      render: (p) => <span className={`badge ${PSTATUS_MAP[p.pstatus].className}`}>{PSTATUS_MAP[p.pstatus].label}</span>,
    },
    {
      header: '금액',
      width: '120px',
      mono: true,
      render: (p) => {
        const isRefund = p.pstatus === 2;
        return (
          <span style={{ color: isRefund ? 'var(--red-200, #ffa4ac)' : undefined }}>
            {isRefund ? '-' : '+'}
            {p.price.toLocaleString('ko-KR')}원
          </span>
        );
      },
    },
  ];

  const logColumns: DataTableColumn<ShopOrderLogTypes>[] = [
    { header: '발생일시', width: '160px', mono: true, render: (l) => l.cdate },
    {
      header: '구분',
      width: '90px',
      render: (l) => <span className={`badge ${LOG_ACTION_MAP[l.action].className}`}>{LOG_ACTION_MAP[l.action].label}</span>,
    },
    {
      header: '기간 변경',
      width: '200px',
      mono: true,
      render: (l) =>
        l.beforeEdate && l.afterEdate ? (
          `${l.beforeEdate} → ${l.afterEdate}`
        ) : l.afterEdate ? (
          `~ ${l.afterEdate}`
        ) : (
          <span className="cell_sub">-</span>
        ),
    },
    {
      header: '금액',
      width: '110px',
      mono: true,
      render: (l) => (l.amount != null ? `${l.amount.toLocaleString('ko-KR')}원` : <span className="cell_sub">-</span>),
    },
    { header: '내용', render: (l) => l.memo ?? <span className="cell_sub">-</span> },
  ];

  if (loading) {
    return <p className="b_title">구독 상세 정보를 불러오는 중...</p>;
  }

  if (!order) {
    return <p className="cell_sub">구독 내역을 찾을 수 없습니다.</p>;
  }

  return (
    <section className="view active">
      <PageHeader 
        title="구독 내역 상세" 
        description='구독 내역 상세와 기타 이력들을 확인 할 수 있습니다.'
        createLabel='목록으로'
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <div className="period_tabs" style={{ marginBottom: 20 }}>
        <button type="button" className={`period_tab${tab === 'info' ? ' active' : ''}`} onClick={() => setTab('info')}>
          구독상세
        </button>
        <button type="button" className={`period_tab${tab === 'payment' ? ' active' : ''}`} onClick={() => setTab('payment')}>
          결제내역
        </button>
        <button type="button" className={`period_tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
          변경이력
        </button>
      </div>

      {tab === 'info' && (
        <div>
          {/* 상단 헤더 카드 — 구독권명 + 상태 + 핵심 스펙 */}
          <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div className="cell_sub" style={{ marginBottom: 4 }}>주문번호 : {order.orderno}</div>
                <h3 style={{ fontSize: 20, margin: 0 }}>{planName(order.pno)}</h3>
              </div>
              <span className={`badge ${ORDER_STATUS_MAP[order.status].className}`}>
                {ORDER_STATUS_MAP[order.status].label}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <div className="cell_sub">이용 기간</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{order.pmonth}개월</div>
              </div>
              <div>
                <div className="cell_sub">CCTV 대수</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{order.ccnt}대</div>
              </div>
              <div>
                <div className="cell_sub">대당 단가</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{order.bprice.toLocaleString('ko-KR')}원</div>
              </div>
            </div>
          </div>

          {/* 구독 기간 카드 */}
          <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
            <div className="cell_sub" style={{ marginBottom: 10 }}>구독 기간</div>
            {order.sdate && order.edate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono" style={{ fontSize: 15 }}>{order.sdate}</span>
                <span className="cell_sub">~</span>
                <span className="mono" style={{ fontSize: 15 }}>{order.edate}</span>
              </div>
            ) : (
              <div className="form_hint">아직 매장 연결 전이라 구독 기간이 시작되지 않았습니다.</div>
            )}
          </div>

          {/* 매장 연결 카드 */}
          <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
            <div className="cell_sub" style={{ marginBottom: 10 }}>연결된 매장</div>
            {shopName(order.sno) ? (
              <div className="mono" style={{ fontSize: 15 }}>{shopName(order.sno)}</div>
            ) : (
              <div className="form_hint">
                {order.status === 2 ? '취소된 구독입니다.' : '아직 매장이 연결되지 않았습니다.'}
              </div>
            )}
          </div>

          {/* 결제 요약 카드 */}
          <div className="card card_pad_lg">
            <div className="cell_sub" style={{ marginBottom: 10 }}>결제 요약</div>
            <div className="order_lines">
              <div className="order_line"><span>대당 단가 × 대수</span><span>{order.bprice.toLocaleString('ko-KR')}원 × {order.ccnt}대</span></div>
              <div className="order_line"><span>이용 기간</span><span>{order.pmonth}개월</span></div>
            </div>

            <div className="order_total" style={{ marginTop: 12 }}>
              <span>총 결제금액</span>
              <div className="price mono">
                {order.totalprice.toLocaleString('ko-KR')}<span>원</span>
              </div>
            </div>
            <div className="cell_sub a-r" style={{ marginTop: 10 }}>구매일시 {order.cdate}</div>
          </div>
        </div>
      )}

      {tab === 'payment' && (
        <DataTable
          columns={paymentColumns}
          data={payments}
          rowKey={(p) => p.no}
          emptyMessage="결제 내역이 없습니다."
        />
      )}

      {tab === 'history' && (
        <DataTable
          columns={logColumns}
          data={logs}
          rowKey={(l) => l.no}
          emptyMessage="변경 이력이 없습니다."
        />
      )}
    </section>
  );
}