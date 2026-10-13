import { useEffect, useState } from 'react';
import { PageHeader, DataTable, type DataTableColumn, DbmsPagination, AdminToolbar } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import {
  ORDER_STATUS_MAP,
  PAGE_SIZE,
  EMPTY_FILTERS,
  isExpired,
  type RowType,
  type OrderSearchResult,
  type Filters,
} from '../../../components/ts/ShopOrder';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { usePaging } from '../../../hooks/usePaging';
import { useNavigate } from 'react-router-dom';
import type { OrderPendingTypes } from '../../../components/ts/ShopOrderPending';
import '../../user/shoporder/subLines.css';

/* ---------------------------------------------------------------------
   전체 구독권 구매 목록 (관리자, /dbms/shop_order) — mno 구분 없이
   전체 회원의 구독 내역을 검색+페이징으로 조회합니다.

   기존 사용자용 검색 API(GET /shop_order/list/{mno})는 mno가 필수라 그대로
   못 쓰고, 백엔드에 mno 없이 전체 조회 가능한 관리자용 엔드포인트가
   필요합니다 (아래 API 섹션 참고).

   API
   GET /shop_order/list/admin?word=&status=&pmonth=&dateFrom=&dateTo=&page=&size=
--------------------------------------------------------------------- */

export default function ShopOrderList() {
  const { no: ano } = GlobalStoreSession();
  const { page, setPage } = usePaging({ basePath: '/dbms/shoporder' });

  const navigate = useNavigate();
  const [orders, setOrders] = useState<RowType[]>([]);
  const [loading, setLoading] = useState(true);

  // 승인을 기다리는 변경 신청 — 목록 위 안내와 해당 주문의 [변경 대기] 표시에 사용
  const [pendingOnos, setPendingOnos] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);

  const loadPending = async () => {
    try {
      const res = await axiosInstance.get<{ content: OrderPendingTypes[]; totalElements: number }>(
        '/shop_order_pending/list',
        { params: { status: 0, page: 0, size: 100 } },
      );
      setPendingOnos(new Set(res.data.content.map((p) => p.ono)));
      setPendingCount(res.data.totalElements);
    } catch (error) {
      // 표시용이라 실패해도 목록은 그대로 보여 줌
      console.error('변경 신청 대기 조회 실패:', error);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);


  const loadList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<OrderSearchResult>('/shop_order/list/admin', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.word.trim() || undefined,
          status: applied.status === '' ? undefined : Number(applied.status),
          pmonth: applied.pmonth === '' ? undefined : Number(applied.pmonth),
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

      setOrders(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (error) {
      console.error('전체 구독 내역 조회 실패:', error);
      setOrders([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [ano, applied, page]);

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

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    { header: '회원정보', width: '120px', mono: true, 
      render: (o) => (
        <>
          <div className='cell_title'>{o.id}</div>
          <div className='cell_sub'>No.{o.mno}</div>
        </>
      )
    },
    {
      header: '구매정보',
      width: '230px',
      render: (o) => (
        <>
          <span className='cell_title'>
            {o.pname} · {o.pmonth}개월 · {o.ccnt}대
            {pendingOnos.has(o.no) && (
              <button
                type="button"
                className="sub_wait sub_wait_btn"
                title="변경 신청관리에서 승인·반려하기"
                onClick={() => navigate('/dbms/pending')}
              >
                변경 대기
              </button>
            )}
          </span>
          {/* 주문번호를 누르면 전체 이력관리에서 이 주문의 결제·연결·변경·취소 이력만 보여 줌 */}
          <div className='cell_sub'>
            주문번호{' '}
            <button
              type="button"
              className="btn_link mono"
              title="이 주문의 이력 보기"
              onClick={() => navigate(`/dbms/order/history?word=${encodeURIComponent(o.no)}`)}
            >
              {o.no}
            </button>
          </div>
        </>
      ),
    },
    {
      header: '매장',
      width: '140px',
      // 취소된 구독은 연결할 매장이 없으므로 "연결 대기"로 보이지 않게 함
      render: (o) => o.sname ?? <span className="cell_sub">{o.status === 2 ? '-' : '연결 대기'}</span>,
    },
    {
      header: '구독기간',
      width: '200px',
      mono: true,
      render: (o) =>
        o.sdate && o.edate ? (
          `${o.sdate} ~ ${o.edate}`
        ) : o.status === 2 && o.udate ? (
          <span className="cell_sub">취소 {o.udate.split(' ')[0]}</span>
        ) : (
          <span className="cell_sub">-</span>
        ),
    },
    {
      header: '상태',
      width: '90px',
      render: (o) => {
        const expired = isExpired(o.edate);
        const displayStatus = expired ? 3 : o.status;
        return (
          <span className={`badge ${ORDER_STATUS_MAP[displayStatus].className}`}>
            {ORDER_STATUS_MAP[displayStatus].label}
          </span>
        );
      },
    },
    { header: '결제금액(원)', width: '120px', mono: true, render: (o) => 
        <span className={o.status === 2 ? 'text_line' : ''}>{o.totalprice.toLocaleString('ko-KR')}</span> },
    // 날짜만 보여 주고, 시각은 마우스를 올리면 나옴
    { header: '구매일', width: '110px', mono: true, render: (o) => <span title={o.cdate}>{o.cdate.split(' ')[0]}</span> },
  ];

  return (
    <section className="view active">
      <PageHeader title="회원 구매내역" description="전체 회원의 구독 내역을 확인합니다." />

      {/* 승인을 기다리는 변경 신청이 있으면 맨 위에 알림 */}
      {pendingCount > 0 && (
        <div className="alert_mode">
          <div className="alert_banner">
            <div className="aicon">!</div>
            <div className="atext">
              <div className="t1">승인을 기다리는 변경 신청이 {pendingCount}건 있습니다.</div>
              <div className="t2">회원이 신청한 CCTV 대수 변경은 승인해야 반영됩니다. 해당 주문에는 [변경 대기]가 표시됩니다.</div>
            </div>
            <button type="button" className="abtn" onClick={() => navigate('/dbms/pending')}>
              변경 신청관리
            </button>
          </div>
        </div>
      )}

      <AdminToolbar
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="구독권 · 매장명 · 회원아이디"
        filters={
          <>
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
              aria-label="구매일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
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
        emptyMessage="구매 내역이 없습니다."
      />

      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
      
    </section>
  );
}