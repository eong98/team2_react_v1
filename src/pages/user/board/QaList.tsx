import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import type { DataCardColumn } from '../../../components/ui/common/DataCard';
import DataCard from '../../../components/ui/common/DataCard';
import { axiosInstance } from '../../../utils/Tool';
import type { QaTypes } from './QaType';


const PAGE_SIZE = 6;
export default function QaList() {
  const navigate = useNavigate();
  // 임시 번호
  const mno = 1;

  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 검색 키워드 상태
  const [keyword, setKeyword] = useState<string>('');
  // 태그로 검색
  const [tagFilter, setTagFilter] = useState<QaTypes['type'] | ''>('');

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
    if (!mno) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/qa/my/${mno}`, {
        params: {
          word: keyword.trim() || undefined, // 검색어가 없으면 요청 파라미터에서 제외
          page: page - 1,   // 💡 Spring Pageable은 0부터 시작
          size: PAGE_SIZE,
        },
      });
      
      const data = response.data;
      // PageResponse의 필드에 맞게 추출 (content / dtoList 확인 필요)
      setQaList(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalElements || 0);
    } catch (error) {
      console.error('Q&A 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 페이지 번호나 검색 키워드가 변경될 때마다 API 호출
  useEffect(() => {
    fetchQaList();
  }, [page, keyword]);

  // ==========================================
  // 3. 이벤트 핸들러 (Event Handlers)
  // ==========================================
  /** 검색어 변경 핸들러 */
  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1); // 새로운 검색 시 첫 페이지로 이동
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
  const columns: DataCardColumn<QaTypes>[] = [
    {
      header: '상태',
      render: (n) => (
        <span
          className={`badge ${
            n.status === 2 ? 'badge_success' : 'badge_warning'
          }`}
        >
          {n.status}
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
            {n.cdate} · 접수유형: {n.type}
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="고객의 소리"
        description="문의 등록 및 FAQ를 확인할 수 있습니다."
        createLabel="+ 문의 작성"
        onCreate={() => navigate('new')}
      />

      <DataCard
        columns={columns}
        data={qaList}
        rowKey={(n) => n.no}
        loading={loading}
        onEdit={(n) => navigate(`${n.no}/edit`)}
        onDelete={(n) => setDeleteTarget(n)}
      />

      {/* 페이지네이션 컴포넌트 */}
      {/* <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      /> */}

      {/* 삭제 확인 모달 */}
      {/* <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={
          deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined
        }
      /> */}
    </section>
  );
}