import { useMemo, useState } from 'react';
import Modal from '../../../ui/Modal';
import { AdminPageHeader, AdminToolbar, DataTable, Pagination, ConfirmDeleteModal } from '../../common';
import type { DataTableColumn } from '../../common';

/* ---------------------------------------------------------------------
   ⚠️ 이 파일은 "관리자 CRUD 리스트" 공용 디자인 틀 사용 예시입니다.
   검색 / 생성 / 수정 / 삭제 / 페이지네이션이 모두 붙어있는 기본 패턴이라
   CCTV, 이슈, 유형코드, 매장 등 다른 리스트 화면도 이 구조를 그대로 복사해서
   columns / 상태값 / API 연동 부분만 바꾸면 됩니다.
   (공용 컴포넌트: src/components/dbms/common/*, 스타일: src/components/style/dbms.css)
--------------------------------------------------------------------- */

interface Notice {
  no: number;
  tag: '긴급' | '중요' | '신규' | '일반';
  title: string;
  writer: string;
  hit: number;
  cdate: string; // Tool.getDate() 형식 문자열 가정
}

const TAG_TONE: Record<Notice['tag'], string> = {
  긴급: 'dbms-badge-danger',
  중요: 'dbms-badge-warning',
  신규: 'dbms-badge-success',
  일반: 'dbms-badge-neutral',
};

const MOCK_NOTICES: Notice[] = [
  { no: 24, tag: '긴급', title: '8/5(수) 02:00~04:00 서버 점검 안내', writer: 'admin', hit: 214, cdate: '2026-08-03' },
  { no: 23, tag: '신규', title: "이상행동 유형에 '흡연 감지'가 추가되었습니다", writer: 'admin', hit: 152, cdate: '2026-07-29' },
  { no: 22, tag: '중요', title: '7월 구독 결제 관련 안내', writer: 'admin', hit: 341, cdate: '2026-07-20' },
  { no: 21, tag: '일반', title: 'CCTV 연동 가이드 문서가 갱신되었습니다', writer: 'admin', hit: 88, cdate: '2026-07-14' },
  { no: 20, tag: '일반', title: '모바일 알림 수신 설정 안내', writer: 'admin', hit: 63, cdate: '2026-07-05' },
  { no: 19, tag: '신규', title: '매장별 대시보드 위젯이 추가되었습니다', writer: 'admin', hit: 121, cdate: '2026-06-28' },
  { no: 18, tag: '중요', title: '개인정보처리방침 개정 안내', writer: 'admin', hit: 205, cdate: '2026-06-19' },
  { no: 17, tag: '일반', title: '이용가이드 오탈자 수정', writer: 'admin', hit: 41, cdate: '2026-06-10' },
  { no: 16, tag: '일반', title: '6월 정기 점검 결과 안내', writer: 'admin', hit: 97, cdate: '2026-06-02' },
  { no: 15, tag: '긴급', title: '일부 지역 CCTV 스트리밍 지연 이슈 안내', writer: 'admin', hit: 276, cdate: '2026-05-27' },
  { no: 14, tag: '신규', title: '통계 화면에 주간 리포트가 추가되었습니다', writer: 'admin', hit: 133, cdate: '2026-05-19' },
];

const PAGE_SIZE = 6;

export default function NoticeView() {
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
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

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: Notice) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleSave = () => {
    // TODO: 실제 등록/수정 API 연동 (POST /api/notice, PUT /api/notice/{no})
    setFormOpen(false);
  };

  const handleDelete = () => {
    // TODO: 실제 삭제 API 연동 (DELETE /api/notice/{no})
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<Notice>[] = [
    {
      header: '태그',
      className: 'w-[70px]',
      render: (n) => <span className={`dbms-badge ${TAG_TONE[n.tag]}`}>{n.tag}</span>,
    },
    {
      header: '제목',
      render: (n) => (
        <div>
          <div className="dbms-cell-title">{n.title}</div>
          <div className="dbms-cell-sub">No.{n.no} · {n.writer}</div>
        </div>
      ),
    },
    { header: '조회수', mono: true, accessor: 'hit', className: 'w-[90px]' },
    { header: '등록일', mono: true, accessor: 'cdate', className: 'w-[110px]' },
  ];

  return (
    <section className="view active dbms-page">
      <AdminPageHeader
        title="공지사항"
        description="서비스 업데이트와 점검 안내를 등록/관리합니다. (NOTICE 테이블 기준: no·tag·title·content·writer·hit·cdate)"
        createLabel="+ 공지 작성"
        onCreate={openCreate}
      />

      <AdminToolbar
        searchValue={keyword}
        onSearchChange={goSearch}
        searchPlaceholder="제목으로 검색"
        filters={
          <select
            className="dbms-select"
            value={tagFilter}
            onChange={(e) => {
              setTagFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">태그 전체</option>
            <option value="긴급">긴급</option>
            <option value="중요">중요</option>
            <option value="신규">신규</option>
            <option value="일반">일반</option>
          </select>
        }
      />

      <DataTable
        columns={columns}
        data={paged}
        rowKey={(n) => n.no}
        onEdit={openEdit}
        onDelete={(n) => setDeleteTarget(n)}
        emptyMessage="검색 결과가 없습니다."
      />

      <Pagination page={page} totalPages={totalPages} totalCount={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* 생성/수정 모달 */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        titleId="noticeFormTitle"
        title={editing ? '공지 수정' : '공지 작성'}
        footer={
          <>
            <button type="button" className="dbms-btn dbms-btn-md dbms-btn-ghost" onClick={() => setFormOpen(false)}>
              취소
            </button>
            <button type="button" className="dbms-btn dbms-btn-md dbms-btn-primary" onClick={handleSave}>
              저장
            </button>
          </>
        }
      >
        <div className="dbms-form-row-2">
          <div className="dbms-form-group">
            <label className="dbms-form-label" htmlFor="notice-tag">
              태그<span className="dbms-req">*</span>
            </label>
            <select id="notice-tag" className="dbms-form-select" defaultValue={editing?.tag ?? '일반'}>
              <option value="긴급">긴급</option>
              <option value="중요">중요</option>
              <option value="신규">신규</option>
              <option value="일반">일반</option>
            </select>
          </div>
          <div className="dbms-form-group">
            <label className="dbms-form-label" htmlFor="notice-writer">
              작성자
            </label>
            <input id="notice-writer" className="dbms-form-input" defaultValue={editing?.writer ?? 'admin'} disabled />
          </div>
        </div>
        <div className="dbms-form-group">
          <label className="dbms-form-label" htmlFor="notice-title">
            제목<span className="dbms-req">*</span>
          </label>
          <input
            id="notice-title"
            className="dbms-form-input"
            placeholder="공지 제목을 입력하세요"
            defaultValue={editing?.title ?? ''}
          />
        </div>
        <div className="dbms-form-group">
          <label className="dbms-form-label" htmlFor="notice-content">
            내용<span className="dbms-req">*</span>
          </label>
          <textarea id="notice-content" className="dbms-form-textarea" placeholder="공지 내용을 입력하세요" />
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined}
      />
    </section>
  );
}
