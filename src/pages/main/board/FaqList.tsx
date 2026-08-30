import { useEffect, useState } from 'react';
import { axiosInstance, getAttachUrl } from '../../../utils/Tool';
import { DataAcc, Filterbar, PageHeader, UserPagination, type DataAccColumn, type DataTableColumn } from '../../../components/ui';
import { EMPTY_FILTERS, QA_TYPE_MAP, type Filters, type QaSearchResult, type QaTypes } from '../../../components/ts/QaType';
import { usePaging } from '../../../hooks/usePaging';
import type { AttachType } from '../../../components/ts/Attach';

/* ---------------------------------------------------------------------
   자주묻는 질문 (/board/faq) — 비회원도 볼 수 있는 FAQ 검색 화면입니다.
   QA 테이블 중 ISFAQ='Y'인 것만 조회합니다(자주묻는 질문으로 등록된 문의).

   검색: 제목/내용 검색어(word)

   API
   GET /qa/faq/search?word=&page=&size= → PageResponse<QaTypes>
--------------------------------------------------------------------- */

const PAGE_SIZE = 6;

export default function FaqList() {
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/board/faq' });

  /* API 데이터 저장 */
  const [faqList, setQaList] = useState<QaTypes[]>([]);
  const [attachMap, setAttachMap] = useState<Record<number, AttachType[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState('');

  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
    
  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadList = async () => {
    setLoading(true);

    try {
      const res = await axiosInstance.get<QaSearchResult>(`/qa/faq`, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.keyword.trim() || undefined,
          type: applied.type === '' ? undefined : Number(applied.type),
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

  useEffect(() => {
    loadList();
  }, [applied, page]);

  
  /* 첨부파일 목록 조회 */
  useEffect(() => {
    if (!faqList) return;
 
    const targets = faqList.filter((n) => n.fileyn === 'Y');
    if (targets.length === 0) return;
 
    Promise.all(
      targets.map((n) =>
        axiosInstance
          .get<AttachType[]>(`/attach/list/${n.no}`)
          .then((res) => [n.no, res.data] as const)
          .catch((err) => {
            console.error(`첨부파일 조회 실패 (no:${n.no}):`, err);
            return [n.no, []] as const;
          }),
      ),
    ).then((results) => {
      setAttachMap(Object.fromEntries(results));
    });
  }, [faqList]);
 

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

  const faqColumns: DataAccColumn<QaTypes>[] = [
    {
      header: 'A. 답변 내용',
      render: (n) => {
        const images = (attachMap[n.no] ?? []).filter((a) => a.type === 0);
 
        return (
          <>
            <div className="lt">
              <div className="cell_title">{n.answer}</div>
              {images.map((a) => (
                <div className='img_area' key={a.no}>
                  <img src={getAttachUrl(a.purl, a.sname)} alt={a.name} />
                </div>
              ))}
            </div>
 
            <div className="me a-r">
              <div className="cell_sub">{n.cdate}</div>
            </div>
          </>
        )
      }
    },
  ];

  return (
    <section className="view active">
      <PageHeader title="자주묻는 질문" description="이용 중 궁금하신 점을 검색해보세요." />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="질문 내용으로 검색"
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
              <option value="">유형 전체</option>
              {Object.entries(QA_TYPE_MAP).map(([type, {label}]) => (
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

      {loading ? (
        <p className="b_title">불러오는 중...</p>
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
          data={faqList}
          rowKey={(r) => r.no}
          loading={loading}
          emptyMessage="등록된 FAQ가 없습니다."
          allowMultiple={false}
        />
        
      )}

      <UserPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
    </section>
  );
}