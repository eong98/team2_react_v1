import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  PageHeader,
  AdminToolbar,
  ConfirmDeleteModal,
  DataTable,
  DbmsPagination,
} from '../../../components/ui';


import type {
  DataTableColumn,
} from '../../../components/ui';


/* =========================================================
   설문 목록 데이터 타입
========================================================= */

/**
 * GET /api/surveys 응답에서
 * 목록 화면에 필요한 값만 정의합니다.
 *
 * questions는 목록 화면에서는 사용하지 않지만,
 * 백엔드 응답에 포함될 수 있으므로 optional로 둡니다.
 */
interface Survey {
  no: number;

  memberNo: number;

  title: string;

  detail: string;

  startDate: string;

  endDate: string;

  cdate: string;

  questions?: unknown[];
}


/* =========================================================
   설문 상태 타입
========================================================= */

/**
 * 설문 기간을 기준으로 프론트에서 상태를 계산합니다.
 *
 * READY  : 시작 전
 * ACTIVE : 진행 중
 * END    : 종료
 */
type SurveyStatus =
  | 'READY'
  | 'ACTIVE'
  | 'END';


/* =========================================================
   API
========================================================= */

/**
 * 현재 설문 백엔드는 9103 포트에서 테스트 중입니다.
 *
 * 추후 팀 백엔드 포트가 통합되면
 * 공통 axiosInstance로 교체하면 됩니다.
 */
const surveyApi = axios.create({
  baseURL: 'http://localhost:9103',
});


/* =========================================================
   페이지 설정
========================================================= */

/**
 * 한 페이지에 표시할 설문 개수
 */
const PAGE_SIZE = 3;


/* =========================================================
   날짜 유틸
========================================================= */

/**
 * 서버 날짜:
 * 2026-08-07 00:00:00
 *
 * 목록 표시:
 * 2026-08-07
 */
const formatDate = (
  value?: string
) => {

  if (!value) {
    return '-';
  }

  return value.slice(0, 10);
};


/**
 * 서버의 yyyy-MM-dd HH:mm:ss 형식을
 * Date로 변환하기 위한 함수입니다.
 *
 * 브라우저에서
 * "2026-08-07 00:00:00"
 * 형식을 바로 Date로 처리하면
 * 환경에 따라 결과가 달라질 수 있으므로
 * 공백을 T로 변경합니다.
 */
const toDate = (
  value: string
) => {

  return new Date(
    value.replace(' ', 'T')
  );
};


/* =========================================================
   설문 진행 상태 계산
========================================================= */

/**
 * 현재 시간과
 * 설문의 시작일 / 종료일을 비교해서
 * 상태를 계산합니다.
 *
 * 백엔드 STATUS 컬럼을 쓰지 않는 현재 구조에서는
 * 목록 화면에서 날짜 기준으로 상태를 판단합니다.
 */
const getSurveyStatus = (
  survey: Survey
): SurveyStatus => {

  const now =
    new Date();

  const start =
    toDate(
      survey.startDate
    );

  const end =
    toDate(
      survey.endDate
    );


  if (
    now < start
  ) {

    return 'READY';

  }


  if (
    now > end
  ) {

    return 'END';

  }


  return 'ACTIVE';
};


/* =========================================================
   상태 표시 문구
========================================================= */

const getStatusLabel = (
  status: SurveyStatus
) => {

  if (
    status === 'READY'
  ) {

    return '예정';

  }


  if (
    status === 'ACTIVE'
  ) {

    return '진행중';

  }


  return '종료';
};


/* =========================================================
   상태 Badge 클래스
========================================================= */

/**
 * 기존 dbms.css의 badge 계열 클래스를 재사용합니다.
 *
 * 프로젝트 CSS에 정확한 badge 클래스가 다를 경우
 * 디자인 담당자가 나중에 조정하면 됩니다.
 */
const getStatusClass = (
  status: SurveyStatus
) => {

  if (
    status === 'ACTIVE'
  ) {

    return 'badge badge_success';

  }


  if (
    status === 'READY'
  ) {

    return 'badge badge_info';

  }


  return 'badge';
};


/* =========================================================
   SurveyList Component
========================================================= */

