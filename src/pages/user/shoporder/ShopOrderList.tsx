import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Filterbar,
  UserPagination,
  DataTable,
  Modal,
  ConfirmDeleteModal,
  AlertModal,
  type DataTableColumn,
} from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import {
  ORDER_STATUS_MAP,
  type ShopOrderTypes,
  type OrderSearchResult,
  type CancelResult,
  type RenewRequest,
  type RenewResult,
} from '../../../components/ts/ShopOrder';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';
import type { ShopType } from '../../../components/ts/ShopUser';

/* ---------------------------------------------------------------------
   내가 결제한 구독권 목록 (/user/subscribe/orders)

   ⚠️ 알려진 미해결 이슈 — 다음 백엔드 수정 시 같이 처리 예정:
   "갱신"(만료 임박/만료 시)과 "변경"(대수만, 기간 연장 없음)을 버튼/문구로는
   분리했지만, 실제로는 둘 다 동일한 PUT /shop_order/{orderno}/renew를 호출하고
   있고 백엔드 renew()가 호출될 때마다 무조건 EDATE를 연장하는 구조라, "변경"을
   눌러도 실제로는 종료일이 늘어납니다. 백엔드에 기간 연장 여부를 분리하는
   플래그(예: ccntOnly)를 추가해서 renewMode에 따라 다르게 호출해야 정확해집니다.

   서버 검색+페이징 API(GET /shop_order/mno/{mno}/search)를 씁니다.
   테이블은 ShopPlanList.tsx와 동일하게 DataTable + 전체 건수 기준 내림차순
   번호(RowType.cnt) 사용. 취소 확인은 ConfirmDeleteModal, 취소 후 환불 결과·
   갱신/변경 후 결과 안내는 Modal로 보여줍니다.

   구독권 "종류"(pname)와 "이용 기간"(pmonth)을 별도 필터로 분리했습니다.
   둘 다 지정되면(등급+기간이 1개 pno로 특정됨) 서버에 pno로 바로 전달하고,
   하나만 지정되면 서버 검색 후 프론트에서 한 번 더 필터링합니다
   (SHOP_ORDER엔 pno만 있어서 서버가 pname/pmonth 단독으로는 못 거르기 때문).
   이 클라이언트 필터링이 발생하는 페이지는 totalElements도 필터링된 개수
   기준으로 재계산합니다.

   날짜 검색은 "구독시작일/구독종료일/구매일" 중 기준 하나를 고르고 기간 하나만
   입력하는 통합 방식입니다(dateType + dateFrom~dateTo).

   매장 연결 버튼: 매장 미연결(sno 없음) + 취소되지 않은(status!=2) 주문에만 노출.
   매장 연결됐다가 취소된 주문은 sno가 있어서 버튼이 자동으로 안 뜨고, 그 매장은
   백엔드 findLinkableShops에서 "만료/취소된 구독이 걸린 매장"으로 다시 노출됩니다.

   갱신/변경 버튼 노출 조건 (isExpiringOrExpired 기준):
   - 만료(status=1) 또는 정상(status=0)이면서 종료일까지 7일 이하 남음 → "갱신" 노출
   - 정상(status=0)이면서 종료일까지 7일 넘게 남음 → "변경"(대수만) 노출
   - 취소(status=2) → 둘 다 없음

   API
   GET /shop_order/mno/{mno}/search   → OrderSearchResult (word/status/pno/sno/
                                          dateType/dateFrom/dateTo/page/size)
   GET /shop_plan/list                → ShopPlanTypes[] (구독권 필터/이름 매핑용)
   GET /shop/search                   → 마이 매장 목록 (매장 필터용)
   PUT /shop_order/{orderno}/cancel   → CancelResult
   PUT /shop_order/{orderno}/renew    → RenewRequest → RenewResult
--------------------------------------------------------------------- */

const PAGE_SIZE = 10;

type RowType = ShopOrderTypes & { cnt: number };

interface Filters {
  word: string;
  status: string;
  pname: string;
  pmonth: string;
  sno: string;
  dateType: string; // '' | 'sdate' | 'edate' | 'cdate'
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  word: '',
  status: '',
  pname: '',
  pmonth: '',
  sno: '',
  dateType: '',
  dateFrom: '',
  dateTo: '',
};

