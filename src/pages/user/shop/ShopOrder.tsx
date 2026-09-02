import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Filterbar, UserPagination, DataTable, type DataTableColumn, Modal, AlertModal } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { EMPTY_FILTERS, estimateCancelRefund, getDaysFromStart, ORDER_STATUS_MAP, PAGE_SIZE, type CancelResult, type ChangePreview, type ChangeRequest, type ChangeResult, type Filters, type OrderSearchResult, type RenewResult, type RowType, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { GlobalCurrentShop } from '../../../store/UserStore';
import { usePaging } from '../../../hooks/usePaging';
import { EMPTY_ACCOUNT, type RefundAccount } from '../../../components/ts/ShopPayment';

/* ---------------------------------------------------------------------
   매장별 구독 내역 (/user/shop/:sno/orders) — 회원+매장 기준 단일 검색 API를
   두 번 호출해서 상단(정상 구독 1건, status=1 고정)과 하단(검색+페이징,
   status 필터는 사용자가 선택)으로 나눠 보여줍니다.

   API
   GET /shop_order/mno/sno/&status=1&page=0&size=1        → 상단(정상 구독)
   GET /shop_order/mno/sno/&word=&status=&...&page=&size= → 하단(검색+페이징, 상태 필터는 만료/취소 위주로 쓰되 전체도 가능)
--------------------------------------------------------------------- */


export default function ShopOrderBySno() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();
  const sno = GlobalCurrentShop((state) => state.no);
  const shopTitle = GlobalCurrentShop((state) => state.title);
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/user/order' });

  
  // 상세로 이동할 때 현재 목록 page를 listPage로 실어 보냄
  const goToDetail = (ono: string) => {
    navigate(`/user/shoporder/${ono}?listPage=${page}`);
  };

  const [active, setActive] = useState<ShopOrderTypes | null>(null);
  const [orders, setOrders] = useState<RowType[]>([]);

  const [activeLoading, setActiveLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  
  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadActive = async () => {
    if (!sno && !mno) return;

    setActiveLoading(true);

    try {
      const res = await axiosInstance.get<OrderSearchResult>(`/shop_order/${mno}/${sno}`, {
        params: {status: 1},
      });

      setActive(res.data.content[0] ?? null)
    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
      setActive(null);
    } finally {
      setActiveLoading(false);
    }
  };

  const loadList = async () => {
    if (!sno && !mno) return;

    setLoading(true);

    try {
      const res = await axiosInstance.get<OrderSearchResult>(`/shop_order/${mno}/${sno}`, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.word.trim() || undefined,
          status: applied.status === '' ? undefined : Number(applied.status),
          pmonth: applied.pmonth === '' ? undefined : Number(applied.pmonth),
          pname: applied.pname === '' ? undefined : applied.pname,
          dateFrom: applied.dateFrom || undefined,
          dateTo: applied.dateTo || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setOrders(withCnt)
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
      setOrders([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  
  /* 플랜명 중복제거: useMemo로 최적화 */
  const plans = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return [];
    const names = orders.map((item) => item.pname).filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [orders]);


  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sno, mno, applied, page]);

  useEffect(() => {
    loadActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sno, mno]);


  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const resetFilters = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  const onReset = () => {
    resetFilters();
    setPage(1);
  };

  
  /* 취소 */
  const [cancelTarget, setCancelTarget] = useState<RowType | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refundAccount, setRefundAccount] = useState<RefundAccount>({ ...EMPTY_ACCOUNT });
  const [refundErrors, setRefundErrors] = useState<Partial<Record<keyof RefundAccount, string>>>({});

  /* 갱신 */
  const [renewTarget, setRenewTarget] = useState<RowType | null>(null);
  const [renewing, setRenewing] = useState(false);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  /**
   *
   * 구독권 갱신/변경/취소 로직
   * 
   */

  // ── 변경 ──────────────────────────────────────────────
  const [changeTarget, setChangeTarget] = useState<ShopOrderTypes | null>(null);
  const [changePmonth, setChangePmonth] = useState<number>(6);
  const [changeCcnt, setChangeCcnt] = useState<number>(1);
  const [changePreview, setChangePreview] = useState<ChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [changeSubmitting, setChangeSubmitting] = useState(false);
  

  // "변경" 버튼 클릭 — 단건 조회로 minCcnt/maxCcnt까지 포함된 최신 정보를 받아옴
  const openChangeModal = async (order: RowType) => {
    try {
      const res = await axiosInstance.get<ShopOrderTypes>(`/shop_order/${order.no}`);
      setChangeTarget(res.data);
      setChangePmonth(res.data.pmonth);
      setChangeCcnt(res.data.ccnt);
      setChangePreview(null);
    } catch (err) {
      console.error('구독 상세 조회 실패:', err);
      setAlert({ message: '구독 정보를 불러오지 못했습니다.', variant: 'error' });
    }
  };

  const closeChangeModal = () => {
    setChangeTarget(null);
    setChangePreview(null);
  };

  // 기간/대수를 건드리면 이전 미리보기 결과는 무효화 — "예상액 확인"을 다시 눌러야 함
  const onChangePmonth = (v: number) => {
    setChangePmonth(v);
    setChangePreview(null);
  };

  const onChangeCcnt = (v: number) => {
    if (!changeTarget) return;
    const min = changeTarget.minCcnt ?? 1;
    const max = changeTarget.maxCcnt ?? 999;
    setChangeCcnt(Math.min(max, Math.max(min, v)));
    setChangePreview(null);
  };

  // "예상액 확인" 버튼 클릭 시에만 미리보기 API 호출 (실시간 자동조회 안 함)
  const handleCheckPreview = () => {
    if (!changeTarget) return;
    setPreviewLoading(true);
    const request: ChangeRequest = { pmonth: changePmonth, ccnt: changeCcnt };

    axiosInstance
      .post<ChangePreview>(`/shop_order/${changeTarget.no}/change/preview`, request)
      .then((res) => setChangePreview(res.data))
      .catch((err) => {
        console.error('변경 미리보기 실패:', err);
        setChangePreview(null);
        setAlert({ message: '해당 조건에 맞는 구독권을 찾을 수 없습니다.', variant: 'error' });
      })
      .finally(() => setPreviewLoading(false));
  };

  // "변경 신청" 최종 확정
  const submitChange = async () => {
    if (!changeTarget || !changePreview) return;
    setChangeSubmitting(true);
    try {
      const request: ChangeRequest = { pmonth: changePmonth, ccnt: changeCcnt };
      const res = await axiosInstance.put<ChangeResult>(`/shop_order/${changeTarget.no}/change`, request);

      closeChangeModal();
      setAlert({
        message: res.data.pending
          ? '구독권 변경이 신청되었습니다.\nCCTV 대수 변경은 관리자 확인 후 최종 반영됩니다.'
          : '구독권이 변경되었습니다.',
        variant: 'success',
      });
      loadList();
    } catch (err) {
      console.error('구독권 변경 신청 실패:', err);
      setAlert({ message: '변경 신청 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setChangeSubmitting(false);
    }
  };



  // 갱신 버튼 노출 검사 함수
  const canRenew = (order: RowType) => {
    if (!order.edate) return false;

    // 해당 매장의 정상(status=1) 구독 개수
    // const activeCount = order.sno ? (activeCountsMap[order.sno] ?? order.activeCount ?? 0) : 0;

    // 만료 상태(status=2)인데, 동일 매장에 이미 정상(1) 구독권이 있으면 갱신 불가
    // if (order.status === 2 && activeCount >= 1) return false;
    // 취소(status=3) 상태는 갱신 불가
    if (order.status === 3) return false;

    // 만료 7일 전 체크
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
      const res = await axiosInstance.put<CancelResult>(`/shop_order/${cancelTarget.no}/cancel`, refundAccount);
      const { usedMonths, refundMonths, refundAmount } = res.data;

      setCancelTarget(null);
      setAlert({
        message: `구독이 취소되었습니다.\n사용 개월수 ${usedMonths}개월 · 환불 대상 ${refundMonths}개월\n환불 금액: ${refundAmount.toLocaleString('ko-KR')}원`,
        variant: 'success',
      });
      // 데이터 재요청 시 매장 개수도 최신화하기 위해 초기화 후 재호출
      // setActiveCountsMap({});
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
      const res = await axiosInstance.put<RenewResult>(`/shop_order/${renewTarget.no}/renew`);
      const { edate, totalprice } = res.data;

      closeRenewModal();
      setAlert({
        message: `구독이 갱신되었습니다.\n새 구독 종료일: ${edate}\n총 결제 금액(누적): ${totalprice.toLocaleString('ko-KR')}원`,
        variant: 'success',
      });
      // setActiveCountsMap({});
      loadList();
    } catch (err) {
      console.error('갱신 실패:', err);
      setAlert({ message: '갱신 처리 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setRenewing(false);
    }
  };

  const cancelEstimate = cancelTarget ? estimateCancelRefund(cancelTarget) : null;

  const ordersColumns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    {
      header: '구독권',
      width: '100px',
      render: (o) => (
        <button type="button" className="btn_link" onClick={() => goToDetail(o.no)}>
          {o.pname}
        </button>
      ),
    },
    { header: '기간', width: '80px', mono: true, render: (o) => `${o.pmonth}개월` },
    { header: '대수', width: '60px', mono: true, render: (o) => `${o.ccnt}대` },
    { header: '결제금액', width: '110px', mono: true, render: (o) => `${o.totalprice.toLocaleString('ko-KR')}원` },
    {
      header: '구독기간',
      width: '180px',
      mono: true,
      render: (o) => (o.sdate && o.edate ? `${o.sdate} ~ ${o.edate}` : <span className="cell_sub">-</span>),
    },
    {
      header: '상태',
      width: '90px',
      render: (o) => (
        <span className={`badge ${ORDER_STATUS_MAP[o.status].className}`}>{ORDER_STATUS_MAP[o.status].label}</span>
      ),
    },
  ];

  if (!sno) {
    return (
      <section className="view active">
        <PageHeader title="구독 내역" description="매장을 선택하면 해당 매장에 연결된 현재 구독과 지난 이력을 확인할 수 있습니다." />
        <div
          className="card card_pad_lg"
        >
          <div className='no_data'>
            <p className="b_title">먼저 확인할 매장을 선택해주세요.</p>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
              매장 선택하러 가기
            </button>
          </div>
        </div>
      </section>
    );
  }
console.log(active)
  return (
    <section className="view active">
      <PageHeader 
        title="구독 내역" 
        description={`${shopTitle}에 연결된 현재 구독과 지난 이력을 확인합니다.`} 
      />

      {activeLoading ? (
        <p className="b_title">불러오는 중...</p>
      ) : active ? (
        <>
        {active.pendingCcnt && (
          <div className='alert_mode'>
            <div className="alert_banner">
              <div className="aicon">!</div>
              <div className="atext">
                <div className="t1">관리자 승인 대기 중</div>
                <div className="t2">승인 대기 중엔 구독권을 취소/변경 할 수 없습니다.</div>
              </div>
              <button type='button' className="abtn">자세히 보기</button>
            </div>
          </div>
        )}

        <div className='grid_2' style={{marginTop: 24}}>
          <div className="card card_pad_lg" style={{ marginBottom: 24 }}>
            <div className='flex top both'>
              <div>
                <div className="cell_sub" style={{ marginBottom: 4 }}>현재 이용중인 구독권</div>
                <p className='title' style={{margin:0}}>{active.pname}</p>
                <p className='b_title' style={{margin:0}}>{active.no}</p>
              </div>
              
              <span className={`title md badge danger`} style={{borderRadius: 4}}>
                구독 {getDaysFromStart(active.sdate || '')} 일째
              </span>
            </div>

            <div className='flex center both' style={{marginTop:8 }}>
              <div className="cell_sub">구독 상태</div>
              <span className={`badge ${ORDER_STATUS_MAP[active.status].className}`}>
                {ORDER_STATUS_MAP[active.status].label}
              </span>
            </div>

            
            <div className='flex center both' style={{borderTop:'1px solid var(--border)', paddingTop:20, marginTop:20 }}>
              <div className="cell_sub" style={{ margin: 0 }}>CCTV 대수</div>
              <div className='b_title lg' style={{margin:0}}>{active.pendingCcnt ? '변경대기' : `${active.ccnt}대`}</div>
            </div>

            <div className='flex center both' style={{marginTop:4 }}>
              <div className="cell_sub" style={{ margin: 0 }}>구독기간</div>
              <p className='b_title lg mono' style={{margin:0}}>{active.sdate} ~ {active.edate} ({active.pmonth}개월)</p>
            </div>

          </div>

          <div className="card card_pad_lg" style={{ marginBottom: 24 }}>
            <div className='flex top both'>
              <div>
                <p className='title' style={{margin:0}}></p>
              </div>
            </div>

          </div>
        </div>

        <div className="card card_pad_lg" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div className="cell_sub" style={{ marginBottom: 4 }}>현재 이용중인 구독권</div>
              <h3 style={{ fontSize: 20, margin: 0 }}>{active.pname}</h3>
            </div>
            <span className={`badge ${ORDER_STATUS_MAP[active.status].className}`}>
              {ORDER_STATUS_MAP[active.status].label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
            </div>
            <div>
              <div className="cell_sub">이용 기간</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{active.pmonth}개월</div>
            </div>
            <div>
              <div className="cell_sub">CCTV 대수</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{active.ccnt}대</div>
            </div>
            <div>
              <div className="cell_sub">구독 종료일</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{active.edate}</div>
            </div>
          </div>
        </div>
        </>
      ) : (
        <div className="card card_pad_lg" style={{ marginBottom: 32, textAlign: 'center' }}>
          <div className='no_data' style={{padding: 0}}>
            <p className="b_title">연결된 구독권이 없습니다.</p>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigateWithQuery(`${sno}/match`)}>
              구독권 연결
            </button>

          </div>
        </div>
      )}

      <h3 className="title md" style={{ marginBottom: 10 }}>지난 구독 이력</h3>

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        filters={
          <>
            <select
              className="form_select"
              value={draft.pname}
              onChange={(e) => setDraft((prev) => ({ ...prev, pname: e.target.value }))}
              aria-label="구독권 종류 필터"
            >
              <option value="">구독권 전체</option>
              {plans.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.pmonth}
              onChange={(e) => setDraft((prev) => ({ ...prev, pmonth: e.target.value }))}
              aria-label="구독기간 필터"
            >
              <option value="">구독기간 전체</option>
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
              {Object.entries(ORDER_STATUS_MAP).map(([type, { label }]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="구매일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="구매일 종료"
            />
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
        columns={ordersColumns}
        data={orders}
        rowKey={(o) => o.no}
        loading={loading}
        emptyMessage="지난 구독 이력이 없습니다."
      />
      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* 취소 확인 Modal */}
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
              <div className="order_line">
                <span>구독권</span>
                <span>
                  {cancelTarget.pname} · {cancelTarget.pmonth}개월 · {cancelTarget.ccnt}대
                </span>
              </div>
              <div className="order_line">
                <span>사용 개월수</span>
                <span>{cancelEstimate.usedMonths}개월</span>
              </div>
              <div className="order_line">
                <span>환불 대상 개월수</span>
                <span>{cancelEstimate.refundMonths}개월</span>
              </div>
              <div className="order_line">
                <span>예상 환불액</span>
                <span>{cancelEstimate.refundAmount.toLocaleString('ko-KR')}원</span>
              </div>
            </div>

            {cancelEstimate.refundAmount > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="form_group">
                  <label className="form_label" htmlFor="bankName">
                    은행명
                  </label>
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
                  <label className="form_label" htmlFor="accountNo">
                    계좌번호
                  </label>
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
                  <label className="form_label" htmlFor="accountHolder">
                    예금주명
                  </label>
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

      {/* 갱신 확인 Modal */}
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
              <div className="order_line">
                <span>구독권</span>
                <span>{renewTarget.pname}</span>
              </div>
              <div className="order_line">
                <span>현재 종료일</span>
                <span>{renewTarget.edate}</span>
              </div>
              <div className="order_line">
                <span>연장 개월수</span>
                <span>{renewTarget.pmonth}개월</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 변경 신청 Modal */}
      <Modal
        open={changeTarget !== null}
        onClose={closeChangeModal}
        titleId="changeModalTitle"
        title="구독권 변경"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={closeChangeModal}>
              취소
            </button>
            <button
              type="button"
              className="btn btn_md btn_primary"
              disabled={changeSubmitting || !changePreview}
              onClick={submitChange}
            >
              {changeSubmitting ? '처리 중...' : '변경 신청'}
            </button>
          </>
        }
      >
        {changeTarget && (
          <div>
            <p className="cell_sub" style={{ marginBottom: 16 }}>
              현재: {changeTarget.pname} · {changeTarget.pmonth}개월 · {changeTarget.ccnt}대
            </p>

            <div className="form_group">
              <label className="form_label" htmlFor="changePmonth">이용 기간</label>
              <div className="form_control">
                <select
                  id="changePmonth"
                  className="form_select"
                  value={changePmonth}
                  onChange={(e) => onChangePmonth(Number(e.target.value))}
                >
                  <option value={6}>6개월</option>
                  <option value={12}>12개월</option>
                </select>
              </div>
            </div>

            <div className="cctv_stepper">
              <label htmlFor="changeCcnt">CCTV 대수</label>
              
              <div className="stepper">
                <button
                  type="button"
                  className="stepper_btn"
                  disabled={changeCcnt <= (changeTarget.minCcnt ?? 1)}
                  onClick={() => onChangeCcnt(changeCcnt - 1)}
                  aria-label="대수 1대 줄이기"
                >
                  –
                </button>
                <input
                  id="changeCcnt"
                  type="number"
                  className="stepper_input"
                  value={changeCcnt}
                  onChange={(e) => onChangeCcnt(Number(e.target.value) || (changeTarget.minCcnt ?? 1))}
                />
                <button
                  type="button"
                  className="stepper_btn"
                  disabled={changeCcnt >= (changeTarget.maxCcnt ?? 999)}
                  onClick={() => onChangeCcnt(changeCcnt + 1)}
                  aria-label="대수 1대 늘리기"
                >
                  +
                </button>
              </div>
            </div>
            <p className="cell_sub">
              최소 {changeTarget.minCcnt}대 ~ 최대 {changeTarget.maxCcnt}대까지 선택 가능합니다.
            </p>

            <button
              type="button"
              className="btn btn_md btn_outline_primary"
              style={{ width: '100%', marginTop: 12 }}
              disabled={previewLoading}
              onClick={handleCheckPreview}
            >
              {previewLoading ? '계산 중...' : '예상액 확인'}
            </button>

            {changePreview && (
              <div className="order_lines" style={{ marginTop: 16 }}>
                <div className="order_line"><span>적용될 구독권</span><span>{changePreview.pname}</span></div>
                <div className="order_line"><span>구독 종료일</span><span>{changePreview.edate}</span></div>
                {changePreview.extraCharge > 0 && (
                  <div className="order_line"><span>추가 결제 금액</span><span>{changePreview.extraCharge.toLocaleString('ko-KR')}원</span></div>
                )}
                {changePreview.refundAmount > 0 && (
                  <div className="order_line"><span>환불 금액</span><span>{changePreview.refundAmount.toLocaleString('ko-KR')}원</span></div>
                )}
              </div>
            )}

            {changePreview?.requiresApproval && (
              <p className="form_hint" style={{ marginTop: 10 }}>
                CCTV 대수가 바뀌는 변경이라, 신청 후 관리자가 매장 설치 상태를 확인하고 승인해야 최종 반영됩니다. 승인 전까지는 기존 조건으로 계속 이용하실 수 있습니다.
              </p>
            )}
          </div>
        )}
      </Modal>

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}