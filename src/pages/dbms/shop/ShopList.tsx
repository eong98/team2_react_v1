import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminToolbar, DataTable, PageHeader, DbmsPagination, ConfirmDeleteModal, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool.ts';
import { PAGE_SIZE, EMPTY_FILTERS, type ShopSearchResult, type RowType, type Filters } from '../../../components/ts/Shop.ts';

/* ---------------------------------------------------------------------
   매장관리(/dbms/shop) - 관리자 목록. mno 상관없이 전체 매장을 대상으로 합니다.

   SHOP 컬럼: no/mno/title/zip/address/address2/tel/coment/phone/snum/udate/cdate
   - 매장 생성은 관리자 화면에서 하지 않음(매장 소유자가 /user/shop에서 생성).
     관리자는 전체 매장 조회 + 수정 + 삭제만 담당.
   - 맨 앞 "번호" 컬럼은 실제 PK(no)가 아니라, 검색 결과 총 건수 기준으로
     내림차순 매긴 가상의 순번(cnt)입니다. (CctvIssueList.tsx와 동일 패턴)

   API (ShopCont, /shop)
   GET    /shop/admin/search?keyword=&page=&size=  - mno 상관없이 전체 매장 검색 + 페이징
     → { content, totalElements, totalPages, page(0-base), size }
   DELETE /shop/{pk}

   상수/타입(PAGE_SIZE, Filters, EMPTY_FILTERS, RowType, ShopSearchResult)은
   전부 ./Shop.ts 로 옮겨뒀습니다.
--------------------------------------------------------------------- */

export default function ShopListView() {
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
      const res = await axiosInstance.get<ShopSearchResult>('/shop/admin/search', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
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
      await axiosInstance.delete(`/shop/${deleteTarget.no}`);
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
    { header: '회원번호', width: '90px', mono: true, render: (r) => `#${r.mno}` },
    {
      header: '매장명',
      width: '18%',
      render: (r) => (
        <div>
          <div className="cell_title">{r.title}</div>
          <div className="cell_sub">No.{r.no}</div>
        </div>
      ),
    },
    {
      header: '주소',
      width: '28%',
      render: (r) => (
        <span title={`${r.address ?? ''} ${r.address2 ?? ''}`}>
          {r.address}
          {r.address2 ? ` ${r.address2}` : ''}
        </span>
      ),
    },
    { header: '매장연락처', width: '130px', mono: true, render: (r) => r.tel || '-' },
    { header: '사업자번호', width: '120px', mono: true, render: (r) => r.snum || '-' },
    { header: '등록일', width: '110px', mono: true, render: (r) => r.cdate },
  ];

  return (
    <section className="view active">
      <PageHeader title="매장관리" description="전체 회원의 매장을 관리자 권한으로 조회·수정·삭제합니다. (SHOP 테이블 기준, mno 상관없이 전체 대상)" />

      <AdminToolbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="매장명·주소로 검색"
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
        onEdit={(r) => navigate(`${r.no}/edit`)}
        onDelete={(r) => setDeleteTarget(r)}
        emptyMessage="검색 결과가 없습니다."
      />

      <DbmsPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title} (회원 #${deleteTarget.mno})` : undefined}
        loading={deleting}
      />
    </section>
  );
}
