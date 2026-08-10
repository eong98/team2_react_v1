import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AdminToolbar, ConfirmDeleteModal, DbmsPagination, PageHeader } from '../../../components/ui';
import type { DataCardColumn } from '../../../components/ui/common/DataCard';
import DataCard from '../../../components/ui/common/DataCard';
import { axiosInstance } from '../../../utils/Tool';
import { QA_STATUS_MAP, QA_TYPE_MAP, QA_TYPE_OPTIONS, type QaTypes, type TabKey } from '../../user/board/QaType';
import type { AccordionCardColumn } from '../../../components/ui/common/DataAcc';
import DataAcc from '../../../components/ui/common/DataAcc';

const PAGE_SIZE = 6;

export default function QaList() {
  const navigate = useNavigate();
  const location = useLocation();
  // 임시 번호
  const ano = 1;

  // 내 문의 / 자주 묻는 질문 탭 — 작성/수정 화면에서 돌아올 때 넘겨준 tab이 있으면 그걸로 시작
  const initialTab = (location.state as { tab?: TabKey })?.tab ?? 'qa';
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 검색 키워드 상태
  const [keyword, setKeyword] = useState<string>('');
  // 유형(접수유형)으로 필터
  const [tagFilter, setTagFilter] = useState<QaTypes['type'] | ''>('');
  // 상태(답변상태)로 필터 — 전체 문의 탭에서만 사용
  const [statusFilter, setStatusFilter] = useState<QaTypes['status'] | ''>('');
  // 등록자(회원번호)로 필터 — 전체 문의 탭에서만 사용 (QaTypes에 등록자 이름 필드가 없어 mno로 검색)
  const [writerFilter, setWriterFilter] = useState<string>('');

  // 현재 페이지 번호 상태
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // 삭제 모달 대상 Q&A
  const [deleteTarget, setDeleteTarget] = useState<QaTypes | null>(null);

  // ==========================================
  // 2. API 데이터 조회 (Axios GET)
  // ==========================================
  const fetchQaList = async () => {
    // 탭에 따라 "내 문의"(회원별 조회) / "자주 묻는 질문"(공개 FAQ) 엔드포인트가 다릅니다.
    // TODO: 실제 FAQ 조회 엔드포인트 경로가 다르면 여기만 바꿔주세요.
    if (tab === 'qa' && !ano) return;

    setLoading(true);

    try {
      const url = tab === 'qa' ? `/qa/admin/list` : '/qa/faq';
      const response = await axiosInstance.get(url, {
        params: {
          word: keyword.trim() || undefined, // 검색어가 없으면 요청 파라미터에서 제외
          type: tagFilter === '' ? undefined : tagFilter,
          status: tab === 'qa' && statusFilter !== '' ? statusFilter : undefined,
          // TODO: 실제 백엔드 파라미터명이 mno가 아니면 여기만 바꿔주세요.
          mno: tab === 'qa' && writerFilter.trim() !== '' ? writerFilter.trim() : undefined,
          page: page - 1, // 💡 Spring Pageable은 0부터 시작
          size: PAGE_SIZE,
        },
      });

      const data = response.data;
      // PageResponse의 필드에 맞게 추출 (content / dtoList 확인 필요)
      setQaList(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalElements || 0);
      console.log(data)
    } catch (error) {
      console.error('목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 페이지 번호·검색 키워드·탭이 바뀔 때마다 API 재호출
  useEffect(() => {
    fetchQaList();
  }, [page, keyword, tab, tagFilter, statusFilter, writerFilter]);

  // ==========================================
  // 3. 이벤트 핸들러 (Event Handlers)
  // ==========================================
  /** 탭 전환 핸들러 — 탭 바뀌면 검색어/필터/페이지 초기화 */
  const handleTabChange = (next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    setKeyword('');
    setTagFilter('');
    setStatusFilter('');
    setWriterFilter('');
    setPage(1);
  };

  /** 검색어 변경 핸들러 */
  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1); // 새로운 검색 시 첫 페이지로 이동
  };

  /** 유형 필터 변경 핸들러 */
  const handleTypeFilter = (value: QaTypes['type'] | '') => {
    setTagFilter(value);
    setPage(1);
  };

  /** 상태 필터 변경 핸들러 */
  const handleStatusFilter = (value: QaTypes['status'] | '') => {
    setStatusFilter(value);
    setPage(1);
  };

  /** 등록자 필터 변경 핸들러 */
  const handleWriterFilter = (value: string) => {
    setWriterFilter(value);
    setPage(1);
  };

  /** Q&A 삭제 핸들러 */
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await axiosInstance.delete(`/api/qa/${deleteTarget.no}`);
      setDeleteTarget(null);
      fetchQaList(); // 삭제 성공 시 목록 재조회
    } catch (error) {
      console.error('Q&A 삭제 실패:', error);
    }
  };

  // ==========================================
  // 4. DataCard 컬럼 정의
  // ==========================================

  const qaColumns: DataCardColumn<QaTypes>[] = [
    {
      header: '상태',
      render: (n) => (
        <span
          className={`badge ${QA_STATUS_MAP[n.status].className}`}
        >
          {QA_STATUS_MAP[n.status].label}
        </span>
      ),
    },
    {
      header: '제목 및 정보',
      render: (n) => (
        <div className="lt">
          <div className="cell_title">
            <Link to={`/qa/${n.no}`}>{n.title}</Link>
          </div>
          <div className="cell_sub">
            {n.cdate} · 접수유형: {QA_TYPE_OPTIONS[n.type].label}
          </div>
        </div>
      ),
    },
  ];



  const faqColumns: AccordionCardColumn<QaTypes>[] = [
    {
      header: 'A. 답변 내용',
      render: (n) => (
        <div className="lt">
          <div className="cell_title">
            {n.answer}
          </div>
          <div className="cell_sub">
            {n.cdate}
          </div>
        </div>
      ),
    },
  ];

  const isQa = tab === 'qa';

  return (
    <section className="view active">
      <PageHeader
        title="고객의 소리"
        description="문의사항 및 FAQ를 관리할 수 있습니다."
        createLabel={isQa ? undefined : '+ FAQ 작성'}
        onCreate={isQa ? undefined : () => navigate('new', { state: { tab } })}
      />

      <div className="tabs" role="tablist" aria-label="문의 보기 전환">
        <button
          type="button"
          role="tab"
          className={`tab${isQa ? ' on' : ''}`}
          aria-selected={isQa}
          onClick={() => handleTabChange('qa')}
        >
          전체 문의
        </button>
        <button
          type="button"
          role="tab"
          className={`tab${!isQa ? ' on' : ''}`}
          aria-selected={!isQa}
          onClick={() => handleTabChange('faq')}
        >
          자주 묻는 질문
        </button>
      </div>

      <AdminToolbar
        searchValue={keyword}
        onSearchChange={handleSearch}
        searchPlaceholder={isQa ? '제목으로 검색' : 'FAQ 제목·답변으로 검색'}
        filters={
          <>
            <select
              className="form_select"
              value={tagFilter}
              onChange={(e) => handleTypeFilter(e.target.value === '' ? '' : Number(e.target.value))}
              aria-label="접수 유형 필터"
              style={{'width':'auto'}}
            >
              <option value="">전체 유형</option>
              {QA_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {isQa && (
              <select
                className="form_select"
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value === '' ? '' : Number(e.target.value))}
                aria-label="답변 상태 필터"
                style={{'width':'auto'}}
              >
                <option value="">전체 상태</option>
                {Object.entries(QA_STATUS_MAP).map(([value, s]) => (
                  <option key={value} value={value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
            {isQa && (
              <input
                type="text"
                className="form_input"
                placeholder="회원번호로 검색"
                value={writerFilter}
                onChange={(e) => handleWriterFilter(e.target.value)}
                aria-label="회원번호로 필터"
                style={{ maxWidth: 160 }}
              />
            )}
          </>
        }
      />

      {isQa ? (
        <DataCard
          columns={qaColumns}
          data={qaList}
          rowKey={(n) => n.no}
          loading={loading}
          emptyMessage='등록된 문의가 없습니다.'
          // onEdit={(n) => navigate(`${n.no}/edit`)}
        />

      ) : (
        <DataAcc
          title={(r) => <><span className={`badge ${QA_TYPE_MAP[r.type].className}`}>{QA_TYPE_MAP[r.type].label}</span> Q. {r.title}</>}
          columns={faqColumns}
          data={qaList}
          rowKey={(r) => r.no}
          emptyMessage='등록된 FAQ가 없습니다.'
          onEdit={(n) => navigate(`${n.no}/edit`, { state: { tab } })}
          onDelete={(n) => setDeleteTarget(n)}
          allowMultiple={false}
        />
      )}


      {/* 페이지네이션 컴포넌트 */}
      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={
          deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined
        }
      />
    </section>
  );
}