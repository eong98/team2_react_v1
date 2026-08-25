import { useEffect, useState } from 'react';
import { PageHeader, Filterbar, UserPagination, DataTable, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import {
  PMETHOD_MAP,
  PSTATUS_MAP,
  PAGE_SIZE,
  EMPTY_FILTERS,
  type RowType,
  type Filters,
  type PaymentSearchResult,
} from '../../../components/ts/ShopPayment';
import { REFUND_STATUS_MAP, type ShopRefundTypes } from '../../../components/ts/ShopRefund';

/* ---------------------------------------------------------------------
   결제 내역 (/user/shoporder/payments) — SHOP_PAYMENT 기반. 결제(pstatus=0/1)와
   환불(pstatus=2, ShopOrderService.cancel() 시점에 별도 행으로 기록됨)이
   한 테이블에 섞여 있어서, 화면에서는 구분 뱃지 + 금액 부호(+/-)로 구별합니다.

   환불 건(pstatus=2)은 SHOP_REFUND에 저장된 계좌 정보 + 처리상태(대기/완료/반려)를
   같이 조회해서 금액 아래에 붙여 보여줍니다.

   결제수단(PMETHOD)은 환불 건에는 없어서(null) "-"로 표시합니다.

   검색: 결제수단별(pmethod), 결제상태별(pstatus), 기간별(dateFrom~dateTo)

   API
   GET /shop_payment/mno/{mno}/search   → PaymentSearchResult
   GET /shop_refund/order/{ono}         → ShopRefundTypes[] (환불건에 대해서만 조회)
--------------------------------------------------------------------- */

export default function ShopPaymentList() {
  const { no: mno } = GlobalStoreSession();

  const [payments, setPayments] = useState<RowType[]>([]);
  const [refunds, setRefunds] = useState<Record<string, ShopRefundTypes>>({});
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const loadList = () => {
    if (!mno) {
      setLoading(false);
      return;
    }
    setLoading(true);

    axiosInstance
      .get<PaymentSearchResult>(`/shop_payment/mno/${mno}/search`, {
        params: {
          pmethod: applied.pmethod === '' ? undefined : Number(applied.pmethod),
          pstatus: applied.pstatus === '' ? undefined : Number(applied.pstatus),
          dateFrom: applied.dateFrom || undefined,
          dateTo: applied.dateTo || undefined,
          page: page - 1,
          size: PAGE_SIZE,
        },
      })
      .then(async (res) => {
        const total = res.data.totalElements;
        const withCnt: RowType[] = res.data.content.map((item, idx) => ({
          ...item,
          cnt: total - ((page - 1) * PAGE_SIZE + idx),
        }));

        setPayments(withCnt);
        setTotalElements(total);
        setTotalPages(Math.max(1, res.data.totalPages));

        // 환불 건(pstatus=2)만 SHOP_REFUND 계좌 정보를 추가로 조회
        const refundTargets = withCnt.filter((p) => p.pstatus === 2);
        const refundResults = await Promise.all(
          refundTargets.map((p) =>
            axiosInstance
              .get<ShopRefundTypes[]>(`/shop_refund/order/${p.ono}`)
              .then((r) => r.data[0] ?? null)
              .catch(() => null)
          )
        );

        const map: Record<string, ShopRefundTypes> = {};
        refundTargets.forEach((p, idx) => {
          const refund = refundResults[idx];
          if (refund) map[p.ono] = refund;
        });
        setRefunds(map);
      })
      .catch((err) => console.error('결제 내역 조회 실패:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, applied, page]);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const onReset = () => {
    setDraft(EMPTY_FILTERS);
    setPage(1);
    setApplied(EMPTY_FILTERS);
  };

  // 요약: 결제완료(0)는 총 결제액, 취소(2)는 총 환불액 (현재 페이지 기준)
  const totalPaid = payments.filter((p) => p.pstatus === 0).reduce((sum, p) => sum + p.price, 0);
  const totalRefunded = payments.filter((p) => p.pstatus === 2).reduce((sum, p) => sum + p.price, 0);

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (p) => p.cnt },
    { header: '결제일시', width: '160px', mono: true, render: (p) => p.cdate },
    { header: '주문번호', width:'160px', render: (p) => <span className="cell_sub mono">{p.ono}</span> },
    {
      header: '결제수단',
      width: '100px',
      render: (p) => (p.pmethod !== null ? PMETHOD_MAP[p.pmethod].label : <span className="cell_sub">-</span>),
    },
    {
      header: '결제상태',
      width: '90px',
      render: (p) => (
        <span className={`badge ${PSTATUS_MAP[p.pstatus].className}`}>{PSTATUS_MAP[p.pstatus].label}</span>
      ),
    },
    {
      header: '금액',
      mono: true,
      render: (p) => {
        const isRefund = p.pstatus === 2;
        const refund = refunds[p.ono];
        return (
          <div>
            <span style={{ color: isRefund ? 'var(--red-200, #ffa4ac)' : undefined }}>
              {isRefund ? '-' : '+'}
              {p.price.toLocaleString('ko-KR')}원
            </span>
          </div>
        );
      },
    },
    {
      header: '처리상태',
      width: '100px',
      mono: true,
      render: (p) => {
        const isRefund = p.pstatus === 2;
        const refund = refunds[p.ono];
        return (
          isRefund && refund && (
            <span
              className={`badge ${REFUND_STATUS_MAP[refund.status].className}`}
              style={{ fontSize: 10, marginLeft: 4 }}
            >
              {REFUND_STATUS_MAP[refund.status].label}
            </span>
          )
        );
      },
    },
  ];

  return (
    <section className="view active">
      <PageHeader title="결제 내역" description="구독권 결제와 환불 내역, 환불계좌 처리상태를 확인합니다." />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue=""
        onSearchChange={() => {}}
        onSearchEnter={onSearch}
        filters={
          <>
            <select
              className="form_select"
              value={draft.pmethod}
              onChange={(e) => setDraft((prev) => ({ ...prev, pmethod: e.target.value }))}
              aria-label="결제수단 필터"
            >
              <option value="">결제수단 전체</option>
              <option value="0">카드</option>
              <option value="1">계좌이체</option>
              <option value="2">토스페이</option>
            </select>

            <select
              className="form_select"
              value={draft.pstatus}
              onChange={(e) => setDraft((prev) => ({ ...prev, pstatus: e.target.value }))}
              aria-label="결제상태 필터"
            >
              <option value="">상태 전체</option>
              <option value="0">결제완료</option>
              <option value="1">결제실패</option>
              <option value="2">결제취소</option>
            </select>

            <div className="date_range_group">
              <input
                type="date"
                className="form_input"
                value={draft.dateFrom}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              />
              <span className="cell_sub">~</span>
              <input
                type="date"
                className="form_input"
                value={draft.dateTo}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
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
        data={payments}
        rowKey={(p) => p.no}
        loading={loading}
        emptyMessage="결제 내역이 없습니다."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
            <span className="cell_sub">
              총 결제액{' '}
              <span className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>
                {totalPaid.toLocaleString('ko-KR')}원
              </span>
            </span>
            <span className="cell_sub">
              총 환불액{' '}
              <span className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>
                {totalRefunded.toLocaleString('ko-KR')}원
              </span>
            </span>
          </div>
        }
      />

      <UserPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
    </section>
  );
}