export default function OrderList() {
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
  const [cancelResult, setCancelResult] = useState<CancelResult | null>(null);

  const [renewTarget, setRenewTarget] = useState<RowType | null>(null);
  const [renewMode, setRenewMode] = useState<'same' | 'change'>('same');
  const [renewCcnt, setRenewCcnt] = useState(1);
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [renewResult, setRenewResult] = useState<RenewResult | null>(null);

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

        // 전체 건수 기준 내림차순 순번 (ShopPlanList.tsx와 동일 패턴)
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

  // 만료됐거나(status=1), 정상(status=0)이면서 종료일까지 7일 이하 남은 경우만 "갱신" 노출 대상
  const isExpiringOrExpired = (order: RowType) => {
    if (order.status === 1) return true;
    if (order.status !== 0) return false;
    const daysLeft = Math.ceil((new Date(order.edate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await axiosInstance.put<CancelResult>(`/shop_order/${cancelTarget.orderno}/cancel`);
      setCancelTarget(null);
      setCancelResult(res.data);
      loadList();
    } catch (err) {
      console.error('구독 취소 실패:', err);
      setAlert({ message: '취소 처리 중 오류가 발생했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  const openRenewModal = (order: RowType) => {
    setRenewTarget(order);
    setRenewMode('same');
    setRenewCcnt(order.ccnt);
  };

  const closeRenewModal = () => {
    setRenewTarget(null);
    setRenewMode('same');
  };

  // renewTarget이 "갱신"(기간 연장) 대상인지 "변경"(대수만) 대상인지
  const renewIsExtend = renewTarget ? isExpiringOrExpired(renewTarget) : false;

  const handleRenewConfirm = async () => {
    if (!renewTarget) return;

    setRenewSubmitting(true);
    try {
      const payload: RenewRequest = renewMode === 'change' ? { newCcnt: renewCcnt } : {};
      const res = await axiosInstance.put<RenewResult>(`/shop_order/${renewTarget.orderno}/renew`, payload);
      closeRenewModal();
      setRenewResult(res.data);
      loadList();
    } catch (err) {
      console.error('갱신/변경 실패:', err);
      setAlert({ message: '처리 중 오류가 발생했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setRenewSubmitting(false);
    }
  };

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    { header: '구독권', render: (o) => planName(o.pno) },
    { header: '기간', mono: true, render: (o) => `${o.pmonth}개월` },
    { header: '대수', mono: true, render: (o) => `${o.ccnt}대` },
    { header: '결제금액', mono: true, render: (o) => `${o.totalprice.toLocaleString('ko-KR')}원` },
    { header: '구매일', mono: true, render: (o) => o.cdate.split(' ')[0] },
    { header: '구독기간', mono: true, render: (o) => `${o.sdate} ~ ${o.edate}` },
    {
      header: '매장',
      render: (o) =>
        shopName(o.sno) ? (
          <span className="badge success">{shopName(o.sno)}</span>
        ) : (
          <span className="badge info">미연결</span>
        ),
    },
    {
      header: '상태',
      render: (o) => (
        <span className={`badge ${ORDER_STATUS_MAP[o.status].className}`}>{ORDER_STATUS_MAP[o.status].label}</span>
      ),
    },
    {
      header: '관리',
      render: (o) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {!o.sno && o.status !== 2 && (
            <button
              type="button"
              className="btn btn_xsm btn_ghost"
              onClick={() => navigate(`/user/subscribe/${o.orderno}/shop-select`)}
            >
              매장 연결
            </button>
          )}

          {(o.status === 0 || o.status === 1) &&
            (isExpiringOrExpired(o) ? (
              <button type="button" className="btn btn_xsm btn_ghost" onClick={() => openRenewModal(o)}>
                갱신
              </button>
            ) : (
              <button type="button" className="btn btn_xsm btn_ghost" onClick={() => openRenewModal(o)}>
                변경
              </button>
            ))}

          {o.status === 0 && (
            <button type="button" className="btn btn_xsm btn_ghost" onClick={() => setCancelTarget(o)}>
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

      {/* 취소 확인 */}
      <ConfirmDeleteModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        targetLabel={cancelTarget ? `${planName(cancelTarget.pno)} · ${cancelTarget.orderno}` : undefined}
        loading={cancelling}
      />

      {/* 취소 후 환불 결과 안내 */}
      <Modal
        open={cancelResult !== null}
        onClose={() => setCancelResult(null)}
        titleId="cancelResultTitle"
        title="구독이 취소되었습니다"
        footer={
          <button type="button" className="btn btn_md btn_primary" onClick={() => setCancelResult(null)}>
            확인
          </button>
        }
      >
        {cancelResult && (
          <div className="order_lines" style={{ marginTop: 8 }}>
            <div className="order_line"><span>사용 개월수</span><span>{cancelResult.usedMonths}개월</span></div>
            <div className="order_line"><span>환불 대상 개월수</span><span>{cancelResult.refundMonths}개월</span></div>
            <div className="order_line"><span>환불 예정 금액</span><span>{cancelResult.refundAmount.toLocaleString('ko-KR')}원</span></div>
          </div>
        )}
      </Modal>

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
            <button
              type="button"
              className="btn btn_md btn_primary"
              disabled={renewSubmitting}
              onClick={handleRenewConfirm}
            >
              {renewSubmitting ? '처리 중...' : renewIsExtend ? '갱신하기' : '변경하기'}
            </button>
          </>
        }
      >
        {renewTarget && (
          <div style={{ marginTop: 8 }}>
            <p className="cell_sub" style={{ marginBottom: 14 }}>
              {planName(renewTarget.pno)} · {renewTarget.pmonth}개월 · 현재 {renewTarget.ccnt}대
              {!renewIsExtend && (
                <>
                  <br />
                  종료일까지 아직 여유가 있어 이번엔 대수만 변경 대상입니다. (⚠️ 지금은 백엔드가 호출 시
                  항상 기간도 같이 연장하므로, 실제로는 종료일도 함께 늘어납니다 — 수정 예정)
                </>
              )}
            </p>

            <div className="check_row" style={{ marginBottom: 16 }}>
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
                    onChange={(e) => {
                      const v = Number(e.target.value) || 1;
                      setRenewCcnt(Math.max(1, v));
                    }}
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
            )}

            {renewMode === 'change' && renewCcnt !== renewTarget.ccnt && (
              <p className="form_hint" style={{ marginTop: 10 }}>
                {renewCcnt > renewTarget.ccnt
                  ? `추가 ${renewCcnt - renewTarget.ccnt}대 × ${renewTarget.pmonth}개월분이 이번 결제에 추가로 청구됩니다.`
                  : `감소 ${renewTarget.ccnt - renewCcnt}대 × ${renewTarget.pmonth}개월분이 환불 처리됩니다.`}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* 갱신/변경 결과 안내 */}
      <Modal
        open={renewResult !== null}
        onClose={() => setRenewResult(null)}
        titleId="renewResultTitle"
        title="처리가 완료되었습니다"
        footer={
          <button type="button" className="btn btn_md btn_primary" onClick={() => setRenewResult(null)}>
            확인
          </button>
        }
      >
        {renewResult && (
          <div className="order_lines" style={{ marginTop: 8 }}>
            <div className="order_line"><span>변경된 CCTV 대수</span><span>{renewResult.ccnt}대</span></div>
            <div className="order_line"><span>구독 종료일</span><span>{renewResult.edate}</span></div>
            {renewResult.extraCharge > 0 && (
              <div className="order_line"><span>추가 결제 금액</span><span>{renewResult.extraCharge.toLocaleString('ko-KR')}원</span></div>
            )}
            {renewResult.refundAmount > 0 && (
              <div className="order_line"><span>환불 금액</span><span>{renewResult.refundAmount.toLocaleString('ko-KR')}원</span></div>
            )}
            <div className="order_line"><span>총 결제 금액(누적)</span><span>{renewResult.totalprice.toLocaleString('ko-KR')}원</span></div>
          </div>
        )}
      </Modal>

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}