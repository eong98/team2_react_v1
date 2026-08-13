import axios from 'axios';
import { axiosInstance } from '../../../utils/Tool';
import { useEffect, useState } from 'react';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { AdminToolbar, AlertModal, ConfirmDeleteModal, DataAcc, DataCard, DbmsPagination, PageHeader } from '../../../components/ui';
import type { AccordionCardColumn, DataCardColumn  } from '../../../components/ui';
import { EMPTY_FILTERS, PAGE_SIZE, QA_STATUS_MAP, QA_TYPE_MAP } from '../../../components/ts/QaType';
import type { Filters, QaSearchResult, QaTypes, TabKey  } from '../../../components/ts/QaType';
import { useTab } from '../../../hooks/useTab';
import { usePaging } from '../../../hooks/usePaging';


export default function QaList() {
  // const { no:ano, id } = GlobalStoreSession();

  /* 탭 이동시 저장 설정 */
  // 범용 useTab 훅 사용 (URL Query Parameter 기반 탭 제어)
  const { tab, changeTab, navigateWithTab } = useTab<TabKey>({
    defaultTab: 'qa',
    basePath: '/dbms/qa',
  });
  const { page, setPage } = usePaging();

  /* API 데이터 저장 */
  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /* 필터바 설정 */
  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
    
  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);

  // 삭제 모달 대상 Q&A 및 삭제 중 상태
  const [deleteTarget, setDeleteTarget] = useState<QaTypes | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false); // 👈 삭제 진행 로딩 상태 추가

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);
  
  const loadQaList = async () => {
    setLoading(true);

    try {
      const url = tab === 'qa' ? `/qa/list` : '/qa/faq';
      const res = await axiosInstance.get<QaSearchResult>(url, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.keyword.trim() || undefined,
          type: applied.type === '' ? undefined : Number(applied.type),
          status: tab === 'qa' && applied.state !== '' ? Number(applied.state) : undefined,
          mno: tab === 'qa' && applied.mno?.trim() !== '' ? Number(applied.mno?.trim()) : undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      // 삭제 등으로 "지금 있는 페이지"에 데이터가 하나도 없는데 1페이지는 아닌 경우
      // (예: 마지막 페이지의 마지막 1건을 상세페이지에서 지우고 돌아온 경우) 한 페이지 앞으로 자동 보정합니다.
      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

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

  // [탭 버튼 클릭] 필터 조건을 초기화. page 쿼리는 changeTab이 알아서 지워줘서(=1페이지로 리셋)
  // 여기서 또 setPage(1)을 부르면 changeTab의 URL 변경이랑 같은 틱에 두 번 겹쳐서
  // 서로 덮어쓰다가 탭 전환 자체가 씹히는 문제가 있었습니다 — 그래서 여기선 안 부릅니다.
  const handleTabChange = (next: TabKey) => {
    changeTab(next, resetFilters);
  };


  /** Q&A / FAQ 삭제 핸들러 (비밀번호 입력) */
  const handleDeleteWithPw = async (inputPw: string = '') => {
    if (!deleteTarget) return;
    setDeleting(true);
    console.log(inputPw)

    try {
      // Axios DELETE 요청 시 Body로 데이터를 전달할 때는 { data: ... } 옵션을 사용합니다.
      await axiosInstance.delete('/qa', {
        data: {
          no: deleteTarget.no,
          pw: inputPw,
        },
      });
      
      // 빈 페이지 보정(현재 페이지에 데이터가 없으면 한 칸 앞으로)은 이제 loadQaList 안에서
      // 알아서 처리하므로, 여기서는 그냥 다시 조회하면 됩니다.
      setAlert({
        message: '삭제되었습니다.',
        variant: 'success',
        onConfirm: loadQaList,
      });
      setDeleteTarget(null);

    } catch (error) {
      console.error('삭제 실패:', error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status; // HTTP 상태 코드 (400, 401, 404, 500 등)
        const data = error.response?.data; // 백엔드가 보내준 JSON 데이터
                // ----------------------------------------------------
        // 1. HTTP 상태 코드(Status)에 따른 에러 처리
        // ----------------------------------------------------
        if (status === 400 || status === 401) {
          // 비밀번호 틀림 / 잘못된 입력값인 경우
          // const msg = data?.message || '비밀번호가 올바르지 않거나 입력값이 잘못되었습니다.';
          // alert(msg);

        } else if (status === 404) {
          // 존재하지 않는 글번호(no)인 경우
          setAlert({ message: '존재하지 않거나 이미 삭제된 FAQ입니다.', variant: 'error' });

        } else if (status === 500) {
          // 🚨 500 에러일 때: 백엔드 메시지에 "비밀번호"라는 단어가 포함되어 있는지 체크
          if (data?.message?.includes('비밀번호') || data?.message?.includes('password')) {
            setAlert({ message: '비밀번호가 일치하지 않습니다.', variant: 'error' });
          } else {
            setAlert({ message: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.', variant: 'error' });
          }
          
        } else {
          // 기타 상태 코드 처리
          setAlert({ message: `오류가 발생했습니다. (에러 코드: ${status || 'Unknown'})`, variant: 'error' });
        }
        
      } else {
        // Axios 에러가 아닌 일반 자바스크립트 오류
        setAlert({ message: '알 수 없는 오류가 발생했습니다.' , variant: 'error' });
      }
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // 4. DataCard 컬럼 정의
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
        description="문의사항 및 FAQ를 관리할 수 있습니다."
        createLabel={tab === 'qa' ? undefined : '+ FAQ 작성'}
        onCreate={() => navigateWithTab('new')}
      />

      <div className="tabs" role="tablist" aria-label="문의 보기 전환">
        {(['qa', 'faq'] as TabKey[]).map((tKey) => {
          const labels: Partial<Record<TabKey, string>> = { qa: '전체 문의', faq: '자주 묻는 질문' };
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

      <AdminToolbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder={tab === 'qa' ? '제목으로 검색' : 'FAQ 제목·답변으로 검색'}
        onSearchEnter={onSearch}
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

            {/* 회원번호 필터 (전체 문의 탭에서만 표시) */}
            {tab === 'qa' && (
              <>
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

                <input
                  type="number"
                  className="form_input"
                  placeholder="회원번호로 검색"
                  value={draft.mno}
                  onChange={(e) => setDraft((prev) => ({ ...prev, mno: e.target.value }))}
                  aria-label="회원번호 필터"
                  title='회원번호 검색'
                  style={{ maxWidth: 150 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSearch?.();
                    }
                  }}
                />
              </>
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

      {tab === 'qa' ? (
        <DataCard
          columns={qaColumns}
          data={qaList}
          rowKey={(n) => n.no}
          loading={loading}
          emptyMessage="등록된 문의가 없습니다."
        />
      ) : (
        <DataAcc
          title={(n) => (
            <>
            <span className='badge_area'>
              <span className={`badge ${QA_TYPE_MAP[n.type]?.className ?? ''}`}>
                {QA_TYPE_MAP[n.type]?.label ?? n.type}
              </span>
            </span>
              Q. {n.title}
            </>
          )}
          columns={faqColumns}
          data={qaList}
          rowKey={(n) => n.no}
          emptyMessage="등록된 FAQ가 없습니다."
          onEdit={(n) => navigateWithTab(`${n.no}/edit`)}
          onDelete={(n) => setDeleteTarget(n)}
          allowMultiple={false}
        />
      )}

      {/* 페이지네이션 컴포넌트 */}
      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* 🔑 삭제 확인 모달 (수정됨) */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(pw) => handleDeleteWithPw(pw)}
        loading={deleting}
        targetLabel={
          deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined
        }
        requirePassword={true}
      />

      
      
      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}