export default function SurveyList() {

  const navigate =
    useNavigate();


  /* =======================================================
     서버 데이터
  ======================================================= */

  const [
    surveys,
    setSurveys,
  ] = useState<Survey[]>([]);


  /* =======================================================
     검색 / 필터
  ======================================================= */

  const [
    keyword,
    setKeyword,
  ] = useState('');


  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    SurveyStatus | ''
  >('');


  /* =======================================================
     페이지
  ======================================================= */

  const [
    page,
    setPage,
  ] = useState(1);


  /* =======================================================
     로딩
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(false);


  /* =======================================================
     삭제 대상
  ======================================================= */

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<Survey | null>(
    null
  );


  const [
    deleting,
    setDeleting,
  ] = useState(false);


  /* =======================================================
     설문 목록 조회
  ======================================================= */

  const loadSurveys =
    async () => {

      try {

        setLoading(true);


        /**
         * 관리자 전체 설문 목록
         *
         * GET /api/surveys
         */
        const response =
          await surveyApi.get(
            '/api/surveys'
          );


        /**
         * 최신 설문이 위로 오도록
         * no 기준 내림차순 정렬합니다.
         */
        const list:
          Survey[] =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];


        const sorted =
          [...list].sort(
            (a, b) =>
              b.no - a.no
          );


        setSurveys(
          sorted
        );

      } catch (
        error: any
      ) {

        console.error(
          error
        );


        alert(
          error.response
            ?.data
            ?.message
          ?? '설문 목록을 불러오지 못했습니다.'
        );

      } finally {

        setLoading(false);

      }

    };


  /**
   * 페이지 최초 진입 시
   * 설문 목록을 조회합니다.
   */
  useEffect(() => {

    loadSurveys();

  }, []);


  /* =======================================================
     검색 + 상태 필터
  ======================================================= */

  const filtered =
    useMemo(() => {

      /**
       * 검색어 공백 제거 및 소문자 변환
       */
      const searchKeyword =
        keyword
          .trim()
          .toLowerCase();


      return surveys.filter(
        (survey) => {

          /**
           * 제목 검색
           *
           * 필요하면 나중에
           * 상세내용 검색까지 확장 가능합니다.
           */
          const matchKeyword =
            searchKeyword === ''
            ||
            survey.title
              .toLowerCase()
              .includes(
                searchKeyword
              );


          /**
           * 설문 상태
           */
          const status =
            getSurveyStatus(
              survey
            );


          const matchStatus =
            statusFilter === ''
            ||
            status
            === statusFilter;


          return (
            matchKeyword
            &&
            matchStatus
          );

        }
      );

    }, [
      surveys,
      keyword,
      statusFilter,
    ]);


  /* =======================================================
     페이지 계산
  ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length
        / PAGE_SIZE
      )
    );


  /**
   * 검색 결과에서
   * 현재 페이지 데이터만 잘라냅니다.
   */
  const paged =
    filtered.slice(
      (page - 1)
      * PAGE_SIZE,

      page
      * PAGE_SIZE
    );


  /* =======================================================
     검색
  ======================================================= */

  const handleSearch = (
    value: string
  ) => {

    setKeyword(
      value
    );


    /**
     * 검색 조건 변경 시
     * 첫 페이지로 이동합니다.
     */
    setPage(1);

  };


  /* =======================================================
     상태 필터
  ======================================================= */

  const handleStatusFilter = (
    value: string
  ) => {

    if (
      value === 'READY'
    ) {

      setStatusFilter(
        'READY'
      );

    } else if (
      value === 'ACTIVE'
    ) {

      setStatusFilter(
        'ACTIVE'
      );

    } else if (
      value === 'END'
    ) {

      setStatusFilter(
        'END'
      );

    } else {

      setStatusFilter('');

    }


    setPage(1);

  };


  /* =======================================================
     설문 삭제
  ======================================================= */

  const handleDelete =
    async () => {

      if (
        !deleteTarget
      ) {

        return;

      }


      try {

        setDeleting(true);


        /**
         * 설문 삭제
         *
         * DELETE /api/surveys/{surveyNo}
         *
         * 백엔드 테스트에서
         * 204 No Content 정상 동작을 확인했습니다.
         */
        await surveyApi.delete(
          `/api/surveys/${deleteTarget.no}`
        );


        /**
         * 삭제 성공 후
         * 화면 목록에서도 제거합니다.
         */
        setSurveys(
          (prev) =>
            prev.filter(
              (survey) =>
                survey.no
                !== deleteTarget.no
            )
        );


        setDeleteTarget(
          null
        );


        alert(
          '설문이 삭제되었습니다.'
        );

      } catch (
        error: any
      ) {

        console.error(
          error
        );


        alert(
          error.response
            ?.data
            ?.message
          ?? '설문 삭제 중 오류가 발생했습니다.'
        );

      } finally {

        setDeleting(false);

      }

    };


  /* =======================================================
     테이블 컬럼
  ======================================================= */

  const columns:
    DataTableColumn<Survey>[] = [

      /**
       * 회의에서 정한
       * 가상 번호 방식입니다.
       *
       * DB의 실제 PK(NO)를 그대로 보여주지 않고
       * 전체 데이터 개수 기준으로
       * 100, 99, 98... 형태로 표시합니다.
       */
      {
        header: '번호',

        render:
          (survey) => {

            /**
             * 현재 설문이
             * 필터 결과에서 몇 번째 데이터인지 찾습니다.
             */
            const index =
              filtered.findIndex(
                (item) =>
                  item.no
                  === survey.no
              );


            const virtualNo =
              filtered.length
              - index;


            return (
              <span className="mono">

                {virtualNo}

              </span>
            );
          },
      },


      /* 설문 제목 */

      {
        header: '설문 제목',

        render:
          (survey) => (

            <div>

              <div className="cell_title">

                {survey.title}

              </div>


              <div className="cell_sub">

                설문 No.
                {survey.no}

              </div>

            </div>

          ),
      },


      /* 진행 상태 */

      {
        header: '상태',

        render:
          (survey) => {

            const status =
              getSurveyStatus(
                survey
              );


            return (

              <span
                className={
                  getStatusClass(
                    status
                  )
                }
              >

                {
                  getStatusLabel(
                    status
                  )
                }

              </span>

            );
          },
      },


      /* 설문 기간 */

      {
        header: '설문 기간',

        render:
          (survey) => (

            <span className="mono">

              {
                formatDate(
                  survey.startDate
                )
              }

              {' ~ '}

              {
                formatDate(
                  survey.endDate
                )
              }

            </span>

          ),
      },


      /* 작성자 회원번호 */

      {
        header: '작성자',

        render:
          (survey) => (

            <span className="mono">

              관리자
              {' '}
              {survey.memberNo}

            </span>

          ),
      },


      /* 등록일 */

      {
        header: '등록일',

        render:
          (survey) => (

            <span className="mono">

              {
                formatDate(
                  survey.cdate
                )
              }

            </span>

          ),
      },


      /**
       * 응답관리
       *
       * 공용 DataTable에는 기본적으로
       * 수정/삭제 액션만 있으므로
       * 응답관리는 일반 컬럼에 버튼으로 넣습니다.
       */
      {
        header: '응답',

        render:
          (survey) => (

            <button
              type="button"
              className="
                btn
                btn_sm
                btn_ghost
              "
              onClick={
                () =>
                  navigate(
                    `${survey.no}/responses`
                  )
              }
            >

              응답관리

            </button>

          ),
      },

    ];


  /* =======================================================
     화면
  ======================================================= */

  return (

    <section className="view active">


      {/* ===================================================
          페이지 헤더
      =================================================== */}

      <PageHeader

        title="설문 관리"

        description="
          점주 대상 설문을 등록하고
          진행 상태 및 응답을 관리합니다.
        "

        /**
         * /dbms/survey/create
         */
        createLabel="+ 설문 작성"

        onCreate={
          () =>
            navigate(
              'create'
            )
        }

      />


      {/* ===================================================
          검색 / 필터
      =================================================== */}

      <AdminToolbar

        searchValue={
          keyword
        }

        onSearchChange={
          handleSearch
        }

        searchPlaceholder="
          설문 제목으로 검색
        "

        filters={

          <select
            className="form_select"
            value={
              statusFilter
            }
            onChange={
              (e) =>
                handleStatusFilter(
                  e.target.value
                )
            }
            aria-label="설문 상태 필터"
          >

            <option value="">
              상태 전체
            </option>

            <option value="READY">
              예정
            </option>

            <option value="ACTIVE">
              진행중
            </option>

            <option value="END">
              종료
            </option>

          </select>

        }

        /**
         * 새로고침은 있으면 편해서 추가했습니다.
         *
         * 필요 없으면 extra 전체를 삭제해도 됩니다.
         */
        extra={

          <button
            type="button"
            className="
              btn
              btn_sm
              btn_ghost
            "
            onClick={
              loadSurveys
            }
            disabled={
              loading
            }
          >

            새로고침

          </button>

        }

      />


      {/* ===================================================
          설문 목록
      =================================================== */}

      <DataTable

        columns={
          columns
        }

        data={
          paged
        }

        rowKey={
          (survey) =>
            survey.no
        }

        loading={
          loading
        }

        /**
         * 수정 버튼
         *
         * /dbms/survey/{no}/edit
         */
        onEdit={
          (survey) =>
            navigate(
              `${survey.no}/edit`
            )
        }

        /**
         * 삭제 버튼 클릭 시
         * 바로 삭제하지 않고
         * ConfirmDeleteModal을 엽니다.
         */
        onDelete={
          (survey) =>
            setDeleteTarget(
              survey
            )
        }

        editLabel="수정"

        deleteLabel="삭제"

        emptyMessage="
          등록된 설문이 없습니다.
        "

      />


      {/* ===================================================
          페이지네이션
      =================================================== */}

      <DbmsPagination

        page={
          page
        }

        totalPages={
          totalPages
        }

        totalCount={
          filtered.length
        }

        pageSize={
          PAGE_SIZE
        }

        onChange={
          setPage
        }

      />


      {/* ===================================================
          삭제 확인 모달
      =================================================== */}

      <ConfirmDeleteModal

        open={
          deleteTarget
          !== null
        }

        onClose={
          () =>
            setDeleteTarget(
              null
            )
        }

        onConfirm={
          handleDelete
        }

        loading={
          deleting
        }

        title="
          설문을 삭제하시겠습니까?
        "

        description="
          설문과 연결된 문항 및 응답 데이터도 함께 삭제될 수 있습니다.
          삭제 후에는 복구할 수 없습니다.
        "

        targetLabel={
          deleteTarget
            ? `No.${deleteTarget.no} · ${deleteTarget.title}`
            : undefined
        }

      />


    </section>

  );

}