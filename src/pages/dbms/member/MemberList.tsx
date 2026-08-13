import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  UserPagination,
} from '../../../components/ui';

import Filterbar from '../../../components/ui/user/Filterbar';

import {
  useDbmsStore,
  type TotalMemberUser,
} from '../../../store/DbmsStore';

/**
 * 회원 목록 상단의 계정 구분 필터
 *
 * ALL   : 회원 + 관리자 전체
 * USER  : 일반 회원만
 * ADMIN : 관리자만
 */
const ROLE_OPTIONS = [
  {
    value: 'ALL',
    label: '전체 계정 조회',
  },
  {
    value: 'USER',
    label: '일반 회원만 보기',
  },
  {
    value: 'ADMIN',
    label: '관리자 계정만 보기',
  },
];

/**
 * 한 페이지에 표시할 회원 수
 */
const PAGE_SIZE = 10;

export default function MemberList() {
  const navigate = useNavigate();

  /**
   * DbmsStore에서 회원 목록 및 조회 상태 가져오기
   */
  const memberList = useDbmsStore(
    (state) => state.memberList,
  );

  const isLoading = useDbmsStore(
    (state) => state.isLoading,
  );

  const fetchMemberList = useDbmsStore(
    (state) => state.fetchMemberList,
  );

  /**
   * 검색어
   */
  const [keyword, setKeyword] = useState('');

  /**
   * 현재 페이지
   */
  const [page, setPage] = useState(1);

  /**
   * 회원 / 관리자 필터
   */
  const [roleFilter, setRoleFilter] =
    useState('ALL');

  /**
   * 페이지 진입 시 회원 목록 조회
   */
  useEffect(() => {
    fetchMemberList();
  }, [fetchMemberList]);

  /**
   * 검색 + 회원 구분 필터
   *
   * 검색 대상:
   * - 아이디
   * - 이름
   */
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();

    return memberList.filter((user) => {
      const matchKeyword =
        kw === '' ||
        user.id
          .toLowerCase()
          .includes(kw) ||
        user.mname
          .toLowerCase()
          .includes(kw);

      const matchRole =
        roleFilter === 'ALL' ||
        user.role === roleFilter;

      return (
        matchKeyword &&
        matchRole
      );
    });
  }, [
    memberList,
    keyword,
    roleFilter,
  ]);

  /**
   * 현재 필터 상태에 따라
   * 테이블 컬럼을 동적으로 구성한다.
   *
   * ALL
   *  → 이메일 표시
   *
   * USER
   *  → 주소 / 국가 표시
   *
   * ADMIN
   *  → 관리 등급 / 최근 수정일 표시
   */
  const columns = useMemo(
    (): DataTableColumn<TotalMemberUser>[] => {
      const baseColumns: DataTableColumn<TotalMemberUser>[] = [
        {
          header: '번호',
          accessor: 'no',
          width: '8%',
          mono: true,
        },

        {
          header: '아이디',
          accessor: 'id',
          width: '18%',
          mono: true,
        },

        {
          header: '이름',
          accessor: 'mname',
          width: '15%',
        },

        {
          header: '연락처',
          accessor: 'phone',
          width: '15%',
          mono: true,
        },

        {
          header: '구분',
          width: '10%',
          render: (user) => (
            <span
              style={{
                whiteSpace: 'nowrap',
              }}
            >
              {user.role === 'ADMIN'
                ? '관리자'
                : '회원'}
            </span>
          ),
        },
      ];

      /**
       * 일반 회원만 조회할 때
       */
      if (roleFilter === 'USER') {
        baseColumns.push(
          {
            header: '주소',
            width: '30%',
            render: (user) =>
              user.addr
                ? `[${user.zipcode ?? '-'}] ${user.addr} ${
                    user.addrDetail ?? ''
                  }`
                : '-',
          },

          {
            header: '국가',
            accessor: 'nation',
            width: '10%',
          },
        );
      }

      /**
       * 관리자 계정만 조회할 때
       */
      if (roleFilter === 'ADMIN') {
        baseColumns.push(
          {
            header: '관리 등급',
            width: '12%',
            render: (user) =>
              `Level ${user.grade}`,
          },

          {
            header: '최근 수정일',
            accessor: 'udate',
            width: '15%',
            mono: true,
          },
        );
      }

      /**
       * 전체 계정 조회에서는
       * 회원/관리자 모두에게 공통으로 의미가 있는
       * 이메일을 표시한다.
       */
      if (roleFilter === 'ALL') {
        baseColumns.push({
          header: '이메일',
          accessor: 'email',
          width: '25%',
        });
      }

      /**
       * 마지막에는 등록일을 공통으로 표시
       */
      baseColumns.push({
        header: '등록일',
        accessor: 'cdate',
        width: '15%',
        mono: true,
      });

      return baseColumns;
    },
    [roleFilter],
  );

  /**
   * 전체 페이지 수 계산
   */
  const totalPages = Math.max(
    1,
    Math.ceil(
      filtered.length / PAGE_SIZE,
    ),
  );

  /**
   * 현재 페이지에 실제로 보여줄 데이터
   */
  const paged = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  /**
   * Filterbar 왼쪽의 표시 범위
   */
  const from =
    filtered.length === 0
      ? 0
      : (page - 1) *
          PAGE_SIZE +
        1;

  const to = Math.min(
    page * PAGE_SIZE,
    filtered.length,
  );

  /**
   * 회원 상세 화면 이동
   *
   * USER / ADMIN 여부와 회원 번호를
   * URL 파라미터로 전달한다.
   */
  const handleViewDetail = (
    user: TotalMemberUser,
  ) => {
    navigate(
      `/dbms/memberlist/${user.role}/${user.no}`,
    );
  };

  /**
   * 검색 변경
   *
   * 검색 조건이 바뀌면 1페이지부터 다시 표시
   */
  const handleSearchChange = (
    value: string,
  ) => {
    setKeyword(value);
    setPage(1);
  };

  /**
   * 계정 구분 필터 변경
   */
  const handleRoleChange = (
    value: string,
  ) => {
    setRoleFilter(value);
    setPage(1);
  };

  /**
   * 검색 / 필터 초기화
   */
  const handleReset = () => {
    setKeyword('');
    setRoleFilter('ALL');
    setPage(1);
  };

  return (
    <section className="view active">
      {/* 페이지 제목 영역 */}
      <PageHeader
        title="통합 회원 계정 관리"
        description="가입된 일반 회원과 관제 시스템 관리자 데이터를 통합 조회합니다."
      />

      {/* 검색 및 필터 영역 */}
      <Filterbar
        left={
          <span className="pagination_info">
            조회 결과{' '}
            <em className="b_num">
              {filtered.length}
            </em>
            건 중 {from}–{to}건 표시
          </span>
        }

        searchValue={keyword}
        onSearchChange={
          handleSearchChange
        }
        searchPlaceholder="아이디·이름으로 검색"

        filters={
          <select
            className="form_select"
            value={roleFilter}
            onChange={(e) =>
              handleRoleChange(
                e.target.value,
              )
            }
            aria-label="계정 구분 필터"
          >
            {ROLE_OPTIONS.map(
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
        }

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

      {/* 회원 데이터 테이블 */}
      {isLoading ? (
        <div className="loading_box">
          서버에서 계정 목록을 불러오는 중입니다...
        </div>
      ) : (
        <DataTable<TotalMemberUser>
          columns={columns}
          data={paged}
          rowKey={(user) =>
            `${user.role}-${user.no}`
          }

          /**
           * 기존 MemberList와 동일하게
           * 행 우측에 "상세보기" 버튼을 표시
           */
          onEdit={handleViewDetail}
          editLabel="상세보기"

          emptyMessage="조건에 일치하는 회원 데이터가 존재하지 않습니다."
        />
      )}

      {/* 페이지네이션 */}
      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={filtered.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        showInfo={false}
      />
    </section>
  );
}