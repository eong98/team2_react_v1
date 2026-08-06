import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader, AdminToolbar, DataTable, Pagination, ConfirmDeleteModal } from '../common';
import type { DataTableColumn } from '../common';
import { MOCK_NOTICES, TAG_LIST, TAG_TONE, type Notice } from './Shop.mock';

// 파일이름 꼭 맞춰주세요 
/* ---------------------------------------------------------------------
   ⚠️ 이 파일은 "관리자 CRUD 리스트" 공용 디자인 틀 사용 예시입니다.
   검색 / 생성 / 수정 / 삭제 / 페이지네이션이 모두 붙어있는 기본 패턴이라
   CCTV, 이슈, 유형코드, 매장 등 다른 리스트 화면도 이 구조를 그대로 복사해서
   columns / 상태값 / API 연동 부분만 바꾸면 됩니다.
   (공용 컴포넌트: src/components/dbms/common/*, 스타일: src/components/style/dbms.css)

   ※ 생성/수정은 모달이 아니라 전용 라우트(페이지)로 분리했습니다.
     - 작성: /dbms/board/notice/new
     - 수정: /dbms/board/notice/:no/edit
     - 삭제는 그대로 확인 모달(ConfirmDeleteModal) 사용.
     → 폼 화면 구현은 NoticeFormView.tsx 참고.
--------------------------------------------------------------------- */

const PAGE_SIZE = 6;

export default function NoticeView() {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<Notice['tag'] | ''>('');
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);

  const filtered = useMemo(() => {
    return MOCK_NOTICES.filter((n) => {
      const matchKeyword = keyword.trim() === '' || n.title.toLowerCase().includes(keyword.trim().toLowerCase());
      const matchTag = tagFilter === '' || n.tag === tagFilter;
      return matchKeyword && matchTag;
    });
  }, [keyword, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goSearch = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const selectTag = (tag: Notice['tag'] | '') => {
    setTagFilter(tag);
    setPage(1);
  };

  const handleDelete = () => {
    // TODO: 실제 삭제 API 연동 (DELETE /api/notice/{no})
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<Notice>[] = [
    {
      header: '태그',
      render: (n) => <span className={`badge ${TAG_TONE[n.tag]}`}>{n.tag}</span>,
    },
    {
      header: '제목',
      render: (n) => (
        <div>
          <div className="cell_title">{n.title}</div>
          <div className="cell_sub">
            No.{n.no} · {n.writer}
          </div>
        </div>
      ),
    },
    { header: '조회수', mono: true, accessor: 'hit' },
    { header: '등록일', mono: true, accessor: 'cdate' },
  ];

  return (
    <section className="view active">
      <AdminPageHeader
        title="매장관리"
        description="관리자 매장관리"
      />

      <AdminToolbar
        searchValue={keyword}
        onSearchChange={goSearch}
        searchPlaceholder="제목으로 검색"
        filters={
          <select
            className="form_select"
            value={tagFilter}
            onChange={(e) => selectTag(e.target.value as Notice['tag'] | '')}
            aria-label="태그 필터"
          >
            <option value="">태그 전체</option>
            {TAG_LIST.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        }
      />

      <DataTable
        columns={columns}
        data={paged}
        rowKey={(n) => n.no}
        onEdit={(n) => navigate(`${n.no}/edit`)}
        onDelete={(n) => setDeleteTarget(n)}
        emptyMessage="검색 결과가 없습니다."
      />

      <Pagination page={page} totalPages={totalPages} totalCount={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined}
      />
    </section>
  );
}
