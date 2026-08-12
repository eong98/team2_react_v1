import { useEffect, useMemo, useState } from 'react';

import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  UserPagination,
} from '../../../components/ui';

import Filterbar from '../../../components/ui/user/Filterbar';

import { axiosInstance } from '../../../utils/Tool';

import type { UpdateLog } from './UpdateLog';

/**
 * 한 페이지에 보여줄 로그 개수
 */
const PAGE_SIZE = 10;

/**
 * USER 업데이트 로그 조회 API
 *
 * 실제 백엔드 API 주소에 맞게 수정
 */
const USER_UPDATE_LOG_API = '/v1/user/update-log';

/**
 * DBMS 업데이트 로그 조회 API
 *
 * 실제 백엔드 API 주소에 맞게 수정
 */
const DBMS_UPDATE_LOG_API = '/v1/dbms/update-log';

/**
 * 로그 대상 구분
 *
 * USER : 일반 회원 로그
 * DBMS : 관리자 로그
 */
type LogTargetType = 'USER' | 'DBMS';

/**
 * 로그 대상 필터
 *
 * ALL   : USER + DBMS
 * USER  : 일반 회원만
 * DBMS  : 관리자만
 */
type TargetFilter = 'ALL' | LogTargetType;

/**
 * USER / DBMS 로그를 하나의 배열로 합친
 * 화면용 로그 타입
 *
 * UpdateLog의 기본 필드에 targetType만 추가한다.
 */
interface CombinedUpdateLog extends UpdateLog {
  /** 로그 대상 구분 */
  targetType: LogTargetType;
}

/**
 * 백엔드에서 내려오는 changedColumn 값을
 * 화면에서 한글로 표시하기 위한 매핑
 */
const COLUMN_LABELS: Record<string, string> = {
  id: '아이디',
  mname: '이름',
  email: '이메일',
  phone: '연락처',
  status: '계정 상태',
  zipcode: '우편번호',
  addr: '주소',
  addrDetail: '상세 주소',
  nation: '국가',
  grade: '등급',
  role: '권한',
  password: '비밀번호'
};

/**
 * 변경 항목 필터 옵션
 */
const FIELD_OPTIONS = [
  {
    value: 'ALL',
    label: '전체 항목',
  },
  {
    value: 'id',
    label: '아이디',
  },
  {
    value: 'userid',
    label: '아이디',
  },
  {
    value: 'userId',
    label: '아이디',
  },
  {
    value: 'mname',
    label: '이름',
  },
  {
    value: 'name',
    label: '이름',
  },
  {
    value: 'email',
    label: '이메일',
  },
  {
    value: 'phone',
    label: '연락처',
  },
  {
    value: 'status',
    label: '계정 상태',
  },
  {
    value: 'grade',
    label: '등급',
  },
  {
    value: 'role',
    label: '권한',
  },
];

/**
 * changedColumn 값을 화면에 표시할 이름으로 변환
 *
 * 매핑되지 않은 값은 백엔드에서 받은
 * 컬럼명을 그대로 보여준다.
 */
function getColumnLabel(column: string) {
  return COLUMN_LABELS[column] ?? column;
}

/**
 * null / undefined / 빈 문자열을 '-'로 표시
 */
function formatValue(
  value: string | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '-';
  }

  return value;
}

/**
 * 날짜 문자열을 Date timestamp로 변환
 *
 * 백엔드 날짜가
 * 2026-08-12 11:30:00
 * 형태로 오는 경우에도 처리한다.
 */
function parseDate(value: string) {
  if (!value) {
    return NaN;
  }

  /**
   * JavaScript Date에서 비교하기 쉽도록
   * 공백을 T로 변경한다.
   */
  const normalizedValue =
    value.includes(' ') &&
    !value.includes('T')
      ? value.replace(' ', 'T')
      : value;

  return new Date(normalizedValue).getTime();
}

/**
 * 날짜를 한국식 날짜/시간 형식으로 표시
 */
