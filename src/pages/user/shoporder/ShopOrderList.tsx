import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Filterbar,
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
  EMPTY_FILTERS,
  EMPTY_ACCOUNT,
  estimateCancelRefund,
  estimateRenewAmount,
  type RowType,
  type Filters,
  type OrderSearchResult,
  type CancelResult,
  type CancelRequest,
  type RenewRequest,
  type RenewResult,
  type RefundAccount,
} from '../../../components/ts/ShopOrder';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';
import type { ShopType } from '../../../components/ts/ShopUser';

/* ---------------------------------------------------------------------
   내가 결제한 구독권 목록 (/user/subscribe/orders)

   서버 검색+페이징 API(GET /shop_order/mno/{mno}/search)를 씁니다.
   테이블은 ShopPlanList.tsx와 동일하게 DataTable + 전체 건수 기준 내림차순
   번호(RowType.cnt) 사용. 취소/대수감소 시 환불계좌 입력 모달을 거치며,
   이때 보여주는 예상 환불액은 estimateCancelRefund/estimateRenewAmount로
   프론트에서 대략 계산한 값입니다 — 실제 확정 금액은 API 응답(CancelResult/
   RenewResult)이 기준이고, 처리 완료 후 결과 안내(AlertModal)에 정확한
   금액이 다시 표시됩니다.

   구독권 "종류"(pname)와 "이용 기간"(pmonth)을 별도 필터로 분리했습니다.
   둘 다 지정되면(등급+기간이 1개 pno로 특정됨) 서버에 pno로 바로 전달하고,
   하나만 지정되면 서버 검색 후 프론트에서 한 번 더 필터링합니다
   (SHOP_ORDER엔 pno만 있어서 서버가 pname/pmonth 단독으로는 못 거르기 때문).

   날짜 검색은 "구독시작일/구독종료일/구매일" 중 기준 하나를 고르고 기간 하나만
   입력하는 통합 방식입니다(dateType + dateFrom~dateTo).

   SDATE/EDATE는 결제 시점이 아니라 매장 연결(linkShop) 확정 시점에 서버가 채웁니다
   — 매장 미연결 주문은 sdate/edate가 null이라 "매장 연결 대기중"으로 표시합니다.

   갱신/변경 버튼 노출 (isExpiringOrExpired 기준):
   - edate 없으면(매장 미연결) 버튼 자체 없음
   - 만료(1) 또는 정상(0)이면서 7일 이하 남음 → "갱신"(extendPeriod=true)
   - 정상(0)이면서 7일 넘게 남음 → "변경"(extendPeriod=false, 남은기간 일할계산)
   - 취소(2) → 둘 다 없음

   API
   GET /shop_order/mno/{mno}/search   → OrderSearchResult
   GET /shop_plan/list                → ShopPlanTypes[] (구독권 필터/이름 매핑용)
   GET /shop/search                   → 마이 매장 목록 (매장 필터용)
   PUT /shop_order/{orderno}/cancel   → CancelRequest → CancelResult
   PUT /shop_order/{orderno}/renew    → RenewRequest → RenewResult
--------------------------------------------------------------------- */

type RefundErrors = Partial<Record<keyof RefundAccount, string>>;

const REFUND_REQUIRED_FIELDS: { field: keyof RefundAccount; label: string }[] = [
  { field: 'bankName', label: '은행명' },
  { field: 'accountNo', label: '계좌번호' },
  { field: 'accountHolder', label: '예금주명' },
];

