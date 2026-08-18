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

/** 회원 목록 상단의 계정 구분 필터 */
const ROLE_OPTIONS = [
  { value: 'ALL', label: '전체 계정 조회' },
  { value: 'USER', label: '일반 회원만 보기' },
  { value: 'ADMIN', label: '관리자 계정만 보기' },
];

/** 검색 대상 필드 선택 옵션 — 선택한 필드에서만 키워드를 매칭합니다. */
type SearchField = 'no' | 'id' | 'mname' | 'phone' | 'email';

const SEARCH_FIELD_OPTIONS: { value: SearchField; label: string }[] = [
  { value: 'no', label: '번호' },
  { value: 'id', label: '아이디' },
  { value: 'mname', label: '이름' },
  { value: 'phone', label: '연락처' },
  { value: 'email', label: '이메일' },
];

interface Filters {
  keyword: string;
  searchField: SearchField;
  roleFilter: string; // 'ALL' | 'USER' | 'ADMIN'
  dateFrom: string; // 등록일 시작 (yyyy-MM-dd)
  dateTo: string; // 등록일 종료 (yyyy-MM-dd)
}

const EMPTY_FILTERS: Filters = {
  keyword: '',
  searchField: 'id',
  roleFilter: 'ALL',
  dateFrom: '',
  dateTo: '',
};

const PAGE_SIZE = 10;

const parseDate = (val?: string | null) => {
  if (!val) return NaN;
  return new Date(val.includes(' ') && !val.includes('T') ? val.replace(' ', 'T') : val).getTime();
};

export default function MemberList() {
  const navigate = useNavigate();

  const memberList = useDbmsStore((state) => state.memberList);
  const isLoading = useDbmsStore((state) => state.isLoading);
  const fetchMemberList = useDbmsStore((state) => state.fetchMemberList);

  const [page, setPage] = useState(1);

  // draft: 입력 중인 값(타이핑만으로는 검색 안 됨) / applied: Enter·검색버튼 눌렀을 때 실제 필터링에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    fetchMemberList();
  }, [fetchMemberList]);

  /**
   * 계정 구분 + 검색항목별 키워드 + 등록일 범위 필터 (전부 applied 기준으로만 계산)
   */
  const filtered = useMemo(() => {
    const kw = applied.keyword.trim().toLowerCase();
    const fromTime = applied.dateFrom ? new Date(`${applied.dateFrom}T00:00:00`).getTime() : null;
    const toTime = applied.dateTo ? new Date(`${applied.dateTo}T23:59:59`).getTime() : null;

    return memberList.filter((user) => {
      const matchRole = applied.roleFilter === 'ALL' || user.role === applied.roleFilter;
      if (!matchRole) return false;

      if (fromTime !== null || toTime !== null) {
        const t = parseDate(user.cdate);
        if (Number.isNaN(t)) return false;
        if (fromTime !== null && t < fromTime) return false;
        if (toTime !== null && t > toTime) return false;
      }

      if (!kw) return true;

      switch (applied.searchField) {
        case 'no':
          return String(user.no).includes(kw);
        case 'id':
          return user.id.toLowerCase().includes(kw);
        case 'mname':
          return user.mname.toLowerCase().includes(kw);
        case 'phone':
          return (user.phone ?? '').toLowerCase().includes(kw);
        case 'email':
          return (user.email ?? '').toLowerCase().includes(kw);
        default:
          return true;
      }
    });
  }, [memberList, applied]);

  /**
   * 현재 필터 상태에 따라 테이블 컬럼을 동적으로 구성합니다.
   * 순서: 번호 → 구분 → 아이디 → 이름 → 연락처 → (역할별 추가 컬럼) → 등록일
   */
  const columns = useMemo((): DataTableColumn<TotalMemberUser>[] => {
    const baseColumns: DataTableColumn<TotalMemberUser>[] = [
      { header: '번호', accessor: 'no', width: '8%', mono: true },
      {
        header: '구분',
        width: '9%',
        render: (user) => (
          <span style={{ whiteSpace: 'nowrap' }}>{user.role === 'ADMIN' ? '관리자' : '회원'}</span>
        ),
      },
      { header: '아이디', accessor: 'id', width: '16%', mono: true },
      { header: '이름', accessor: 'mname', width: '13%' },
      { header: '연락처', accessor: 'phone', width: '14%', mono: true },
    ];

    if (applied.roleFilter === 'USER') {
      baseColumns.push(
        {
          header: '주소',
          width: '26%',
          render: (user) => (user.addr ? `[${user.zipcode ?? '-'}] ${user.addr} ${user.addrDetail ?? ''}` : '-'),
        },
        { header: '국가', accessor: 'nation', width: '8%' },
      );
    }

    if (applied.roleFilter === 'ADMIN') {
      baseColumns.push(
        { header: '관리 등급', width: '10%', render: (user) => `Level ${user.grade}` },
        { header: '최근 수정일', accessor: 'udate', width: '13%', mono: true },
      );
    }

    if (applied.roleFilter === 'ALL') {
      baseColumns.push({ header: '이메일', accessor: 'email', width: '20%' });
    }

    baseColumns.push({ header: '등록일', accessor: 'cdate', width: '13%', mono: true });

    return baseColumns;
  }, [applied.roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  const handleViewDetail = (user: TotalMemberUser) => {
    navigate(`/dbms/memberlist/${user.role}/${user.no}`);
  };

  // [검색 버튼 클릭 / Enter] draft를 applied로 확정하고 1페이지로 이동
  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  // [초기화 버튼 클릭] 모든 필터 조건 초기화
  const onReset = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  };

  return (
    <section className="view active">
      <PageHeader
        title="통합 회원 계정 관리"
        description="가입된 일반 회원과 관제 시스템 관리자 데이터를 통합 조회합니다."
      />

      <Filterbar
        left={
          <span className="pagination_info">
            조회 결과 <em className="b_num">{filtered.length}</em>건 중 {from}–{to}건 표시
          </span>
        }
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="검색어를 입력하세요"
        filters={
          <>
            <select
              className="form_select"
              value={draft.roleFilter}
              onChange={(e) => setDraft((prev) => ({ ...prev, roleFilter: e.target.value }))}
              aria-label="계정 구분 필터"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.searchField}
              onChange={(e) => setDraft((prev) => ({ ...prev, searchField: e.target.value as SearchField }))}
              aria-label="검색 항목 선택"
            >
              {SEARCH_FIELD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="등록일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="등록일 종료"
            />
          </>
        }
        extra={
          <>
            <button type="button" className="btn btn_outline_primary" onClick={onReset}>
              초기화
            </button>
            <button type="button" className="btn btn_primary" onClick={onSearch}>
              검색
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="loading_box">서버에서 계정 목록을 불러오는 중입니다...</div>
      ) : (
        <DataTable<TotalMemberUser>
          columns={columns}
          data={paged}
          rowKey={(user) => `${user.role}-${user.no}`}
          onEdit={handleViewDetail}
          editLabel="상세보기"
          emptyMessage="조건에 일치하는 회원 데이터가 존재하지 않습니다."
        />
      )}

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