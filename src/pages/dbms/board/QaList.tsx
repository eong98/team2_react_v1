import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios'; // 👈 Axios 에러 타입 체크용 추가
import { AdminToolbar, AlertModal, ConfirmDeleteModal, DbmsPagination, PageHeader } from '../../../components/ui';
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
  const isQa = tab === 'qa';

  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 검색 키워드 상태
  const [keyword, setKeyword] = useState<string>('');
  // 유형(접수유형)으로 필터
  const [tagFilter, setTagFilter] = useState<QaTypes['type'] | ''>('');
  // 상태(답변상태)로 필터 — 전체 문의 탭에서만 사용
  const [statusFilter, setStatusFilter] = useState<QaTypes['status'] | ''>('');
  // 등록자(회원번호)로 필터 — 전체 문의 탭에서만 사용
  const [writerFilter, setWriterFilter] = useState<string>('');

  // 현재 페이지 번호 상태
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // 삭제 모달 대상 Q&A 및 삭제 중 상태
  const [deleteTarget, setDeleteTarget] = useState<QaTypes | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false); // 👈 삭제 진행 로딩 상태 추가

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);
  // ==========================================
  // 2. API 데이터 조회 (Axios GET)
  // ==========================================
  const fetchQaList = async () => {
    if (tab === 'qa' && !ano) return;

    setLoading(true);

    try {
      const url = tab === 'qa' ? `/qa/list` : '/qa/faq';
      const response = await axiosInstance.get(url, {
        params: {
          word: keyword.trim() || undefined,
          type: tagFilter === '' ? undefined : tagFilter,
          status: tab === 'qa' && statusFilter !== '' ? statusFilter : undefined,
          mno: tab === 'qa' && writerFilter.trim() !== '' ? writerFilter.trim() : undefined,
          page: page - 1,
          size: PAGE_SIZE,
        },
      });

      const data = response.data;
      setQaList(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalElements || 0);
    } catch (error) {
      console.error('목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQaList();
  }, [page, keyword, tab, tagFilter, statusFilter, writerFilter]);

  // ==========================================
  // 3. 이벤트 핸들러 (Event Handlers)
  // ==========================================
  const handleTabChange = (next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    setKeyword('');
    setTagFilter('');
    setStatusFilter('');
    setWriterFilter('');
    setPage(1);
    // location.state를 안 갱신하면, 이 화면이 나중에 다시 마운트될 때
    // (예: 다른 라우트 갔다가 뒤로가기) useState(initialTab)이 예전 tab 값을
    // 다시 읽어와서 방금 바꾼 탭이 무시돼버립니다.
    navigate(location.pathname, { replace: true, state: { tab: next } });
  };

  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleTypeFilter = (value: QaTypes['type'] | '') => {
    setTagFilter(value);
    setPage(1);
  };

  const handleStatusFilter = (value: QaTypes['status'] | '') => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleWriterFilter = (value: string) => {
    setWriterFilter(value);
    setPage(1);
  };

  /** 🔑 Q&A / FAQ 삭제 핸들러 (수정됨) */
  const handleDeleteWithPw = async (inputPw: string = '') => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      // Axios DELETE 요청 시 Body로 데이터를 전달할 때는 { data: ... } 옵션을 사용합니다.
      await axiosInstance.delete('/qa', {
        data: {
          no: deleteTarget.no,
          pw: inputPw, // 👈 모달에서 사용자가 입력한 비밀번호 전달
        },
      });

      setAlert({ message: '삭제되었습니다.', variant: 'success', onConfirm: fetchQaList });
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
        <span className={`badge ${QA_STATUS_MAP[n.status].className}`}>
          {QA_STATUS_MAP[n.status].label}
        </span>
      ),
    },
    {
      header: '제목 및 정보',
      render: (n) => (
        <div className="lt">
          <div className="cell_title">
            <Link to={`/dbms/qa/${n.no}`} >
              {n.title}
              {n.vmode === 'Y' ? 
                (<span className='lock'>
                  <span className='hidden'>비밀글</span>
                </span> ) : null
              }
            </Link>
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
              style={{ width: 'auto' }}
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
                style={{ width: 'auto' }}
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
          emptyMessage="등록된 문의가 없습니다."
        />
      ) : (
        <DataAcc
          title={(r) => (
            <>
              <span className={`badge ${QA_TYPE_MAP[r.type].className}`}>
                {QA_TYPE_MAP[r.type].label}
              </span>{' '}
              Q. {r.title}
            </>
          )}
          columns={faqColumns}
          data={qaList}
          rowKey={(r) => r.no}
          emptyMessage="등록된 FAQ가 없습니다."
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

      {/* 🔑 삭제 확인 모달 (수정됨) */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(pw) => handleDeleteWithPw(pw || '')}
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