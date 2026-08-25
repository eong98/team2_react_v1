import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  UserPagination,
  DataTable,
  Modal,
  AlertModal,
  type DataTableColumn,
} from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import {
  ORDER_STATUS_MAP,
  PAGE_SIZE,
  estimateCancelRefund,
  type RowType,
  type OrderSearchResult,
  type CancelResult,
  type RenewResult,
} from '../../../components/ts/ShopOrder';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';
import type { ShopType } from '../../../components/ts/ShopUser';

/* ---------------------------------------------------------------------
   구독 내역 (/user/subscribe/orders) — 현재 이용중/갱신 필요한 구독만 보여주는
   "실무 처리용" 화면입니다. 정상(0)·만료(1) 상태만 조회하고, 취소된 건은
   여기 안 보입니다(취소 이력은 별도 "구독 이력" 화면에서 확인).

   검색 기능 없음(status를 0,1로 고정해서 호출), 페이징만 유지.

   갱신 버튼: edate 있고(매장 연결됨) 종료일까지 7일 이하 남았거나 이미 만료(1)일 때만 노출.
   매장 연결 버튼: 매장 미연결(sno 없음) 주문에만 노출 (취소 건이 없으므로 별도 status 체크 불필요).

   API
   GET /shop_order/mno/{mno}/search?status=0&status=1... (아래 참고: status 단일값이라
        0/1을 각각 호출해서 합치는 방식으로 구현)
   PUT /shop_order/{orderno}/cancel   → CancelResult
   PUT /shop_order/{orderno}/renew    → RenewResult (body 없음, 기간 연장 전용)
--------------------------------------------------------------------- */

