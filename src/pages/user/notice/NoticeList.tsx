import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { usePaging } from '../../../hooks/usePaging';
import { DataCard, Filterbar, PageHeader, UserPagination, type DataCardColumn } from '../../../components/ui';
import { EMPTY_FILTERS, NOTICE_TYPE_MAP, PAGE_SIZE, type Filters, type NoticeSearchResult, type NoticeTypes } from '../../../components/ts/NoticeType';

export default function NoticeList() {
  // const { no:mno, id } = GlobalStoreSession();

  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/user/notice' });

  /* API 데이터 저장 */
  const [noticeList, setNoticeList] = useState<NoticeTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /* 필터바 설정 */
  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
    
  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadNoticeList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<NoticeSearchResult>('/notice/list', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.keyword.trim() || undefined,
          type: applied.type === '' ? undefined : Number(applied.type)
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      // 삭제 등으로 인해 "지금 있는 페이지"에 데이터가 하나도 없는데 1페이지는 아닌 경우
      // (예: 2페이지 마지막 1건을 상세페이지에서 지우고 돌아온 경우) 한 페이지 앞으로 자동 보정합니다.
      // setPage가 바뀌면 이 useEffect가 page를 다시 의존성으로 갖고 있어서 알아서 재조회됩니다.
      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      // [가상 번호 생성] 전체 데이터 개수 기준 내림차순 순번(cnt) 계산하여 각 로우에 추가
      // 공식: 전체개수 - (현재페이지 * 페이지크기 + 인덱스)
      const withCnt: NoticeTypes[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setNoticeList(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages)); // 최소 1페이지 보장
      
    } catch (error) {
      console.error('목록 조회 실패:', error);
      
      setNoticeList([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };


  /* Effect 및 이벤트 핸들러 */
  useEffect(() => {
    loadNoticeList();
  }, [applied, page]);

  
  // [검색 버튼 클릭] 현재 작성 중인 draft 값을 applied로 확정짓고 1페이지로 이동
  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  // 필터 입력값(draft)/적용값(applied) 초기화. page는 여기서 안 건드림 — 필요한 곳에서 따로 처리
  const resetFilters = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  // [초기화 버튼 클릭] 모든 필터 조건을 초기화하고 1페이지로 이동
  const onReset = () => {
    resetFilters();
    setPage(1);
  };


  // ==========================================
  // DataCard / DataAcc 컬럼 정의
  // ==========================================
  const noticeColumns: DataCardColumn<NoticeTypes>[] = [
    {
      header: '상태',
      render: (n) => (
        <div className='badge_area'>
          <span className={`badge ${NOTICE_TYPE_MAP[n.type].className}`}>
            {NOTICE_TYPE_MAP[n.type].label}
          </span>
        </div>
      ),
    },
    {
      header: '제목 및 정보',
      render: (n) => (
        <div className="lt">
          <div className="cell_title">
            <button type='button' className='link' onClick={() => navigateWithQuery(`${n.no}`)}>
              {n.title}
            </button>
          </div>
          <div className="cell_sub">
            {n.cdate.split(' ')[0]} · 조회수 {n.vcnt}
          </div>
        </div>
      ),
    },
    {
      header: '고정 여부',
      render: (n) => {
        if (n.fixyn !== 'Y' && n.fileyn !== 'Y') return null;
        
        return (
          <div className="me">
            <div className='notice_icons'>
              {n.fileyn === 'Y' && (
                <div className='icon file'>
                  <span className='hidden'>첨부파일 포함</span>
                </div>
              )}
  
              {n.fixyn === 'Y' && (
                <div className='icon pin'>
                  <span className='hidden'>상단 고정</span>
                </div>
              )}
            </div>
          </div>
        )
      },
    },
  ];


  return (
    <section className="view active">
      <PageHeader
        title="공지사항"
        description="서비스 업데이트와 점검 안내를 확인하세요."
      />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder='제목으로 검색'
        filters={
          <>
            {/* 유형 필터 */}
            <select
              className="form_select"
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
              aria-label="유형 필터"
              title='유형 선택'
            >
              <option value="">유형 전체</option>
              {Object.entries(NOTICE_TYPE_MAP).map(([type, {label}]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
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

      <DataCard
         columns={noticeColumns}
         data={noticeList}
         rowKey={(n) => n.no}
         loading={loading}
         emptyMessage="등록된 공지사항가 없습니다."
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