import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  UserPagination,
  DataTable,
  Modal,
  AlertModal,
  type DataTableColumn,
  Filterbar,
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
  type Filters,
  EMPTY_FILTERS,
} from '../../../components/ts/ShopOrder';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';
import type { ShopType } from '../../../components/ts/ShopUser';
import { usePaging } from '../../../hooks/usePaging';
import { EMPTY_ACCOUNT, type RefundAccount } from '../../../components/ts/ShopRefund';

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
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/user/shoporder' });

  /* API 데이터 저장 */
  const [orders, setOrders] = useState<RowType[]>([]);
  const [plans, setPlans] = useState<ShopPlanTypes[]>([]);
  const [shops, setShops] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);

  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  /* 취소 */
  const [cancelTarget, setCancelTarget] = useState<RowType | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refundAccount, setRefundAccount] = useState<RefundAccount>({ ...EMPTY_ACCOUNT });
  const [refundErrors, setRefundErrors] = useState<Partial<Record<keyof RefundAccount, string>>>({});

  /* 갱신 */
  const [renewTarget, setRenewTarget] = useState<RowType | null>(null);
  const [renewing, setRenewing] = useState(false);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  /* 필터에서 사용할 구독권 종류/매장 조회 */
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

    const matchedPno = findPno(applied.pname, applied.pmonth);

    // 상태 필터가 있으면 그 상태만, 없으면 정상/만료/취소 세 개 다 조회
    const statusesToFetch = applied.status !== '' ? [Number(applied.status)] : [0, 1, 2];

    Promise.all(
      statusesToFetch.map((status) =>
        axiosInstance.get<OrderSearchResult>(`/shop_order/mno/${mno}/search`, {
          params: {
            word: applied.word || undefined,
            status,
            pno: matchedPno,
            sno: applied.sno === '' ? undefined : Number(applied.sno),
            page: 0,
            size: 1000,
          },
        })
      )
    )
      .then((responses) => {
        let merged = responses.flatMap((res) => res.data.content);

        // pname/pmonth가 pno로 특정 안 됐으면(둘 중 하나만 골랐을 때) 프론트에서 한 번 더 거름
        if (!matchedPno && applied.pname) {
          const validPnos = new Set(plans.filter((p) => p.pname === applied.pname).map((p) => p.no));
          merged = merged.filter((o) => validPnos.has(o.pno));
        }
        if (!matchedPno && applied.pmonth) {
          const validPnos = new Set(plans.filter((p) => String(p.pmonth) === applied.pmonth).map((p) => p.no));
          merged = merged.filter((o) => validPnos.has(o.pno));
        }

        merged.sort((a, b) => (a.cdate < b.cdate ? 1 : -1));

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
  }, [mno, applied, page]);

  const planName = (pno: number) => plans.find((p) => p.no === pno)?.pname ?? `구독권 #${pno}`;
  const shopName = (sno: number | null) => (sno ? shops.find((s) => s.no === sno)?.title ?? `매장 #${sno}` : null);

  // plans에서 pname만 뽑아 중복 제거 (베이직/프로/엔터프라이즈처럼 등급명 단위로 노출)
  const planNames = Array.from(new Set(plans.map((p) => p.pname)));

  // pname + pmonth 조건에 맞는 pno 찾기 (검색 요청 시 사용)
  const findPno = (pname: string, pmonth: string): number | undefined => {
    const matched = plans.filter(
      (p) => (pname === '' || p.pname === pname) && (pmonth === '' || String(p.pmonth) === pmonth)
    );
    return matched.length === 1 ? matched[0].no : undefined; // 1개로 특정될 때만 pno 확정
  };

  const canRenew = (order: RowType) => {
    if (!order.edate) return false;
    if (order.status === 1) return true;
    const daysLeft = Math.ceil((new Date(order.edate).getTime() - Date.now()) / 86400000);
    return daysLeft <= 7;
  };

  // ── 취소 ──────────────────────────────────────────────
  const openCancelModal = (order: RowType) => {
    setCancelTarget(order);
    setRefundAccount({ ...EMPTY_ACCOUNT });
    setRefundErrors({});
  };
  const closeCancelModal = () => setCancelTarget(null);

  const onRefundAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setRefundAccount((prev) => ({ ...prev, [id]: value }));
    if (id in refundErrors) {
      setRefundErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;

    // 환불 대상(예상 환불액 > 0)이면 계좌 정보 필수 검증
    if (cancelEstimate && cancelEstimate.refundAmount > 0) {
      const errors: typeof refundErrors = {};
      if (!refundAccount.bankName.trim()) errors.bankName = '은행명을 입력해주세요.';
      if (!refundAccount.accountNo.trim()) errors.accountNo = '계좌번호를 입력해주세요.';
      if (!refundAccount.accountHolder.trim()) errors.accountHolder = '예금주명을 입력해주세요.';
      if (Object.keys(errors).length > 0) {
        setRefundErrors(errors);
        return;
      }
    }

    setCancelling(true);
    try {
      const res = await axiosInstance.put<CancelResult>(`/shop_order/${cancelTarget.orderno}/cancel`, refundAccount);
      const { usedMonths, refundMonths, refundAmount } = res.data;

      setCancelTarget(null);
      setAlert({
        message: `구독이 취소되었습니다.\n사용 개월수 ${usedMonths}개월 · 환불 대상 ${refundMonths}개월\n환불 금액: ${refundAmount.toLocaleString('ko-KR')}원`,
        variant: 'success',
      });
      loadList();
    } catch (err) {
      console.error('구독 취소 실패:', err);
      setAlert({ message: '취소 처리 중 오류가 발생했습니다. 환불계좌 정보를 확인해주세요.', variant: 'error' });
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

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  // 필터 입력값(draft)/적용값(applied) 초기화. page는 여기서 안 건드림 — 필요한 곳에서 따로 처리
  const resetFilters = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  // [초기화 버튼 클릭] 모든 필터 조건을 초기화하고 1페이지로 이동
  const onReset = () => {
    resetFilters();
    setPage(1);
  };

  const cancelEstimate = cancelTarget ? estimateCancelRefund(cancelTarget) : null;

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    { header: '구독권', width:'100px', render: (o) => (
      <button type="button" className="btn_link" onClick={() => navigate(`/user/shoporder/${o.orderno}`)}>
        {planName(o.pno)}
      </button>
    ) },
    { header: '기간', width: '80px', mono: true, render: (o) => `${o.pmonth}개월` },
    { header: '대수', width: '60px', mono: true, render: (o) => `${o.ccnt}대` },
    { header: '결제금액', width: '100px', mono: true, render: (o) => `${o.totalprice.toLocaleString('ko-KR')}원` },
    { header: '구매일', width: '100px', mono: true, render: (o) => o.cdate.split(' ')[0] },
    {
      header: '구독기간',
      width: '180px',
      mono: true,
      render: (o) => 
        shopName(o.sno) ? (
          `${o.sdate} ~ ${o.edate}`
        ) : o.status === 2 ? (
          <span className="cell_sub">-</span>
        ) : (
          <span className='badge orange'>대기중</span>
        ),
    },
    {
      header: '연결된 매장',
      width: '10%',
      render: (o) =>
        shopName(o.sno) ? (
          <span className="b_title">{shopName(o.sno)}</span>
        ) : o.status === 2 ? (
          <span className="cell_sub">-</span>
        ) : (
          <button
            type="button"
            className="btn btn_xsm btn_ghost"
            onClick={() => navigate(`/user/shoporder/${o.orderno}/match`)}
          >
            매장 연결
          </button>
        ),
    },
    {
      header: '상태',
      width: '80px',
      render: (o) => (
        <span className={`badge ${ORDER_STATUS_MAP[o.status].className}`}>{ORDER_STATUS_MAP[o.status].label}</span>
      ),
    },
    {
      header: '관리',
      width: '110px',
      render: (o) => (
        <div className="actions">
          {canRenew(o) && o.status !== 2 && (
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
        description="현재 이용중이거나 갱신이 필요한 구독을 확인합니다."
        createLabel='+ 새 구독'
        onCreate={() => navigate('/shopplan')}
      />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder='주문번호로 검색'
        filters={
          <>
            <select
              className="form_select"
              value={draft.pname}
              onChange={(e) => setDraft((prev) => ({ ...prev, pname: e.target.value }))}
              aria-label="구독권 종류 필터"
            >
              <option value="">구독권 종류 전체</option>
              {planNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.pmonth}
              onChange={(e) => setDraft((prev) => ({ ...prev, pmonth: e.target.value }))}
              aria-label="이용 기간 필터"
            >
              <option value="">기간 전체</option>
              <option value="6">6개월</option>
              <option value="12">12개월</option>
            </select>
            
            <select
              className="form_select"
              value={draft.status}
              onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
              aria-label="구독 상태 필터"
            >
              <option value="">상태 전체</option>
              <option value="0">정상</option>
              <option value="1">만료됨</option>
              <option value="2">취소</option>
            </select>

            <select
              className="form_select"
              value={draft.sno}
              onChange={(e) => setDraft((prev) => ({ ...prev, sno: e.target.value }))}
              aria-label="매장 필터"
            >
              <option value="">매장 전체</option>
              {shops.map((s) => (
                <option key={s.no} value={s.no}>
                  {s.title}
                </option>
              ))}
            </select>
          </>
        }
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

            {cancelEstimate.refundAmount > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="form_group">
                  <label className="form_label" htmlFor="bankName">은행명</label>
                  <div className="form_control">
                    <input
                      id="bankName"
                      type="text"
                      className={`form_input ${refundErrors.bankName ? 'is_error' : ''}`}
                      placeholder="예: 국민은행"
                      value={refundAccount.bankName}
                      onChange={onRefundAccountChange}
                    />
                    {refundErrors.bankName && <div className="form_hint error">{refundErrors.bankName}</div>}
                  </div>
                </div>

                <div className="form_group">
                  <label className="form_label" htmlFor="accountNo">계좌번호</label>
                  <div className="form_control">
                    <input
                      id="accountNo"
                      type="text"
                      className={`form_input mono ${refundErrors.accountNo ? 'is_error' : ''}`}
                      placeholder="- 없이 숫자만 입력"
                      value={refundAccount.accountNo}
                      onChange={onRefundAccountChange}
                    />
                    {refundErrors.accountNo && <div className="form_hint error">{refundErrors.accountNo}</div>}
                  </div>
                </div>

                <div className="form_group">
                  <label className="form_label" htmlFor="accountHolder">예금주명</label>
                  <div className="form_control">
                    <input
                      id="accountHolder"
                      type="text"
                      className={`form_input ${refundErrors.accountHolder ? 'is_error' : ''}`}
                      placeholder="예: 홍길동"
                      value={refundAccount.accountHolder}
                      onChange={onRefundAccountChange}
                    />
                    {refundErrors.accountHolder && <div className="form_hint error">{refundErrors.accountHolder}</div>}
                  </div>
                </div>
              </div>
            )}
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