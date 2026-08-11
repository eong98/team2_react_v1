import { useEffect, useState } from 'react';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AdminToolbar, AlertModal, ConfirmDeleteModal, DbmsPagination, PageHeader, UserPagination } from '../../../components/ui';
import type { DataCardColumn } from '../../../components/ui/common/DataCard';
import DataCard from '../../../components/ui/common/DataCard';
import { axiosInstance } from '../../../utils/Tool';
import { QA_STATUS_MAP, QA_TYPE_MAP, QA_TYPE_OPTIONS, type QaTypes, type TabKey } from '../../../components/ts/QaType';
import type { AccordionCardColumn } from '../../../components/ui/common/DataAcc';
import DataAcc from '../../../components/ui/common/DataAcc';

const PAGE_SIZE = 6;

export default function QaList() {
  const { no:mno, id } = GlobalStoreSession();
  const navigate = useNavigate();
  const location = useLocation();

  // 내 문의 / 자주 묻는 질문 / 전체 문의 탭 — 작성/수정 화면에서 돌아올 때 넘겨준 tab이 있으면 그걸로 시작
  const initialTab = (location.state as { tab?: TabKey })?.tab ?? 'qa';
  const [tab, setTab] = useState<TabKey>(initialTab);

  // 💡 탭 상태 조건 분기
  const isFaq = tab === 'faq';
  const isQaType = tab === 'qa' || tab === 'my'; // Q&A 카드로 표출할 탭 (전체 문의 or 내 문의)

  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 검색 키워드 상태
  const [keyword, setKeyword] = useState<string>('');
  // 유형(접수유형) 필터
  const [tagFilter, setTagFilter] = useState<QaTypes['type'] | ''>('');
  // 상태(답변상태) 필터 — 전체 문의/내 문의 탭에서 사용
  const [statusFilter, setStatusFilter] = useState<QaTypes['status'] | ''>('');
  // 등록자(회원번호) 필터 — 전체 문의 탭에서만 사용
  const [writerFilter, setWriterFilter] = useState<string>('');

  // 현재 페이지 번호 상태
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // ==========================================
  // 2. API 데이터 조회 (Axios GET)
  // ==========================================
  const urlMap: Record<TabKey, string> = {
    my: `/qa/my/${mno}`,     // 내 문의 엔드포인트
    faq: '/qa/faq',   // 자주 묻는 질문
    qa: '/qa/list',   // 전체 문의
  };

  const fetchQaList = async () => {
    if (tab === 'qa' && !mno) return;

    setLoading(true);

    try {
      const url = urlMap[tab];
      const response = await axiosInstance.get(url, {
        params: {
          word: keyword.trim() || undefined,
          type: tagFilter === '' ? undefined : tagFilter,
          status: isQaType && statusFilter !== '' ? statusFilter : undefined,
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

  // ==========================================
  // 4. DataCard / DataAcc 컬럼 정의
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
            <button className='link' onClick={() => navigate(`${n.no}`, { state: { tab } })} >
              {n.title}
              {n.vmode === 'Y' ? 
                (<span className='lock'>
                  <span className='hidden'>비밀글</span>
                </span> ) : null
              }
            </button>
          </div>
          <div className="cell_sub">
            접수유형: {QA_TYPE_OPTIONS.find((t) => t.value === n.type)?.label ?? n.type}
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
        onCreate={() => navigate('new', { state: { tab } })}
      />

      {/* 💡 탭 선택 버튼 3개 분기 */}
      <div className="tabs" role="tablist" aria-label="문의 보기 전환">
        <button
          type="button"
          role="tab"
          className={`tab${tab === 'qa' ? ' on' : ''}`}
          aria-selected={tab === 'qa'}
          onClick={() => handleTabChange('qa')}
        >
          전체 문의
        </button>

        <button
          type="button"
          role="tab"
          className={`tab${tab === 'my' ? ' on' : ''}`}
          aria-selected={tab === 'my'}
          onClick={() => handleTabChange('my')}
        >
          내 문의
        </button>

        <button
          type="button"
          role="tab"
          className={`tab${tab === 'faq' ? ' on' : ''}`}
          aria-selected={tab === 'faq'}
          onClick={() => handleTabChange('faq')}
        >
          자주 묻는 질문
        </button>
      </div>

      <AdminToolbar
        searchValue={keyword}
        onSearchChange={handleSearch}
        searchPlaceholder={isFaq ? 'FAQ 제목·답변으로 검색' : '제목으로 검색'}
        filters={
          <>
            {/* 접수 유형 필터 */}
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

            {/* 답변 상태 필터 (전체 문의 및 내 문의 탭) */}
            {isQaType && (
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

            {/* 회원번호 필터 (전체 문의 탭에서만 표시) */}
            {tab === 'qa' && (
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
              <span className={`badge ${QA_TYPE_MAP[r.type]?.className ?? ''}`}>
                {QA_TYPE_MAP[r.type]?.label ?? r.type}
              </span>{' '}
              Q. {r.title}
            </>
          )}
          columns={faqColumns}
          data={qaList}
          rowKey={(r) => r.no}
          emptyMessage="등록된 FAQ가 없습니다."
          allowMultiple={false}
        />
      )}

      {/* 페이지네이션 컴포넌트 */}
      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

    </section>
  );
}