export default function ShopOrderList() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();

  const [orders, setOrders] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<ShopPlanTypes[]>([]);
  const [shops, setShops] = useState<ShopType[]>([]);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [cancelTarget, setCancelTarget] = useState<RowType | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [renewTarget, setRenewTarget] = useState<RowType | null>(null);
  const [renewMode, setRenewMode] = useState<'same' | 'change'>('same');
  const [renewCcnt, setRenewCcnt] = useState(1);
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  // 취소 / 대수감소 환불 공통 계좌 입력 모달
  const [refundModalType, setRefundModalType] = useState<'cancel' | 'renew' | null>(null);
  const [refundAccount, setRefundAccount] = useState<RefundAccount>({ ...EMPTY_ACCOUNT });
  const [refundErrors, setRefundErrors] = useState<RefundErrors>({});

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

  const planNames = Array.from(new Set(plans.map((p) => p.pname)));

  const findPno = (pname: string, pmonth: string): number | undefined => {
    const matched = plans.filter(
      (p) => (pname === '' || p.pname === pname) && (pmonth === '' || String(p.pmonth) === pmonth)
    );
    return matched.length === 1 ? matched[0].no : undefined;
  };

  const loadList = () => {
    if (!mno) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const matchedPno = findPno(applied.pname, applied.pmonth);

    axiosInstance
      .get<OrderSearchResult>(`/shop_order/mno/${mno}/search`, {
        params: {
          word: applied.word || undefined,
          status: applied.status === '' ? undefined : Number(applied.status),
          pno: matchedPno,
          sno: applied.sno === '' ? undefined : Number(applied.sno),
          dateType: applied.dateType || undefined,
          dateFrom: applied.dateFrom || undefined,
          dateTo: applied.dateTo || undefined,
          page: page - 1,
          size: PAGE_SIZE,
        },
      })
      .then((res) => {
        let content = res.data.content;

        if (!matchedPno && applied.pname) {
          const validPnos = new Set(plans.filter((p) => p.pname === applied.pname).map((p) => p.no));
          content = content.filter((o) => validPnos.has(o.pno));
        }
        if (!matchedPno && applied.pmonth) {
          const validPnos = new Set(plans.filter((p) => String(p.pmonth) === applied.pmonth).map((p) => p.no));
          content = content.filter((o) => validPnos.has(o.pno));
        }

        const clientFiltered = !matchedPno && (applied.pname || applied.pmonth);
        const total = clientFiltered ? content.length : res.data.totalElements;

        const withCnt: RowType[] = content.map((item, idx) => ({
          ...item,
          cnt: total - ((page - 1) * PAGE_SIZE + idx),
        }));

        setOrders(withCnt);
        setTotalElements(total);
        setTotalPages(Math.max(1, res.data.totalPages));
      })
      .catch((err) => console.error('구독 내역 조회 실패:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, applied, page]);

  const planName = (pno: number) => plans.find((p) => p.no === pno)?.pname ?? `구독권 #${pno}`;
  const shopName = (sno: number | null) => (sno ? shops.find((s) => s.no === sno)?.title ?? `매장 #${sno}` : null);

  const isExpiringOrExpired = (order: RowType) => {
    if (!order.edate) return false;
    if (order.status === 1) return true;
    if (order.status !== 0) return false;
    const daysLeft = Math.ceil((new Date(order.edate).getTime() - Date.now()) / 86400000);
    return daysLeft <= 7;
  };

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const onReset = () => {
    setDraft(EMPTY_FILTERS);
    setPage(1);
    setApplied(EMPTY_FILTERS);
  };

  // ── 취소 ──────────────────────────────────────────────
  const openCancelModal = (order: RowType) => {
    setCancelTarget(order);
    setRefundAccount({ ...EMPTY_ACCOUNT });
    setRefundErrors({});
    setRefundModalType('cancel');
  };

  const submitCancel = async (account: RefundAccount) => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const payload: CancelRequest = { refundAccount: account };
      const res = await axiosInstance.put<CancelResult>(`/shop_order/${cancelTarget.orderno}/cancel`, payload);
      const { usedMonths, refundMonths, refundAmount } = res.data;

      setCancelTarget(null);
      setRefundModalType(null);
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

  // ── 갱신/변경 ──────────────────────────────────────────
  const openRenewModal = (order: RowType) => {
    setRenewTarget(order);
    setRenewMode('same');
    setRenewCcnt(order.ccnt);
  };

  const closeRenewModal = () => {
    setRenewTarget(null);
    setRenewMode('same');
  };

  const renewIsExtend = renewTarget ? isExpiringOrExpired(renewTarget) : false;

  const handleRenewConfirm = () => {
    if (!renewTarget) return;

    const isReducing = renewMode === 'change' && renewCcnt < renewTarget.ccnt;
    if (isReducing) {
      setRefundAccount({ ...EMPTY_ACCOUNT });
      setRefundErrors({});
      setRefundModalType('renew');
      return;
    }

    submitRenew();
  };

  const submitRenew = async (account?: RefundAccount) => {
    if (!renewTarget) return;

    setRenewSubmitting(true);
    try {
      const payload: RenewRequest = {
        ...(renewMode === 'change' ? { newCcnt: renewCcnt } : {}),
        extendPeriod: renewIsExtend,
        ...(account ? { refundAccount: account } : {}),
      };
      const res = await axiosInstance.put<RenewResult>(`/shop_order/${renewTarget.orderno}/renew`, payload);
      const { ccnt, edate, extraCharge, refundAmount, totalprice } = res.data;

      closeRenewModal();
      setRefundModalType(null);

      const lines = [`변경된 CCTV 대수: ${ccnt}대`, `구독 종료일: ${edate ?? '매장 연결 대기중'}`];
      if (extraCharge > 0) lines.push(`추가 결제 금액: ${extraCharge.toLocaleString('ko-KR')}원`);
      if (refundAmount > 0) lines.push(`환불 금액: ${refundAmount.toLocaleString('ko-KR')}원`);
      lines.push(`총 결제 금액(누적): ${totalprice.toLocaleString('ko-KR')}원`);

      setAlert({ message: lines.join('\n'), variant: 'success' });
      loadList();
    } catch (err) {
      console.error('갱신/변경 실패:', err);
      setAlert({ message: '처리 중 오류가 발생했습니다. 환불계좌 정보를 확인해주세요.', variant: 'error' });
    } finally {
      setRenewSubmitting(false);
    }
  };

  // ── 환불계좌 공통 입력 ─────────────────────────────────
  const onRefundAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setRefundAccount((prev) => ({ ...prev, [id]: value }));
    if (id in refundErrors) {
      setRefundErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const validateRefundAccount = () => {
    const newErrors: RefundErrors = {};
    for (const { field, label } of REFUND_REQUIRED_FIELDS) {
      if (!refundAccount[field].trim()) newErrors[field] = `${label}을(를) 입력해주세요.`;
    }
    setRefundErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRefundConfirm = () => {
    if (!validateRefundAccount()) return;
    if (refundModalType === 'cancel') {
      submitCancel(refundAccount);
    } else {
      submitRenew(refundAccount);
    }
  };

  // ── 테이블 컬럼 ────────────────────────────────────────
  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    { header: '구독권', width: '80px', render: (o) => planName(o.pno) },
    { header: '기간', width: '80px', mono: true, render: (o) => `${o.pmonth}개월` },
    { header: '대수', width: '60px', mono: true, render: (o) => `${o.ccnt}대` },
    { header: '결제금액', mono: true, render: (o) => `${o.totalprice.toLocaleString('ko-KR')}원` },
    { header: '구매일', width: '100px', mono: true, render: (o) => o.cdate.split(' ')[0] },
    {
      header: '구독기간',
      mono: true,
      render: (o) => (o.sdate && o.edate ? `${o.sdate} ~ ${o.edate}` : '매장 연결 대기중'),
    },
    {
      header: '매장',
      width: '80px',
      render: (o) =>
        shopName(o.sno) ? (
          <span className="badge success">{shopName(o.sno)}</span>
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
          {(o.status === 0 || o.status === 1) &&
            (isExpiringOrExpired(o) ? (
              <button type="button" className="btn btn_xsm btn_outline_primary" onClick={() => openRenewModal(o)}>
                갱신
              </button>
            ) : (
              <button type="button" className="btn btn_xsm btn_ghost" onClick={() => openRenewModal(o)}>
                변경
              </button>
            ))}
          {o.status === 0 && (
            <button type="button" className="btn btn_xsm btn_danger_outline" onClick={() => openCancelModal(o)}>
              취소
            </button>
          )}
          {o.sno && o.status === 2 && <span className="cell_sub">-</span>}
        </div>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader title="내가 결제한 구독권" description="지금까지 결제한 구독 내역을 검색하고 취소·갱신·변경·매장 연결을 할 수 있습니다." />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="주문번호로 검색"
        filters={
          <>
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

            <div className="date_range_group">
              <select
                className="form_select"
                value={draft.dateType}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateType: e.target.value }))}
                aria-label="날짜 검색 기준"
              >
                <option value="">날짜 검색 안 함</option>
                <option value="cdate">구매일 기준</option>
                <option value="sdate">구독 시작일 기준</option>
                <option value="edate">구독 종료일 기준</option>
              </select>
              <input
                type="date"
                className="form_input"
                value={draft.dateFrom}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
                disabled={!draft.dateType}
              />
              <span className="cell_sub">~</span>
              <input
                type="date"
                className="form_input"
                value={draft.dateTo}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
                disabled={!draft.dateType}
              />
            </div>
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
        emptyMessage="조건에 맞는 구독 내역이 없습니다."
      />

      <UserPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* 갱신/변경 옵션 선택 */}
      <Modal
        open={renewTarget !== null}
        onClose={closeRenewModal}
        titleId="renewModalTitle"
        title={renewIsExtend ? '구독 갱신' : '구독 대수 변경'}
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={closeRenewModal}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" disabled={renewSubmitting} onClick={handleRenewConfirm}>
              {renewSubmitting ? '처리 중...' : renewIsExtend ? '갱신하기' : '변경하기'}
            </button>
          </>
        }
      >
        {renewTarget && (
          <div>
            <p className="cell_sub">
              {planName(renewTarget.pno)} · {renewTarget.pmonth}개월 · 현재 {renewTarget.ccnt}대
              {!renewIsExtend && ' (종료일까지 여유가 있어 대수만 변경되고 구독 종료일은 유지됩니다)'}
            </p>

            <div className="check_row">
              <div className="form_check">
                <input
                  type="radio"
                  id="renew_same"
                  name="renewMode"
                  checked={renewMode === 'same'}
                  onChange={() => setRenewMode('same')}
                />
                <label htmlFor="renew_same" className="b_title">
                  {renewIsExtend ? `동일 조건으로 갱신 (대수 그대로 ${renewTarget.ccnt}대)` : '대수 변경 없음'}
                </label>
              </div>
              <div className="form_check">
                <input
                  type="radio"
                  id="renew_change"
                  name="renewMode"
                  checked={renewMode === 'change'}
                  onChange={() => setRenewMode('change')}
                />
                <label htmlFor="renew_change" className="b_title">
                  CCTV 대수 변경 (늘리면 추가결제, 줄이면 환불)
                </label>
              </div>
            </div>

            {renewMode === 'change' && (
              <>
                <div className="cctv_stepper">
                  <label htmlFor="renewQty">변경할 CCTV 대수</label>
                  <div className="stepper">
                    <button
                      type="button"
                      className="stepper_btn"
                      disabled={renewCcnt <= 1}
                      onClick={() => setRenewCcnt((v) => Math.max(1, v - 1))}
                      aria-label="대수 1대 줄이기"
                    >
                      –
                    </button>
                    <input
                      id="renewQty"
                      type="number"
                      className="stepper_input"
                      value={renewCcnt}
                      onChange={(e) => setRenewCcnt(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <button
                      type="button"
                      className="stepper_btn"
                      onClick={() => setRenewCcnt((v) => v + 1)}
                      aria-label="대수 1대 늘리기"
                    >
                      +
                    </button>
                  </div>
                </div>

                {renewCcnt !== renewTarget.ccnt && (() => {
                  const { extraCharge, refundAmount } = estimateRenewAmount(renewTarget, renewCcnt, renewIsExtend);
                  return (
                    <div className="order_lines">
                      {extraCharge > 0 && (
                        <div className="order_line"><span>예상 추가 결제</span><span>{extraCharge.toLocaleString('ko-KR')}원</span></div>
                      )}
                      {refundAmount > 0 && (
                        <div className="order_line"><span>예상 환불액</span><span>{refundAmount.toLocaleString('ko-KR')}원</span></div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 환불계좌 입력 (취소 / 대수감소 공통) */}
      <Modal
        open={refundModalType !== null}
        onClose={() => setRefundModalType(null)}
        titleId="refundAccountTitle"
        title={refundModalType === 'cancel' ? '구독을 취소하시겠습니까?' : '대수 감소 · 환불계좌 입력'}
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={() => setRefundModalType(null)}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" disabled={cancelling || renewSubmitting} onClick={handleRefundConfirm}>
              {cancelling || renewSubmitting ? '처리 중...' : '환불 진행'}
            </button>
          </>
        }
      >
        <div>
          <p className="b_title">
            {refundModalType === 'cancel'
              ? '구독 취소 시 해당 구독권은 재사용할 수 없습니다. 아래 내용을 확인하고 환불받으실 계좌 정보를 입력해주세요.'
              : '대수 감소로 환불이 발생합니다. 환불받으실 계좌 정보를 입력해주세요.'}
          </p>

          {refundModalType === 'cancel' && cancelTarget && (() => {
            const { usedMonths, refundMonths, refundAmount } = estimateCancelRefund(cancelTarget);
            return (
              <div className="order_lines">
                <div className="order_line"><span>구독권</span><span>{planName(cancelTarget.pno)} · {cancelTarget.pmonth}개월 · {cancelTarget.ccnt}대</span></div>
                <div className="order_line"><span>사용 개월수</span><span>{usedMonths}개월</span></div>
                <div className="order_line"><span>환불 대상 개월수</span><span>{refundMonths}개월</span></div>
                <div className="order_line"><span>예상 환불액</span><span>{refundAmount.toLocaleString('ko-KR')}원</span></div>
              </div>
            );
          })()}

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
      </Modal>

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}