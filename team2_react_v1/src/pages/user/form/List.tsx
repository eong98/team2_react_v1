import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MOCK_NOTICES, TAG_LIST, TAG_TONE, type Notice } from './notice.mock';
import { Filterbar, ConfirmDeleteModal, DataTable, PageHeader, UserPagination, type DataTableColumn } from '../../../components/ui';

const PAGE_SIZE = 6;

export default function List() {
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
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

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
      width: '90px',
      render: (n) => <span className={`badge ${TAG_TONE[n.tag]}`}>{n.tag}</span>,
    },
    {
      header: '제목',
      width:'55%',
      render: (n) => (
        <div>
          <div className="cell_title">{n.title}</div>
          <div className="cell_sub">
            No.{n.no} · {n.writer}
          </div>
        </div>
      ),
    },
    { header: '조회수', width:'100px', mono: true, accessor: 'hit' },
    { header: '등록일', mono: true, accessor: 'cdate' },
  ];

  return (
    <>
      <section className="view active">
        <PageHeader
          title="공지사항"
          description="서비스 업데이트와 점검 안내를 등록/관리합니다. (NOTICE 테이블 기준: no·tag·title·content·writer·hit·cdate)"
          createLabel="+ 공지 작성"
          onCreate={() => navigate('new')}
        />

        <Filterbar
          left={
            <span className="pagination_info">
              전체 <em className='b_num'>{filtered.length}</em>건 중 {from}–{to}건 표시
            </span>
          }
          searchValue={keyword}
          onSearchChange={goSearch}
          searchPlaceholder="제목으로 검색"
          filters={
            <>
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
            </>
          }
          extra={
            <button type='button' className='btn btn_outline_primary'>초기화</button>
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

        
        <UserPagination
          page={page}
          totalPages={totalPages}
          totalCount={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          showInfo={false}
        />

        <ConfirmDeleteModal
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined}
        />
      </section>

      <section className="view active">
        <PageHeader
          title="고객의 소리 · 문의 내역"
          description="등록한 문의와 답변 상태를 확인할 수 있습니다. (shop_qna·shop_qna_list·shop_qna_cate 테이블 기준)"
          createLabel="+ 문의 작성"
          onCreate={() => navigate('new')}
        />

        <div className="stat_mini">
          <div className="card"><div className="lab">전체 문의</div><div className="val">12건</div></div>
          <div className="card"><div className="lab">답변대기</div><div className="val amber">2건</div></div>
          <div className="card"><div className="lab">답변완료</div><div className="val green">10건</div></div>
        </div>

        <Filterbar
          left={
            <span className="pagination_info">
              전체 <em className='b_num'>{filtered.length}</em>건 중 {from}–{to}건 표시
            </span>
          }
          searchValue={keyword}
          onSearchChange={goSearch}
          searchPlaceholder="제목으로 검색"
          filters={
            <>
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
            </>
          }
          extra={
            <button type='button' className='btn btn_outline_primary'>초기화</button>
          }
        />

        <div className="card">
          <div className="list_row">
            <span className="badge badge_warning">답변대기</span>
            
            <div className="lt">
              <div className="cell_title">
                <Link to='/'>[관제신청] 5호점 CCTV 추가 연동 문의</Link>
              </div>
              <div className="cell_sub">2026-08-01 · 접수유형: 관제신청</div>
            </div>

          </div>

          <div className="list_row">
            <span className="badge badge_warning">답변대기</span>

            <div className="lt">
              <div className="cell_title">
                <Link to='/'>[관제신청] 5호점 CCTV 추가 연동 문의</Link>
              </div>
              <div className="cell_sub">2026-08-01 · 접수유형: 관제신청</div>
            </div>

          </div>

          <div className="list_row">
            <span className="badge badge_success">답변완료</span>

            <div className="lt">
              <div className="cell_title">
                <Link to='/'>[관제신청] 5호점 CCTV 추가 연동 문의</Link>
              </div>
              <div className="cell_sub">2026-08-01 · 접수유형: 관제신청</div>
            </div>

          </div>
        </div>

        
        <UserPagination
          page={page}
          totalPages={totalPages}
          totalCount={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          showInfo={false}
        />

        <ConfirmDeleteModal
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined}
        />
      </section>
    </>
  );
}
