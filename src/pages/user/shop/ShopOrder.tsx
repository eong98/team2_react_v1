import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Filterbar, UserPagination, DataTable, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { EMPTY_FILTERS, ORDER_STATUS_MAP, PAGE_SIZE, type Filters, type OrderSearchResult, type RowType, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { GlobalCurrentShop } from '../../../store/UserStore';
import { usePaging } from '../../../hooks/usePaging';

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

  const [active, setActive] = useState<ShopOrderTypes | null>(null);
  const [history, setHistory] = useState<RowType[]>([]);

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
        params: {status: Number(applied.status) === 0 ? 0 : 1},
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

      setHistory(withCnt)
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
      setHistory([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sno, mno]);

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sno, mno, applied, page]);


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

  const historyColumns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    { header: '구독권', width: '120px', render: (o) => o.pname },
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

  return (
    <section className="view active">
      <PageHeader 
        title="구독 내역" 
        description={`${shopTitle}에 연결된 현재 구독과 지난 이력을 확인합니다.`} 
      />

      {activeLoading ? (
        <p className="b_title">불러오는 중...</p>
      ) : active ? (
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
      ) : (
        <div className="card card_pad_lg" style={{ marginBottom: 24, textAlign: 'center' }}>
          <div className='no_data' style={{padding: 0}}>
            <p className="b_title">연결된 구독권이 없습니다.</p>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
              매장 선택하러 가기
            </button>

          </div>
        </div>
      )}

      <div className="cell_sub" style={{ marginBottom: 10 }}>지난 구독 이력</div>

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="매장 · 구독권 이름으로 검색"
        filters={
          <>
            <select
              className="form_select"
              value={draft.status}
              onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
              aria-label="상태 필터"
            >
              <option value="">상태 전체</option>
              <option value="2">만료됨</option>
              <option value="3">취소</option>
            </select>

            <select
              className="form_select"
              value={draft.pmonth}
              onChange={(e) => setDraft((prev) => ({ ...prev, pmonth: e.target.value }))}
              aria-label="기간 필터"
            >
              <option value="">기간 전체</option>
              <option value="6">6개월</option>
              <option value="12">12개월</option>
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
        columns={historyColumns}
        data={history}
        rowKey={(o) => o.no}
        loading={loading}
        emptyMessage="지난 구독 이력이 없습니다."
      />

      <UserPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
    </section>
  );
}