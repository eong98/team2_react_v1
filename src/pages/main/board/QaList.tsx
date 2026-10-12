import { useEffect, useState } from 'react';
import { usePaging } from '../../../hooks/usePaging';
import { EMPTY_FILTERS, PAGE_SIZE, QA_STATUS_MAP, QA_TYPE_MAP, type Filters, type QaSearchResult, type QaTypes } from '../../../components/ts/QaType';
import { axiosInstance } from '../../../utils/Tool';
import { DataCard, Filterbar, PageHeader, UserPagination, type DataCardColumn } from '../../../components/ui';

/* ---------------------------------------------------------------------
   비회원 문의사항 (/board/qa/search) — 이메일/키워드로 본인 작성 문의
   목록을 검색합니다. 글을 클릭하면 상세로 이동하고, 비밀글이면 상세의
   잠금 화면에서 비밀번호를 입력합니다 (목록 모달 없음 — 주소·챗봇·이전글 등
   어느 경로로 들어와도 같은 화면에서 처리).

   API
   GET  /qa/guest/list?word=        → PageResponse<QaResponse>
--------------------------------------------------------------------- */

export default function QaList() {
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/board/qa' });

  /* API 데이터 저장 */
  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);



  const loadQaList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<QaSearchResult>('/qa/guest/list', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.keyword.trim() || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      const withCnt: QaTypes[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setQaList(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages)); // 최소 1페이지 보장
      
    } catch (error) {
      console.error('목록 조회 실패:', error);
      
      setQaList([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  /* Effect 및 이벤트 핸들러 */
  useEffect(() => {
    loadQaList();
  }, [applied, page]);


  // 검색/초기화
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

  /** 상세로 이동 — 비밀글도 그대로 이동 (비밀번호는 상세의 잠금 화면에서 입력) */
  const handleClickItem = (item: QaTypes) => {
    navigateWithQuery(`${item.no}`);
  };


  // DataCard 컬럼 정의
  const qaColumns: DataCardColumn<QaTypes>[] = [
    {
      header: '상태',
      render: (n) => (
        <div className="badge_area">
          <span className={`badge ${QA_STATUS_MAP[n.status]?.className}`}>
            {QA_STATUS_MAP[n.status]?.label}
          </span>
        </div>
      ),
    },
    {
      header: '제목 및 정보',
      render: (n) => (
        <>
          <div className="lt">
            <div className="cell_title">
              <button type="button" className="link" onClick={() => handleClickItem(n)}>
                {n.title}
                {n.vmode === 'Y' && (
                  <span className="lock">
                    <span className="hidden">비밀글</span>
                  </span>
                )}
              </button>
              {/* AI 자동 답변이 달린 문의 — 제목 옆에 반짝이는 배지 (common.css .badge.ai_answer) */}
              {n.aiyn === 'Y' && <span className="badge ai_answer">✨ AI 답변</span>}
            </div>
            <div className="cell_sub">
              접수유형: {Object.entries(QA_TYPE_MAP).find(([type]) => Number(type) === n.type)?.[1].label ?? n.type} · {n.cdate?.split(' ')[0]}
            </div>
          </div>
          
          {n.fileyn === 'Y' && ( // 첨부파일 있는 글만 아이콘 표시
            <div className="me">
              <div className='icon_row'>
                <div className='icon file'>
                  <span className='hidden'>첨부파일 포함</span>
                </div>
              </div>
            </div>
          )}

          <div className='me'>
            <div className="cell_sub">
              조회수 {n.vcnt}
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="문의사항"
        description="비회원 문의 작성 시 입력하신 이메일로 내역을 조회합니다."
        createLabel={'+ 비회원 문의 작성'}
        onCreate={() => navigateWithQuery('new')}
      />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="제목 · 이메일로 검색"
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

      <DataCard
        columns={qaColumns}
        data={qaList}
        rowKey={(n) => n.no}
        loading={loading}
        emptyMessage="등록된 문의가 없습니다."
      />

      {/* 페이지네이션 컴포넌트 */}
      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />



    </section>
  );
}