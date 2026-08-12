import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminToolbar, DataTable, PageHeader, DbmsPagination, ConfirmDeleteModal, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool.ts';
import {
  PAGE_SIZE,
  STATE_LABELS,
  STATE_BADGE,
  EMPTY_FILTERS,
  type CctvSearchResult,
  type RowType,
  type Filters,
} from '../../../components/ts/CctvAdmin.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV관리(/dbms/cctv) - 관리자 목록. sno(매장) 상관없이 전체 CCTV를 대상으로 합니다.

   CCTV 컬럼: no/sno/mac/represent/cname/ckdate/state/cdate
   - CCTV 등록/수정/삭제는 관리자 전용입니다. 사용자(user/shop/CctvList.tsx)는
     로그인 후 입장한 매장 소유 CCTV를 조회만 할 수 있습니다.
   - 맨 앞 "번호" 컬럼은 실제 PK(no)가 아니라, 검색 결과 총 건수 기준으로
     내림차순 매긴 가상의 순번(cnt)입니다. (ShopList.tsx/CctvIssueList.tsx와 동일 패턴)

   API (CctvCont, /cctv)
   GET    /cctv/admin/search?sno=&state=&keyword=&page=&size=  - 전체 CCTV 검색 + 페이징
     → { content, totalElements, totalPages, page(0-base), size }
   DELETE /cctv/{pk}

   상수/타입(PAGE_SIZE, STATE_LABELS, STATE_BADGE, Filters, EMPTY_FILTERS, RowType)은
   전부 ./CctvAdmin.ts 로 옮겨뒀습니다.
--------------------------------------------------------------------- */

export default function CctvListView() {
  const navigate = useNavigate();

  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<RowType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<CctvSearchResult>('/cctv/admin/search', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          sno: applied.sno.trim() !== '' ? Number(applied.sno.trim()) : undefined,
          state: applied.state !== '' ? Number(applied.state) : undefined,
          keyword: applied.keyword.trim() || undefined,
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/cctv/${deleteTarget.no}`);
      setDeleteTarget(null);
      // 마지막 페이지의 마지막 1건을 지운 경우 빈 페이지가 보이지 않도록 보정
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadList();
      }
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.\n다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (r) => r.cnt },
    { header: '매장번호', width: '90px', mono: true, render: (r) => `#${r.sno}` },
    {
      header: 'CCTV명',
      width: '18%',
      render: (r) => (
        <div>
          <div className="cell_title">{r.cname || '(이름 없음)'}</div>
          <div className="cell_sub">No.{r.no}</div>
        </div>
      ),
    },
    { header: 'MAC 주소', width: '160px', mono: true, render: (r) => r.mac || '-' },
    {
      header: '대표',
      width: '70px',
      render: (r) => (
        <span className={`badge ${r.represent === 'Y' ? 'badge_info' : 'badge_neutral'}`}>
          {r.represent === 'Y' ? '대표' : '-'}
        </span>
      ),
    },
    {
      header: '상태',
      width: '90px',
      render: (r) => (
        <span className={`badge ${STATE_BADGE[r.state ?? 0] ?? 'badge_neutral'}`}>
          {STATE_LABELS[r.state ?? 0] ?? r.state}
        </span>
      ),
    },
    { header: '최근 점검일', width: '110px', mono: true, render: (r) => r.ckdate || '-' },
    { header: '등록일', width: '110px', mono: true, render: (r) => r.cdate },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="CCTV관리"
        description="전체 매장의 CCTV 장비를 등록·수정·삭제합니다. (CCTV 테이블 기준, sno 상관없이 전체 대상)"
        createLabel="+ CCTV 등록"
        onCreate={() => navigate('new')}
      />

      <AdminToolbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="CCTV명·MAC주소로 검색"
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
        rowKey={(r) => r.no ?? r.cnt}
        loading={loading}
        onEdit={(r) => navigate(`${r.no}/edit`)}
        onDelete={(r) => setDeleteTarget(r)}
        emptyMessage="등록된 CCTV가 없습니다."
      />

      <DbmsPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.cname || '(이름 없음)'} (매장 #${deleteTarget.sno})` : undefined}
        loading={deleting}
      />
    </section>
  );
}