export default function ShopOrderList() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();

  const [orders, setOrders] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [plans, setPlans] = useState<ShopPlanTypes[]>([]);
  const [shops, setShops] = useState<ShopType[]>([]);

  const [cancelTarget, setCancelTarget] = useState<RowType | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [renewTarget, setRenewTarget] = useState<RowType | null>(null);
  const [renewing, setRenewing] = useState(false);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!mno) return;
    axiosInstance
      .get<ShopPlanTypes[]>('/shop_plan/list')
      .then((res) => setPlans(res.data))
      .catch((err) => console.error('구독권 목록 조회 실패:', err));

    axiosInstance
      .get(`/shop/search`, { params: { mno, page: 0, size: 100 } })
      .then((res) => setShops(res.data.content ?? []))
      .catch((err) => console.error('매장 목록 조회 실패:', err));
  }, [mno]);

  const loadList = () => {
    if (!mno) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // status가 단일값만 지원되는 API라, 정상/만료 두 번 호출해서 합칩니다.
    Promise.all([
      axiosInstance.get<OrderSearchResult>(`/shop_order/mno/${mno}/search`, {
        params: { status: 0, page: 0, size: 1000 },
      }),
      axiosInstance.get<OrderSearchResult>(`/shop_order/mno/${mno}/search`, {
        params: { status: 1, page: 0, size: 1000 },
      }),
    ])
      .then(([normalRes, expiredRes]) => {
        const merged = [...normalRes.data.content, ...expiredRes.data.content].sort(
          (a, b) => (a.cdate < b.cdate ? 1 : -1)
        );

        const total = merged.length;
        const pageStart = (page - 1) * PAGE_SIZE;
        const pageItems = merged.slice(pageStart, pageStart + PAGE_SIZE);

        const withCnt: RowType[] = pageItems.map((item, idx) => ({
          ...item,
          cnt: total - (pageStart + idx),
        }));

        setOrders(withCnt);
        setTotalElements(total);
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
      })
      .catch((err) => console.error('구독 내역 조회 실패:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, page]);

  const planName = (pno: number) => plans.find((p) => p.no === pno)?.pname ?? `구독권 #${pno}`;
  const shopName = (sno: number | null) => (sno ? shops.find((s) => s.no === sno)?.title ?? `매장 #${sno}` : null);

  const canRenew = (order: RowType) => {
    if (!order.edate) return false;
    if (order.status === 1) return true;
    const daysLeft = Math.ceil((new Date(order.edate).getTime() - Date.now()) / 86400000);
    return daysLeft <= 7;
  };

  // ── 취소 ──────────────────────────────────────────────
  const openCancelModal = (order: RowType) => setCancelTarget(order);
  const closeCancelModal = () => setCancelTarget(null);

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await axiosInstance.put<CancelResult>(`/shop_order/${cancelTarget.orderno}/cancel`);
      const { usedMonths, refundMonths, refundAmount } = res.data;

      setCancelTarget(null);
      setAlert({
        message: `구독이 취소되었습니다.\n사용 개월수 ${usedMonths}개월 · 환불 대상 ${refundMonths}개월\n환불 금액: ${refundAmount.toLocaleString('ko-KR')}원`,
        variant: 'success',
      });
      loadList();
    } catch (err) {
      console.error('구독 취소 실패:', err);
      setAlert({ message: '취소 처리 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  // ── 갱신 (기간 연장 전용) ─────────────────────────────
  const openRenewModal = (order: RowType) => setRenewTarget(order);
  const closeRenewModal = () => setRenewTarget(null);

  const submitRenew = async () => {
    if (!renewTarget) return;

    setRenewing(true);
    try {
      const res = await axiosInstance.put<RenewResult>(`/shop_order/${renewTarget.orderno}/renew`);
      const { edate, totalprice } = res.data;

      closeRenewModal();
      setAlert({
        message: `구독이 갱신되었습니다.\n새 구독 종료일: ${edate}\n총 결제 금액(누적): ${totalprice.toLocaleString('ko-KR')}원`,
        variant: 'success',
      });
      loadList();
    } catch (err) {
      console.error('갱신 실패:', err);
      setAlert({ message: '갱신 처리 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setRenewing(false);
    }
  };

  const cancelEstimate = cancelTarget ? estimateCancelRefund(cancelTarget) : null;

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    { header: '구독권', width: '100px', render: (o) => planName(o.pno) },
    { header: '기간', width: '80px', mono: true, render: (o) => `${o.pmonth}개월` },
    { header: '대수', width: '60px', mono: true, render: (o) => `${o.ccnt}대` },
    { header: '결제금액', width: '100px', mono: true, render: (o) => `${o.totalprice.toLocaleString('ko-KR')}원` },
    { header: '구매일', width: '100px', mono: true, render: (o) => o.cdate.split(' ')[0] },
    {
      header: '구독기간',
      width: '180px',
      mono: true,
      render: (o) => (o.sdate && o.edate ? `${o.sdate} ~ ${o.edate}` : <span className='badge orange'>대기중</span>)
    },
    {
      header: '연결된 매장',
      width: '100px',
      render: (o) =>
        shopName(o.sno) ? (
          <span className="b_title">{shopName(o.sno)}</span>
        ) : (
          <button
            type="button"
            className="btn btn_xsm btn_outline_primary"
            onClick={() => navigate(`/user/shoporder/${o.orderno}/match`)}
          >
            매장 연결
          </button>
        ),
    },
    {
      header: '상태',
      width: '70px',
      render: (o) => (
        <span className={`badge ${ORDER_STATUS_MAP[o.status].className}`}>{ORDER_STATUS_MAP[o.status].label}</span>
      ),
    },
    {
      header: '관리',
      width: '110px',
      render: (o) => (
        <div className="actions">
          {canRenew(o) && (
            <button type="button" className="btn btn_xsm btn_outline_primary" onClick={() => openRenewModal(o)}>
              갱신
            </button>
          )}
          {o.status === 0 && (
            <button type="button" className="btn btn_xsm btn_danger_outline" onClick={() => openCancelModal(o)}>
              취소
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="구독 내역"
        description="현재 이용중이거나 갱신이 필요한 구독을 확인합니다. 지난 취소 이력은 구독 이력에서 확인할 수 있습니다."
      />

      <DataTable
        columns={columns}
        data={orders}
        rowKey={(o) => o.orderno}
        loading={loading}
        emptyMessage="현재 이용중인 구독이 없습니다."
      />

      <UserPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* 취소 확인 */}
      <Modal
        open={cancelTarget !== null}
        onClose={closeCancelModal}
        titleId="cancelConfirmTitle"
        title="구독을 취소하시겠습니까?"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={closeCancelModal}>
              닫기
            </button>
            <button type="button" className="btn btn_md btn_danger" disabled={cancelling} onClick={submitCancel}>
              {cancelling ? '처리 중...' : '구독취소'}
            </button>
          </>
        }
      >
        {cancelTarget && cancelEstimate && (
          <div>
            <p className="b_title">구독 취소 시 해당 구독권은 재사용할 수 없습니다.</p>
            <div className="order_lines">
              <div className="order_line"><span>구독권</span><span>{planName(cancelTarget.pno)} · {cancelTarget.pmonth}개월 · {cancelTarget.ccnt}대</span></div>
              <div className="order_line"><span>사용 개월수</span><span>{cancelEstimate.usedMonths}개월</span></div>
              <div className="order_line"><span>환불 대상 개월수</span><span>{cancelEstimate.refundMonths}개월</span></div>
              <div className="order_line"><span>예상 환불액</span><span>{cancelEstimate.refundAmount.toLocaleString('ko-KR')}원</span></div>
            </div>
          </div>
        )}
      </Modal>

      {/* 갱신 확인 */}
      <Modal
        open={renewTarget !== null}
        onClose={closeRenewModal}
        titleId="renewConfirmTitle"
        title="구독을 갱신하시겠습니까?"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={closeRenewModal}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" disabled={renewing} onClick={submitRenew}>
              {renewing ? '처리 중...' : '갱신하기'}
            </button>
          </>
        }
      >
        {renewTarget && (
          <div>
            <p className="b_title">
              동일 조건({renewTarget.ccnt}대, {renewTarget.pmonth}개월)으로 구독 기간이 연장됩니다.
            </p>
            <div className="order_lines">
              <div className="order_line"><span>구독권</span><span>{planName(renewTarget.pno)}</span></div>
              <div className="order_line"><span>현재 종료일</span><span>{renewTarget.edate}</span></div>
              <div className="order_line"><span>연장 개월수</span><span>{renewTarget.pmonth}개월</span></div>
            </div>
          </div>
        )}
      </Modal>

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}