function formatDate(value: string) {
  if (!value) {
    return '-';
  }

  const time = parseDate(value);

  /**
   * 날짜 변환에 실패하면
   * 백엔드에서 받은 원본 값을 그대로 표시
   */
  if (Number.isNaN(time)) {
    return value;
  }

  return new Date(time).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

/**
 * DBMS 로그 백엔드 응답 타입
 *
 * 백엔드가 이미 mno를 내려주는 경우도 있고,
 * 기존 관리자 로그처럼 mnno를 내려주는 경우도
 * 있을 수 있기 때문에 둘 다 받을 수 있도록 작성한다.
 */
interface DbmsUpdateLogResponse {
  /** 업데이트 로그 번호 */
  no: number;

  /** 통일된 관리자 번호 */
  mno?: number;

  /** 기존 관리자 로그의 관리자 번호 */
  mnno?: number;

  /** 변경한 컬럼 */
  changedColumn: string;

  /** 변경 전 값 */
  oldValue: string;

  /** 변경 후 값 */
  newValue: string;

  /** 변경 일시 */
  changeDate: string;

  /** 변경한 관리자 번호 */
  updtMnno: number;
}

/**
 * USER / DBMS 업데이트 로그 페이지
 */
export default function UpdateLogList() {
  /**
   * USER 업데이트 로그 목록
   */
  const [userLogs, setUserLogs] = useState<
    UpdateLog[]
  >([]);

  /**
   * DBMS 업데이트 로그 목록
   */
  const [dbmsLogs, setDbmsLogs] = useState<
    UpdateLog[]
  >([]);

  /**
   * 로그 조회 중인지 여부
   */
  const [isLoading, setIsLoading] =
    useState(false);

  /**
   * 로그 대상 필터
   *
   * 기본값은 USER + DBMS 전체 조회
   */
  const [targetFilter, setTargetFilter] =
    useState<TargetFilter>('ALL');

  /**
   * 변경 항목 필터
   */
  const [fieldFilter, setFieldFilter] =
    useState('ALL');

  /**
   * 검색어
   */
  const [keyword, setKeyword] =
    useState('');

  /**
   * 현재 페이지 번호
   */
  const [page, setPage] = useState(1);

  /**
   * USER / DBMS 업데이트 로그를
   * 동시에 조회한다.
   */
  useEffect(() => {
    const fetchUpdateLogs = async () => {
      setIsLoading(true);

      try {
        /**
         * USER 로그와 DBMS 로그를
         * 동시에 요청해서 불러온다.
         */
        const [
          userResponse,
          dbmsResponse,
        ] = await Promise.all([
          axiosInstance.get(
            USER_UPDATE_LOG_API,
          ),

          axiosInstance.get(
            DBMS_UPDATE_LOG_API,
          ),
        ]);

        /**
         * USER 로그 데이터
         *
         * USER 백엔드가 이미
         * mno라는 이름으로 내려준다고 가정한다.
         */
        const userData: UpdateLog[] =
          Array.isArray(
            userResponse.data,
          )
            ? userResponse.data
            : [];

        /**
         * DBMS 로그 데이터
         *
         * DBMS 백엔드가 mno를 내려주면 그대로 사용하고,
         * mnno를 내려주는 경우 mno로 변환한다.
         *
         * 프론트에서는 USER / DBMS 모두
         * 대상 번호를 mno 하나로 통일한다.
         */
        const dbmsData: UpdateLog[] =
          Array.isArray(
            dbmsResponse.data,
          )
            ? (
                dbmsResponse.data as DbmsUpdateLogResponse[]
              ).map((log) => ({
                no: log.no,

                /**
                 * mno가 있으면 mno 사용
                 * 없으면 mnno 사용
                 */
                mno:
                  log.mno ??
                  log.mnno ??
                  0,

                changedColumn:
                  log.changedColumn,

                oldValue:
                  log.oldValue,

                newValue:
                  log.newValue,

                changeDate:
                  log.changeDate,

                updtMnno:
                  log.updtMnno,
              }))
            : [];

        /**
         * 조회한 로그를 state에 저장
         */
        setUserLogs(userData);
        setDbmsLogs(dbmsData);
      } catch (error) {
        /**
         * API 조회 중 오류 발생
         */
        console.error(
          '업데이트 로그 조회 실패:',
          error,
        );

        /**
         * 오류가 발생하면 빈 배열로 초기화
         */
        setUserLogs([]);
        setDbmsLogs([]);
      } finally {
        /**
         * 로딩 종료
         */
        setIsLoading(false);
      }
    };

    fetchUpdateLogs();
  }, []);

  /**
   * USER 로그와 DBMS 로그를
   * 하나의 배열로 합친다.
   */
  const combinedLogs = useMemo<
    CombinedUpdateLog[]
  >(() => {
    /**
     * USER 로그에는 targetType = USER를 추가한다.
     */
    const userData: CombinedUpdateLog[] =
      userLogs.map((log) => ({
        ...log,
        targetType: 'USER',
      }));

    /**
     * DBMS 로그에는 targetType = DBMS를 추가한다.
     */
    const dbmsData: CombinedUpdateLog[] =
      dbmsLogs.map((log) => ({
        ...log,
        targetType: 'DBMS',
      }));

    /**
     * 두 배열을 합쳐 하나의 로그 목록으로 만든다.
     */
    return [...userData, ...dbmsData];
  }, [userLogs, dbmsLogs]);

  /**
   * 대상 / 변경항목 / 검색어를 적용한
   * 로그 목록을 만든다.
   */
  const filteredLogs = useMemo(() => {
    /**
     * 검색어 비교를 위해 소문자로 변환
     */
    const searchKeyword =
      keyword.trim().toLowerCase();

    return combinedLogs.filter((log) => {
      /**
       * USER / DBMS 필터
       *
       * ALL이면 둘 다 통과
       */
      if (
        targetFilter !== 'ALL' &&
        log.targetType !== targetFilter
      ) {
        return false;
      }

      /**
       * 변경 항목 필터
       *
       * ALL이면 모든 변경 항목 통과
       */
      if (
        fieldFilter !== 'ALL' &&
        log.changedColumn !== fieldFilter
      ) {
        return false;
      }

      /**
       * 검색어가 없으면
       * 대상/항목 필터만 적용된 상태로 반환
       */
      if (!searchKeyword) {
        return true;
      }

      /**
       * 검색 가능한 값
       *
       * 대상번호
       * 변경 컬럼
       * 변경 전 값
       * 변경 후 값
       * 변경 관리자 번호
       * USER / DBMS
       */
      const mno = String(log.mno);

      const changedColumn =
        String(
          log.changedColumn ?? '',
        ).toLowerCase();

      const oldValue =
        String(
          log.oldValue ?? '',
        ).toLowerCase();

      const newValue =
        String(
          log.newValue ?? '',
        ).toLowerCase();

      const updtMnno =
        String(log.updtMnno);

      const targetType =
        log.targetType === 'USER'
          ? 'user'
          : 'dbms';

      /**
       * 위 검색 대상 중 하나라도
       * 검색어를 포함하면 표시한다.
       */
      return (
        mno.includes(searchKeyword) ||
        changedColumn.includes(
          searchKeyword,
        ) ||
        oldValue.includes(
          searchKeyword,
        ) ||
        newValue.includes(
          searchKeyword,
        ) ||
        updtMnno.includes(
          searchKeyword,
        ) ||
        targetType.includes(
          searchKeyword,
        )
      );
    });
  }, [
    combinedLogs,
    targetFilter,
    fieldFilter,
    keyword,
  ]);

  /**
   * 로그를 변경 일시 기준으로
   * 최신순(내림차순) 정렬한다.
   *
   * USER / DBMS 필터 여부와 관계없이
   * 항상 최신 로그가 가장 위에 표시된다.
   */
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort(
      (a, b) => {
        /**
         * 변경 일시를 timestamp로 변환
         */
        const dateA = parseDate(
          a.changeDate,
        );

        const dateB = parseDate(
          b.changeDate,
        );

        /**
         * 날짜가 정상적으로 변환되면
         * 최신 날짜가 앞으로 오도록 정렬
         */
        if (
          !Number.isNaN(dateA) &&
          !Number.isNaN(dateB)
        ) {
          return dateB - dateA;
        }

        /**
         * 날짜 형식이 잘못된 경우
         * 로그번호를 기준으로 최신순 정렬
         */
        return b.no - a.no;
      },
    );
  }, [filteredLogs]);

  /**
   * 전체 페이지 수 계산
   */
  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedLogs.length / PAGE_SIZE,
    ),
  );

  /**
   * 검색 / 필터 결과가 줄어들어
   * 현재 페이지가 존재하지 않는 경우
   * 마지막 페이지로 이동
   */
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /**
   * 현재 페이지에 표시할 로그만 추출
   */
  const pagedLogs = sortedLogs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  /**
   * 현재 표시 범위의 시작 번호
   */
  const from =
    sortedLogs.length === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  /**
   * 현재 표시 범위의 마지막 번호
   */
  const to = Math.min(
    page * PAGE_SIZE,
    sortedLogs.length,
  );

  /**
   * 로그 테이블 컬럼 정의
   */
  const columns = useMemo<
    DataTableColumn<CombinedUpdateLog>[]
  >(
    () => [
      {
        /**
         * 업데이트 로그 번호
         */
        header: '로그번호',

        accessor: 'no',

        width: '8%',

        mono: true,
      },

      {
        /**
         * USER / DBMS 구분
         */
        header: '구분',

        width: '9%',

        render: (log) => (
          <span
            className={
              log.targetType === 'USER'
                ? 'badge badge_neutral'
                : 'badge badge_primary'
            }
          >
            {log.targetType === 'USER'
              ? 'USER'
              : 'DBMS'}
          </span>
        ),
      },

      {
        /**
         * 회원번호 또는 관리자번호
         *
         * USER  -> 회원번호
         * DBMS  -> 관리자번호
         */
        header: '대상번호',

        width: '10%',

        mono: true,

        render: (log) => (
          <span>
            {log.mno}
          </span>
        ),
      },

      {
        /**
         * 실제 변경된 컬럼
         */
        header: '변경 항목',

        width: '14%',

        render: (log) => (
          <span className="cell_title">
            {getColumnLabel(
              log.changedColumn,
            )}
          </span>
        ),
      },

      {
        /**
         * 변경 전 값
         */
        header: '변경 전',

        width: '18%',

        render: (log) => (
          <span
            title={formatValue(
              log.oldValue,
            )}
          >
            {formatValue(
              log.oldValue,
            )}
          </span>
        ),
      },

      {
        /**
         * 변경 후 값
         */
        header: '변경 후',

        width: '18%',

        render: (log) => (
          <span
            title={formatValue(
              log.newValue,
            )}
          >
            {formatValue(
              log.newValue,
            )}
          </span>
        ),
      },

      {
        /**
         * 변경된 날짜 및 시간
         */
        header: '변경 일시',

        width: '15%',

        mono: true,

        render: (log) => (
          <span className="mono">
            {formatDate(
              log.changeDate,
            )}
          </span>
        ),
      },

      {
        /**
         * 실제 변경을 수행한 관리자 번호
         */
        header: '변경 관리자',

        width: '8%',

        mono: true,

        render: (log) => (
          <span>
            {log.updtMnno}
          </span>
        ),
      },
    ],
    [],
  );

  /**
   * 검색어가 변경될 때
   *
   * 검색 결과가 달라지므로
   * 1페이지부터 다시 표시한다.
   */
  const handleSearchChange = (
    value: string,
  ) => {
    setKeyword(value);

    setPage(1);
  };

  /**
   * USER / DBMS / 전체 필터 변경
   */
  const handleTargetFilterChange = (
    value: TargetFilter,
  ) => {
    setTargetFilter(value);

    /**
     * 필터를 변경했으므로
     * 1페이지부터 다시 조회
     */
    setPage(1);
  };

  /**
   * 변경 항목 필터 변경
   */
  const handleFieldChange = (
    value: string,
  ) => {
    setFieldFilter(value);

    /**
     * 필터를 변경했으므로
     * 1페이지부터 다시 조회
     */
    setPage(1);
  };

  /**
   * 모든 검색/필터 초기화
   */
  const handleReset = () => {
    setTargetFilter('ALL');

    setFieldFilter('ALL');

    setKeyword('');

    setPage(1);
  };

  return (
    <section className="view active">
      {/* 페이지 제목 */}
      <PageHeader
        title="업데이트 로그"
        description="USER 및 DBMS 계정의 정보 변경 이력을 통합 조회합니다."
      />

      {/* 검색 및 필터 영역 */}
      <Filterbar
        /**
         * 현재 검색 결과 개수 표시
         */
        left={
          <span className="pagination_info">
            전체 로그{' '}

            <em className="b_num">
              {sortedLogs.length}
            </em>

            건 중 {from}–{to}건 표시
          </span>
        }

        /**
         * 검색어
         */
        searchValue={keyword}

        onSearchChange={
          handleSearchChange
        }

        searchPlaceholder="대상번호·변경내용·관리자번호 검색"

        /**
         * 필터 영역
         */
        filters={
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            {/* USER / DBMS / 전체 필터 */}
            <select
              className="form_select"
              value={targetFilter}
              onChange={(e) =>
                handleTargetFilterChange(
                  e.target.value as TargetFilter,
                )
              }
              aria-label="로그 대상 필터"
            >
              <option value="ALL">
                USER + DBMS
              </option>

              <option value="USER">
                USER
              </option>

              <option value="DBMS">
                DBMS
              </option>
            </select>

            {/* 변경 항목 필터 */}
            <select
              className="form_select"
              value={fieldFilter}
              onChange={(e) =>
                handleFieldChange(
                  e.target.value,
                )
              }
              aria-label="변경 항목 필터"
            >
              {FIELD_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </div>
        }

        /**
         * 검색 조건 초기화 버튼
         */
        extra={
          <button
            type="button"
            className="btn btn_outline_primary"
            onClick={handleReset}
          >
            초기화
          </button>
        }
      />

      {/* 로그 테이블 */}
      {isLoading ? (
        /**
         * 로그 조회 중
         */
        <div className="loading_box">
          업데이트 로그를 불러오는 중입니다...
        </div>
      ) : (
        /**
         * 조회가 끝났으면 테이블 표시
         */
        <DataTable<CombinedUpdateLog>
          columns={columns}
          data={pagedLogs}
          /**
           * USER와 DBMS의 로그번호가
           * 서로 중복될 수 있기 때문에
           * targetType + no를 조합해서 key로 사용한다.
           */
          rowKey={(log) =>
            `${log.targetType}-${log.no}`
          }
          emptyMessage="업데이트 로그가 존재하지 않습니다."
        />
      )}

      {/* 페이지네이션 */}
      <UserPagination
        /**
         * 현재 페이지
         */
        page={page}

        /**
         * 전체 페이지 수
         */
        totalPages={totalPages}

        /**
         * 전체 검색 결과 수
         */
        totalCount={
          sortedLogs.length
        }

        /**
         * 한 페이지에 표시할 개수
         */
        pageSize={PAGE_SIZE}

        /**
         * 페이지 변경
         */
        onChange={setPage}

        /**
         * UserPagination 내부의
         * 별도 결과 정보는 숨김
         */
        showInfo={false}
      />
    </section>
  );
}