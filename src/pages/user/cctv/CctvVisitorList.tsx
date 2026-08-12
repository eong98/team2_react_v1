import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable, UserPagination, type DataTableColumn } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance } from '../../../utils/Tool.ts';
import {
  PAGE_SIZE,
  STATE_LABELS,
  STATE_BADGE,
  EMPTY_FILTERS,
  type CctvVisitorSearchResult,
  type RowType,
  type Filters,
} from '../../../components/ts/CctvVisitor.ts';
import { GlobalCurrentShop } from '../../../store/UserStore.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV 손님(방문객) 내역(/user/cctvvisitor) - 조회 전용. Topbar에서 입장한
   매장(GlobalCurrentShop().no) 소유 CCTV에서 찍힌 손님 내역만 노출합니다.

   dbms/cctv/CctvVisitorList.tsx(관리자, 전체 매장 대상)와 상수/타입은 그대로
   ./components/ts/CctvVisitor.ts 를 공유하되, 여기서는 sno 입력창 없이
   GlobalCurrentShop().no를 그대로 서버에 넘겨서 내 매장 내역만 봅니다.

   CCTV_VISITOR 컬럼: no/cno/trackId/intime/outtime/staytime/state/cdate
   - 등록/수정 화면 없음(CCTV가 AI로 자동 적재). 목록 + 검색 + 페이징만 지원.

   API (CctvVisitorCont, /cctv_visitor)
   GET /cctv_visitor/search?sno=&cno=&state=&keyword=&intimeFrom=&intimeTo=&page=&size=
     → { content, totalElements, totalPages, page(0-base), size } (sno 필수, searchByShop)
--------------------------------------------------------------------- */

export default function CctvVisitorListView() {
  const navigate = useNavigate();
  const shopNo = GlobalCurrentShop((state) => state.no);
  const shopTitle = GlobalCurrentShop((state) => state.title);

  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadList = async () => {
    if (!shopNo) {
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.get<CctvVisitorSearchResult>('/cctv_visitor/search', {
        params: {
          sno: shopNo,
          page: page - 1,
          size: PAGE_SIZE,
          cno: applied.cno.trim() !== '' ? Number(applied.cno.trim()) : undefined,
          state: applied.state !== '' ? Number(applied.state) : undefined,
          keyword: applied.keyword.trim() || undefined,
          intimeFrom: applied.dateFrom || undefined,
          intimeTo: applied.dateTo || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setRows(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error('CCTV 손님 내역 조회 실패:', err);
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopNo, applied, page]);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const onReset = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  };

  const from = totalElements === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalElements);

  /* ---- 매장 미선택 시 안내 ---- */
  if (!shopNo) {
    return (
      <section className="view active">
        <PageHeader title="CCTV 손님 내역" description="매장을 선택하면 해당 매장의 CCTV 손님 내역을 확인할 수 있습니다." />
        <div
          className="card card_pad_lg"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--text-faint)',
          }}
        >
          <p className="b_title">먼저 관리할 매장을 선택해주세요.</p>
          <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
            매장 선택하러 가기
          </button>
        </div>
      </section>
    );
  }

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (r) => r.cnt },
    { header: 'CCTV', width: '70px', mono: true, render: (r) => `#${r.cno}` },
    { header: 'AI추적ID', width: '18%', mono: true, render: (r) => r.trackId },
    {
      header: '상태',
      width: '100px',
      render: (r) => (
        <span className={`badge ${STATE_BADGE[r.state] ?? 'badge_neutral'}`}>
          {STATE_LABELS[r.state] ?? r.state}
        </span>
      ),
    },
    { header: '입장시각', width: '150px', mono: true, render: (r) => r.intime },
    { header: '퇴장시각', width: '150px', mono: true, render: (r) => r.outtime ?? '-' },
    { header: '체류시간', width: '90px', mono: true, render: (r) => (r.staytime != null ? `${r.staytime}분` : '-') },
    { header: '등록일', mono: true, render: (r) => r.cdate },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="CCTV 손님 내역"
        description={`${shopTitle || '선택한 매장'}의 CCTV에 찍힌 손님(방문객) 입·퇴장 내역입니다.`}
      />

      <Filterbar
        left={
          <span className="pagination_info">
            전체 <em className="b_num">{totalElements}</em>건 중 {from}–{to}건 표시
          </span>
        }
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="AI추적ID로 검색"
        onSearchEnter={onSearch}
        filters={
          <>
            <input
              type="number"
              className="form_input"
              placeholder="CCTV번호"
              value={draft.cno}
              onChange={(e) => setDraft((prev) => ({ ...prev, cno: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              style={{ maxWidth: 110 }}
              aria-label="CCTV번호 필터"
            />

            <select
              className="form_select"
              value={draft.state}
              onChange={(e) => setDraft((prev) => ({ ...prev, state: e.target.value }))}
              aria-label="상태 필터"
            >
              <option value="">상태 전체</option>
              {Object.entries(STATE_LABELS).map(([state, label]) => (
                <option key={state} value={state}>
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
              aria-label="입장일 시작"
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
              aria-label="입장일 종료"
            />
          </>
        }
        extra={
          <>
            <button type="button" className="btn btn_primary" onClick={onSearch}>
              검색
            </button>
            <button type="button" className="btn btn_outline_primary" onClick={onReset}>
              초기화
            </button>
          </>
        }
      />

      <DataTable<RowType>
        columns={columns}
        data={rows}
        rowKey={(r) => r.no}
        loading={loading}
        emptyMessage="검색 결과가 없습니다."
      />

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        showInfo={false}
      />
    </section>
  );
}
