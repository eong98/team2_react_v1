import { useEffect, useState, useMemo } from 'react';
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
  type ShopOrderTypes,
  type ChangePreview,
  type ChangeRequest,
  type ChangeResult,
} from '../../../components/ts/ShopOrder';
import { usePaging } from '../../../hooks/usePaging';
import { EMPTY_ACCOUNT, type RefundAccount } from '../../../components/ts/ShopPayment';

export default function ShopOrderList() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();
  const { page, setPage } = usePaging({ basePath: '/user/shoporder' });

  // 상세로 이동할 때 현재 목록 page를 listPage로 실어 보냄
  const goToDetail = (ono: string) => {
    navigate(`/user/shoporder/${ono}?listPage=${page}`);
  };

  /* API 데이터 저장 */
  const [orders, setOrders] = useState<RowType[]>([]);
  // 매장번호(sno)별 activeCount를 기억하는 캐시 저장소
  const [activeCountsMap, setActiveCountsMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  /* 취소 */
  const [cancelTarget, setCancelTarget] = useState<RowType | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refundAccount, setRefundAccount] = useState<RefundAccount>({ ...EMPTY_ACCOUNT });
  const [refundErrors, setRefundErrors] = useState<Partial<Record<keyof RefundAccount, string>>>({});

  /* 갱신 */
  const [renewTarget, setRenewTarget] = useState<RowType | null>(null);
  const [renewing, setRenewing] = useState(false);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const loadList = async () => {
    if (!mno) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const res = await axiosInstance.get<OrderSearchResult>(`/shop_order/mno/${mno}/search`, {
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

      // 새로 필요한 sno 목록만 추출하여 병렬 조회
      const newSnoList = Array.from(
        new Set(
          content
            .map((item) => item.sno)
            .filter((sno): sno is number => Boolean(sno) && activeCountsMap[sno!] === undefined)
        )
      );

      const newFetchedCounts: Record<number, number> = {};

      if (newSnoList.length > 0) {
        await Promise.all(
          newSnoList.map(async (sno) => {
            try {
              const countRes = await axiosInstance.get<ShopOrderTypes[]>(`/shop_order/sno/${sno}`);
              const activeCount = countRes.data.filter((order) => order.status === 1).length;
              newFetchedCounts[sno] = activeCount;
            } catch {
              newFetchedCounts[sno] = 0;
            }
          })
        );
      }

      // 캐시 맵 갱신 (기존 + 새로 조회한 매장) - 함수형 업데이트 적용
      if (Object.keys(newFetchedCounts).length > 0) {
        setActiveCountsMap((prev) => ({ ...prev, ...newFetchedCounts }));
      }

      const mergedMap = { ...activeCountsMap, ...newFetchedCounts };

      // 목록 데이터 구성
      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
        activeCount: item.sno ? (mergedMap[item.sno] ?? 0) : 0,
      }));

      setOrders(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (error) {
      console.error('구독 내역 조회 실패:', error);
      setOrders([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, applied, page]);

  
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


  /* 플랜명 중복제거: useMemo로 최적화 */
  const plans = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return [];
    const names = orders.map((item) => item.pname).filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [orders]);



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
    const activeCount = order.sno ? (activeCountsMap[order.sno] ?? order.activeCount ?? 0) : 0;

    // 만료 상태(status = 2), 동일한 매장에 정상상태인 구독권이 있는경우 갱신 불가
    if (order.status === 2 && activeCount >= 1) return false;
    // 취소상태, 매장연결 완료 갱신 불가
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
      setActiveCountsMap({});
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
      setActiveCountsMap({});
      loadList();
    } catch (err) {
      console.error('갱신 실패:', err);
      setAlert({ message: '갱신 처리 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setRenewing(false);
    }
  };

  const cancelEstimate = cancelTarget ? estimateCancelRefund(cancelTarget) : null;

        console.log(orders)
  const columns: DataTableColumn<RowType>[] = [
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
    {
      header: '구독기간',
      width: '200px',
      mono: true,
      render: (o) => (o.sno ? `${o.sdate} ~ ${o.edate}` : <span className="cell_sub">-</span>),
    },
    {
      header: '연결매장',
      width: '200px',
      render: (o) =>
        o.sno ? (
          <span className="b_title">{o.sname}</span>
        ) : o.status === 3 ? (
          <span className="cell_sub">-</span>
        ) : (
          <button
            type="button"
            className="btn btn_xsm btn_ghost"
            onClick={() => navigate(`/user/shoporder/${o.no}/match`)}
          >
            매장 연결
          </button>
        ),
    },
    {
      header: '상태',
      width: '150px',
      render: (o) => (
        <div>
          {o.status === 0 && o.pendingCcnt != null ? (
            <>
              <span className={`badge ${ORDER_STATUS_MAP[o.status].className}`}>승인{ORDER_STATUS_MAP[o.status].label}</span>
              <div className="cell_sub" style={{ marginTop: 4, fontSize: 11 }}>
                {o.ccnt}대 → {o.pendingCcnt}대 변경 대기중
              </div>
            </>
          ): (
            <span className={`badge ${ORDER_STATUS_MAP[o.status].className}`}>{ORDER_STATUS_MAP[o.status].label}</span>
          )}
        </div>
      ),
    },
    { header: '결제금액(원)', width: '120px', mono: true, render: (o) => `${o.totalprice.toLocaleString('ko-KR')}` },
    { header: '구매일', width: '120px', mono: true, render: (o) => o.cdate.split(' ')[0] },
    {
      header: '관리',
      width: '190px',
      render: (o) => (
        <div className="actions">
          {canRenew(o) && (
            <button type="button" className="btn btn_xsm btn_ghost" onClick={() => openRenewModal(o)}>
              갱신
            </button>
          )}
          {o.status === 1 && (
            <button type="button" className="btn btn_xsm btn_outline_primary" onClick={() => openChangeModal(o)}>
              변경
            </button>
          )}
          {(o.status === 0 || o.status === 1) && (
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
        title="전체 구독 내역"
        description="전체 매장의 현재 이용중이거나 갱신이 필요한 구독을 확인합니다."
        createLabel="+ 새 구독"
        onCreate={() => navigate('/shopplan')}
      />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="매장 · 플랜 이름으로 검색"
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
        columns={columns}
        data={orders}
        rowKey={(o) => o.no}
        loading={loading}
        emptyMessage="현재 이용중인 구독이 없습니다."
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