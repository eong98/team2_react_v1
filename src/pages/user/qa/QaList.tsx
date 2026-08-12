import { useEffect, useState } from 'react';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { axiosInstance } from '../../../utils/Tool';
import { useTab } from '../../../hooks/useTab';
import { Filterbar, UserPagination, PageHeader, DataAcc, DataCard } from '../../../components/ui';
import type { DataCardColumn, AccordionCardColumn } from '../../../components/ui';
import { EMPTY_FILTERS, PAGE_SIZE, QA_STATUS_MAP, QA_TYPE_MAP } from '../../../components/ts/QaType';
import type { Filters, QaSearchResult, QaTypes, TabKey } from '../../../components/ts/QaType';

export default function QaList() {
  const { no:mno, id } = GlobalStoreSession();

  /* 탭 이동시 저장 설정 */
  // 범용 useTab 훅 사용 (URL Query Parameter 기반 탭 제어)
  const { tab, changeTab, navigateWithTab } = useTab<TabKey>({
    defaultTab: 'qa',
    basePath: '/user/qa',
  });

  // 탭 상태 조건 분기
  const isFaq = tab === 'faq';
  const isQaType = tab === 'qa' || tab === 'my'; // Q&A 카드로 표출할 탭 (전체 문의 or 내 문의)

  /* API 데이터 저장 */
  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /* 필터바 설정 */
  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터
    
  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);

  /* 탭별 API 데이터 URL */
  const urlMap: Record<TabKey, string> = {
    my: `/qa/my/${mno}`,  // 내 문의
    qa: '/qa/list',   // 전체 문의
    faq: '/qa/faq',   // 자주 묻는 질문
  };

  const loadQaList = async () => {
    setLoading(true);
    try {
      const url = urlMap[tab];
      const res = await axiosInstance.get<QaSearchResult>(url, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.keyword.trim() || undefined,
          type: applied.type === '' ? undefined : Number(applied.type),
          status: isQaType && applied.state !== '' ? Number(applied.state) : undefined,
          mno: tab === 'qa' && applied.mno?.trim() !== '' ? Number(applied.mno?.trim()) : undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      // [가상 번호 생성] 전체 데이터 개수 기준 내림차순 순번(cnt) 계산하여 각 로우에 추가
      // 공식: 전체개수 - (현재페이지 * 페이지크기 + 인덱스)
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
  }, [tab, applied, page]);

  
  // [검색 버튼 클릭] 현재 작성 중인 draft 값을 applied로 확정짓고 1페이지로 이동
  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  
  // [초기화 버튼 클릭] 모든 필터 조건을 초기화하고 1페이지로 이동
  const onReset = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  };

  // [탭 버튼 클릭]  모든 필터 조건을 초기화하고
  const handleTabChange = (next: TabKey) => {
    // 탭 필터 초기화
    changeTab(next, onReset);

    // 검색 필터 초기화, 1페이지로 이동
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  };


  // ==========================================
  // DataCard / DataAcc 컬럼 정의
  // ==========================================
  const qaColumns: DataCardColumn<QaTypes>[] = [
    {
      header: '상태',
      render: (n) => (
        <div className='badge_area'>
          <span className={`badge ${QA_STATUS_MAP[n.status].className}`}>
            {QA_STATUS_MAP[n.status].label}
          </span>
        </div>
      ),
    },
    {
      header: '제목 및 정보',
      render: (n) => (
        <div className="lt">
          <div className="cell_title">
            <button className='link' onClick={() => navigateWithTab(`${n.no}`)}>
              {n.title}
              {n.vmode === 'Y' ? 
                (<span className='lock'>
                  <span className='hidden'>비밀글</span>
                </span> ) : null
              }
            </button>
          </div>
          <div className="cell_sub">
            접수유형: {Object.entries(QA_TYPE_MAP).find(([type]) => Number(type) === n.type)?.[1].label ?? n.type}
          </div>
        </div>
      ),
    },
    {
      header: '등록일 정보',
      render: (n) => (
        <div className='me' style={{'textAlign':'right', 'alignSelf':'flex-end'}}>
          <div className="cell_sub">
            {n.cdate.split(' ')[0]}
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
          <div className="cell_title">{n.answer}</div>
        </div>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="문의사항"
        description="자주 묻는 질문과 등록한 문의, 답변 상태를 확인할 수 있습니다."
        createLabel={isFaq ? undefined : '+ 문의 작성'}
        onCreate={() => navigateWithTab('new')}
      />

      {/* 💡 탭 선택 버튼 3개 분기 */}
      <div className="tabs" role="tablist" aria-label="문의 보기 전환">
        {(['qa', 'my', 'faq'] as TabKey[]).map((tKey) => {
          const labels: Record<TabKey, string> = { qa: '전체 문의', my: '내 문의', faq: '자주 묻는 질문' };
          return (
            <button
              key={tKey}
              type="button"
              role="tab"
              className={`tab${tab === tKey ? ' on' : ''}`}
              aria-selected={tab === tKey}
              onClick={() => handleTabChange(tKey)}
            >
              {labels[tKey]}
            </button>
          );
        })}
      </div>

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder={isFaq ? 'FAQ 제목·답변으로 검색' : '제목으로 검색'}
        filters={
          <>
            {/* 접수 유형 필터 */}
            <select
              className="form_select"
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
              aria-label="접수 유형 필터"
              title='접수 유형 선택'
            >
              <option value="">전체</option>
              {Object.entries(QA_TYPE_MAP).map(([type, {label}]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>

            {/* 답변 상태 필터 (전체 문의 및 내 문의 탭) */}
            {isQaType && (
              <select
                className="form_select"
                value={draft.state}
                onChange={(e) => setDraft((prev) => ({ ...prev, state: e.target.value }))}
                aria-label="답변 상태 필터"
                title='답변 상태 선택'
              >
                <option value="">전체</option>
                {Object.entries(QA_STATUS_MAP).map(([status, {label}]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            )}

            {/* 회원번호 필터 (전체 문의 탭에서만 표시) */}
            {tab === 'qa' && (
              <input
                type="number"
                className="form_input"
                placeholder="회원번호로 검색"
                value={draft.mno}
                onChange={(e) => setDraft((prev) => ({ ...prev, mno: e.target.value }))}
                aria-label="회원번호 필터"
                title='회원번호 검색'
                style={{ maxWidth: 150 }}
              />
            )}
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

      {/* 💡 isQaType (전체 문의/내 문의)인 경우 DataCard, FAQ인 경우 DataAcc 렌더링 */}
      {isQaType ? (
        <DataCard
           columns={qaColumns}
           data={qaList}
           rowKey={(n) => n.no}
           loading={loading}
           emptyMessage="등록된 문의가 없습니다."
         />
      ) : (
        <DataAcc
          title={(r) => (
            <>
            <span className='badge_area'>
              <span className={`badge ${QA_TYPE_MAP[r.type]?.className ?? ''}`}>
                {QA_TYPE_MAP[r.type]?.label ?? r.type}
              </span>{' '}
            </span>
              Q. {r.title}
            </>
          )}
          columns={faqColumns}
          data={qaList}
          rowKey={(r) => r.no}
          loading={loading}
          emptyMessage="등록된 FAQ가 없습니다."
          allowMultiple={false}
        />
      )}

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