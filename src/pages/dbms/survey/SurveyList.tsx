import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  AlertModal,
  PageHeader,
  AdminToolbar,
  ConfirmDeleteModal,
  DataTable,
  DbmsPagination,
} from '../../../components/ui';

import type { DataTableColumn } from '../../../components/ui';
import type { Survey, SurveyStatus } from '../../../components/ts/survey';

import {
  SURVEY_LIST_PAGE_SIZE,
  formatDate,
  getStatusClass,
  getStatusLabel,
  getSurveyStatus,
} from '../../../components/ts/survey';

import {
  deleteSurvey,
  getSurveys,
} from '../../../components/ts/surveyApi';


export default function SurveyList() {
  const navigate = useNavigate();

  // 설문 목록
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);

  // 검색 / 필터
  const [searchText, setSearchText] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | ''>('');

  // 페이지
  const [page, setPage] = useState(1);

  // 삭제
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 알림
  const [alert, setAlert] = useState<{
    message: string;
    variant?: 'success' | 'error';
  } | null>(null);


  /**
   * 전체 설문 목록 조회
   */
  const loadSurveys = async () => {
    try {
      setLoading(true);

      const list = await getSurveys();

      // 최신 설문이 위로 오도록 정렬
      const sorted = [...list].sort((a, b) => b.no - a.no);

      setSurveys(sorted);
    } catch (error: any) {
      console.error(error);

      setAlert({
        message:
          error.response?.data?.message ??
          '설문 목록을 불러오지 못했습니다.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadSurveys();
  }, []);


  /**
   * 검색 버튼
   */
  const onSearch = () => {
    setKeyword(searchText.trim());
    setPage(1);
  };


  /**
   * 검색 조건 초기화
   */
  const onReset = () => {
    setSearchText('');
    setKeyword('');
    setStatusFilter('');
    setPage(1);
  };


  /**
   * 상태 필터
   */
  const handleStatusFilter = (value: string) => {
    if (
      value === 'READY' ||
      value === 'ACTIVE' ||
      value === 'END'
    ) {
      setStatusFilter(value);
    } else {
      setStatusFilter('');
    }

    setPage(1);
  };


  /**
   * 검색 + 상태 필터 적용
   */
  const filtered = useMemo(() => {
    const searchKeyword = keyword.toLowerCase();

    return surveys.filter((survey) => {
      const matchKeyword =
        searchKeyword === '' ||
        survey.title.toLowerCase().includes(searchKeyword);

      const status = getSurveyStatus(survey);

      const matchStatus =
        statusFilter === '' ||
        status === statusFilter;

      return matchKeyword && matchStatus;
    });
  }, [surveys, keyword, statusFilter]);


  /**
   * 페이징
   */
  const totalCount = filtered.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / SURVEY_LIST_PAGE_SIZE)
  );

  const paged = filtered.slice(
    (page - 1) * SURVEY_LIST_PAGE_SIZE,
    page * SURVEY_LIST_PAGE_SIZE
  );


  /**
   * 설문 삭제
   */
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      await deleteSurvey(deleteTarget.no);

      setSurveys((prev) =>
        prev.filter(
          (survey) => survey.no !== deleteTarget.no
        )
      );

      setDeleteTarget(null);

      setAlert({
        message: '설문이 삭제되었습니다.',
        variant: 'success',
      });
    } catch (error: any) {
      console.error(error);

      setAlert({
        message:
          error.response?.data?.message ??
          '설문 삭제 중 오류가 발생했습니다.',
        variant: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };


  /**
   * 설문 목록 컬럼
   */
  const columns: DataTableColumn<Survey>[] = [
    {
      header: '번호',
      render: (survey) => {
        const index = filtered.findIndex(
          (item) => item.no === survey.no
        );

        const virtualNo = filtered.length - index;

        return (
          <span className="mono">
            {virtualNo}
          </span>
        );
      },
    },

    {
      header: '설문 제목',
      render: (survey) => (
        <div>
          <div className="cell_title">
            {survey.title}
          </div>

          <div className="cell_sub">
            설문 No.{survey.no}
          </div>
        </div>
      ),
    },

    {
      header: '상태',
      render: (survey) => {
        const status = getSurveyStatus(survey);

        return (
          <span className={getStatusClass(status)}>
            {getStatusLabel(status)}
          </span>
        );
      },
    },

    {
      header: '설문 기간',
      render: (survey) => (
        <span className="mono">
          {formatDate(survey.startDate)}
          {' ~ '}
          {formatDate(survey.endDate)}
        </span>
      ),
    },

    {
      header: '작성자',
      render: (survey) => (
        <span className="mono">
          관리자 {survey.memberNo}
        </span>
      ),
    },

    {
      header: '등록일',
      render: (survey) => (
        <span className="mono">
          {formatDate(survey.cdate)}
        </span>
      ),
    },

    {
      header: '응답',
      render: (survey) => (
        <button
          type="button"
          className="btn btn_sm btn_ghost"
          onClick={() =>
            navigate(`${survey.no}/responses`)
          }
        >
          응답관리
        </button>
      ),
    },
  ];


  return (
    <section className="view active">

      <PageHeader
        title="설문 관리"
        description="점주 대상 설문을 등록하고 진행 상태 및 응답을 관리합니다."
        createLabel="+ 설문 작성"
        onCreate={() => navigate('create')}
      />


      {/* 검색 / 상태 필터 */}
      <AdminToolbar
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="설문 제목으로 검색"
        filters={
          <select
            className="form_select"
            value={statusFilter}
            onChange={(e) =>
              handleStatusFilter(e.target.value)
            }
            aria-label="설문 상태 필터"
          >
            <option value="">상태 전체</option>
            <option value="READY">예정</option>
            <option value="ACTIVE">진행중</option>
            <option value="END">종료</option>
          </select>
        }
        extra={
          <>
            <button
              type="button"
              className="btn btn_ghost"
              onClick={onReset}
            >
              초기화
            </button>

            <button
              type="button"
              className="btn btn_primary"
              onClick={onSearch}
            >
              검색
            </button>
          </>
        }
      />


      {/* 설문 목록 */}
      <DataTable
        columns={columns}
        data={paged}
        rowKey={(survey) => survey.no}
        loading={loading}
        onEdit={(survey) =>
          navigate(`${survey.no}/edit`)
        }
        onDelete={(survey) =>
          setDeleteTarget(survey)
        }
        editLabel="수정"
        deleteLabel="삭제"
        emptyMessage="등록된 설문이 없습니다."
      />


      {/* 페이지네이션 + 총 건수 */}
      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={SURVEY_LIST_PAGE_SIZE}
        onChange={setPage}
      />


      {/* 삭제 확인 */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="설문을 삭제하시겠습니까?"
        description="설문과 연결된 문항 및 응답 데이터도 함께 삭제될 수 있습니다. 삭제 후에는 복구할 수 없습니다."
        targetLabel={
          deleteTarget
            ? `No.${deleteTarget.no} · ${deleteTarget.title}`
            : undefined
        }
      />


      {/* 결과 알림 */}
      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />

    </section>
  );
}