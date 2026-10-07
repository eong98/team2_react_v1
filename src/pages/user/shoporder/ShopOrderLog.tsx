import { useParams } from "react-router-dom";
import { GlobalStoreSession } from "../../../store/LoginStore";
import { usePaging } from "../../../hooks/usePaging";
import { useEffect, useState } from "react";
import { EMPTY_FILTERS, formatLogAmount, LOG_ACTION_MAP, PAGE_SIZE, type Filters, type LogSearchResult, type RowType } from "../../../components/ts/ShopOrderLog";
import { axiosInstance } from "../../../utils/Tool";
import { DataTable, Filterbar, Modal, UserPagination, type DataTableColumn } from "../../../components/ui";


export default function ShopOrderLog() {
  const { no: mno } = GlobalStoreSession();
  const { ono } = useParams<{ ono: string }>();
  const url = location.pathname.includes('/order') ? 'order' : 'shoporder';

  const { page, setPage } = usePaging({ basePath: `/user/${url}/${ono}/history` });

  const [logs, setLogs] = useState<RowType[]>([]);
  const [detailTarget, setDetailTarget] = useState<RowType | null>(null);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadLogs = async () => {
    if (!ono) return;
    setLoading(true);

    try {
      const res = await axiosInstance.get<LogSearchResult>(`/shop_order_log/list/${mno}/${ono}`, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          action: applied.action === '' ? undefined : Number(applied.action),
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

      setLogs(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));

    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
      setLogs([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, ono, applied, page]);

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
    { header: '번호', width: '64px', mono: true, render: (l) => l.cnt },
    {
      header: '구분',
      width: '90px',
      render: (l) => (
        <span className={`badge ${LOG_ACTION_MAP[l.action].className}`}>{LOG_ACTION_MAP[l.action].label}</span>
      ),
    },
    { header: '발생일시', width: '190px', mono: true, render: (l) => l.cdate },
    {
      header: '구독정보',
      width: '120px',
      render: (l) => (
        <>
          <div className='cell_sub'>CCTV: {l.ccnt}대</div>
          <div className='cell_title'>{l.pname}</div>
        </>
      ),
    },
    { header: '내용', width:'30%', render: (l) => l.memo ? <span className='ellipsis' >{l.memo}</span> : <span className="cell_sub">-</span> },
    {
      header: '금액(원)',
      width: '110px',
      mono: true,
      render: (l) => {
        const formatted = formatLogAmount(l.amount, l.action, l.memo);
        if (!formatted) return <span className="cell_sub">-</span>;
        return <span className={formatted.className}>{formatted.text}</span>;
      },
    },
    {
      header: '상세',
      width: '100px',
      render: (l) => (
        <button type="button" className="btn btn_xsm btn_ghost" onClick={() => setDetailTarget(l)}>
          보기
        </button>
      ),
    },
  ];


  return (
    <>
      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        filters={
          <>
            <select
              className="form_select"
              value={draft.action}
              onChange={(e) => setDraft((prev) => ({ ...prev, action: e.target.value }))}
              aria-label="이벤트 종류 필터"
            >
              <option value="">구분 전체</option>
              {Object.entries(LOG_ACTION_MAP).map(([type, { label }]) => (
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
              aria-label="기록일 시작"
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
              aria-label="기록일 종료"
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
        data={logs}
        rowKey={(l) => l.no}
        loading={loading}
        emptyMessage="조건에 맞는 변경 이력이 없습니다."
      />

      <UserPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />

      
      <Modal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        titleId="logDetailTitle"
        title="변경이력 상세"
        footer={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => setDetailTarget(null)}>
            닫기
          </button>
        }
      >
        {detailTarget && (
          <div className="order_lines">
            <div className="order_line">
              <span>구분</span>
              <span style={{fontFamily:'var(--font-disp)'}}>
                {LOG_ACTION_MAP[detailTarget.action].label}
              </span>
            </div>
            
            <div className="order_line"><span>주문번호</span><span className="mono">{detailTarget.ono}</span></div>

            
            <div className="order_line">
              <span>매장정보</span>
              <span>
                {detailTarget.sno != null && (
                  <span className='cell_sub' style={{fontFamily:'var(--font-disp)'}}>(No.{detailTarget.sno}) </span>
                )}
                
                <span style={{fontFamily:'var(--font-disp)'}}>{detailTarget.sname ?? '-'}</span>
              </span>
            </div>
            
            <div className="order_line">
              <span>{detailTarget.action !== 4 ? '구독권' : '변경될 구독권'}</span>
              <span>
                {detailTarget.action !== 4 ? (
                  <span style={{fontFamily:'var(--font-disp)'}}>{detailTarget.pname ?? '-'}</span>
                ) : (
                  <span style={{fontFamily:'var(--font-disp)'}}>{detailTarget.newPname}</span>
                )}
              </span>
            </div>
            
            {detailTarget.action === 4 && (
              <div className="order_line">
                <span>신청된 CCTV 대수</span>
                <span>{detailTarget.newCcnt}대</span>
              </div>
            )}
            
            <div className="order_line">
              <span>대당단가</span>
              <span>{detailTarget.bprice ? detailTarget.bprice.toLocaleString('ko-KR') : '-'}</span>
            </div>

            
            {(detailTarget.beforeEdate || detailTarget.afterEdate) && (
              <>
                <div className="order_line">
                  <span>구독기간</span>
                  <span className="mono">
                    {detailTarget.sdate} ~ {detailTarget.afterEdate}
                  </span>
                </div>

                <div className="order_line">
                  <span>변경기간</span>
                  <span className="mono">
                    {detailTarget.beforeEdate && detailTarget.afterEdate && (detailTarget.beforeEdate !== detailTarget.afterEdate) ? (
                      `${detailTarget.beforeEdate} → ${detailTarget.afterEdate}`
                    ):('-')}
                  </span>
                </div>
              </>
            )}

            {detailTarget.amount != null && (
              (() => {
                const formatted = formatLogAmount(detailTarget.amount, detailTarget.action, detailTarget.memo);
                return formatted ? (
                  <div className="order_line"><span>결제금액</span><span className={formatted.className}>{formatted.text}</span></div>
                ) : null;
              })()
            )}
            <div className="order_line"><span>발생일시</span><span className="mono">{detailTarget.cdate}</span></div>

            {detailTarget.memo && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div className="cell_sub" style={{ marginBottom: 6, fontSize: 12 }}>상세 내용</div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{detailTarget.memo}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}