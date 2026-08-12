import { useEffect, useState } from 'react';
import { AdminToolbar, DataTable, PageHeader, DbmsPagination, type DataTableColumn } from '../../../components/ui';
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

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV 손님(방문객) 내역 목록(/dbms/cctvvisitor) - 읽기 전용, 관리자 전용.

   CCTV_VISITOR 컬럼: no/cno/trackId/intime/outtime/staytime/state/cdate
   - 등록/수정 화면 없음(CCTV가 AI로 자동 적재). 목록 + 검색 + 페이징만 지원.
   - 매장(sno) 상관없이 전체 손님 내역을 대상으로 하되, sno로 좁혀서 검색 가능
     (CCTV_VISITOR엔 SNO 컬럼이 없어서 CNO가 속한 CCTV의 SNO로 필터링, CctvIssue와 동일 패턴).
   - 맨 앞 "번호" 컬럼은 실제 PK(no)가 아니라, 검색 결과 총 건수 기준으로
     내림차순 매긴 가상의 순번(cnt)입니다. (ShopList.tsx/CctvIssueList.tsx와 동일 패턴)

   API (CctvVisitorCont, /cctv_visitor)
   GET /cctv_visitor/admin/search?sno=&cno=&state=&keyword=&intimeFrom=&intimeTo=&page=&size=
     → { content, totalElements, totalPages, page(0-base), size }

   상수/타입(PAGE_SIZE, STATE_LABELS, STATE_BADGE, RowType, Filters, EMPTY_FILTERS)은
   전부 ./CctvVisitor.ts 로 옮겨뒀습니다. STATE 값 매핑을 바꿔야 하면 이 파일이 아니라
   CctvVisitor.ts를 고치면 됩니다.
--------------------------------------------------------------------- */

export default function CctvVisitorListView() {
  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<CctvVisitorSearchResult>('/cctv_visitor/admin/search', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          sno: applied.sno.trim() !== '' ? Number(applied.sno.trim()) : undefined,
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
      console.error(err);
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
  }, [applied, page]);

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
        description="AI가 CCTV로 추적한 손님(방문객) 입·퇴장 내역입니다. 매장 상관없이 전체 대상. (CCTV_VISITOR 테이블 기준)"
      />

      <AdminToolbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="AI추적ID로 검색"
        onSearchEnter={onSearch}
        filters={
          <>
            <input
              type="number"
              className="form_input"
              placeholder="매장번호"
              value={draft.sno}
              onChange={(e) => setDraft((prev) => ({ ...prev, sno: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              style={{ maxWidth: 110 }}
              aria-label="매장번호 필터"
            />

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

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.no}
        loading={loading}
        emptyMessage="검색 결과가 없습니다."
      />

      <DbmsPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
    </section>
  );
}
