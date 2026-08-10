import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ⭐️ 1. useNavigate 추가
import { PageHeader, DataTable, type DataTableColumn, UserPagination } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { useDbmsStore, type TotalMemberUser } from '../../../store/DbmsStore'; 

const ROLE_OPTIONS = [
  { value: 'ALL', label: '전체 계정 조회' },
  { value: 'USER', label: '일반 회원만 보기' },
  { value: 'ADMIN', label: '관리자 계정만 보기' }
];

const PAGE_SIZE = 10;

export default function MemberList() {
  const navigate = useNavigate(); // ⭐️ 2. 네비게이트 훅 선언

  const memberList = useDbmsStore((state) => state.memberList);
  const isLoading = useDbmsStore((state) => state.isLoading);
  const fetchMemberList = useDbmsStore((state) => state.fetchMemberList);

  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    fetchMemberList();
  }, [fetchMemberList]);

  // 키워드 검색 엔진 (아이디 또는 mname(이름)으로 복합 검색 가능)
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return memberList.filter((user) => {
      const matchKeyword = kw === '' || user.id.toLowerCase().includes(kw) || user.mname.toLowerCase().includes(kw);
      const matchRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchKeyword && matchRole;
    });
  }, [memberList, keyword, roleFilter]);

  // 백엔드 DTO에 완벽하게 맞춘 동적 컬럼 분기 로직
  const columns = useMemo((): DataTableColumn<TotalMemberUser>[] => {
    const baseColumns: DataTableColumn<TotalMemberUser>[] = [
      { header: '번호', accessor: 'no', width: '8%', mono: true },
      { header: '아이디', accessor: 'id', width: '18%', mono: true },
      { header: '이름', accessor: 'mname', width: '15%' }, 
      { header: '연락처', accessor: 'phone', width: '15%' },
      { 
        header: '구분', 
        width: '10%',
        render: (user) => (
          <span style={{ whiteSpace: 'nowrap' }}>
            {user.role === 'ADMIN' ? '관리자' : '회원'}
          </span>
        ) 
      },
    ];

    if (roleFilter === 'USER') {
      baseColumns.push(
        { 
          header: '주소', 
          render: (user) => user.addr ? `[${user.zipcode}] ${user.addr} ${user.addrDetail || ''}` : '-' 
          ,width: '30%' 
        },
        { header: '국가', accessor: 'nation', width: '10%' }
      );
    }

    if (roleFilter === 'ADMIN') {
      baseColumns.push(
        { header: '관리 등급', render: (user) => `Level ${user.grade}`, width: '12%' },
        { header: '최근 수정일', accessor: 'udate', width: '15%', mono: true }
      );
    }

    if (roleFilter === 'ALL') {
      baseColumns.push({ header: '이메일', accessor: 'email', width: '25%' });
    }

    baseColumns.push({ header: '등록일', accessor: 'cdate', mono: true, width: '15%' });

    return baseColumns;
  }, [roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  // ⭐️ 3. 상세보기 버튼 클릭 시 페이지 라우팅 이동 핸들러
  // 회원과 관리자 구분을 위해 주소창 경로에 role과 고유 일련번호(no)를 파라미터로 실어 보냅니다.
  const handleViewDetail = (user: TotalMemberUser) => {
    navigate(`/dbms/memberlist/${user.role}/${user.no}`);
  };

  return (
    <section className="view active">
      <PageHeader title="통합 회원 계정 관리" description="가입된 일반 회원과 관제 시스템 관리자 데이터를 통합 조회합니다." />

      <Filterbar
        left={<span className="pagination_info">조회 결과 <em className='b_num'>{filtered.length}</em>건 중 {from}–{to}건 표시</span>}
        searchValue={keyword}
        onSearchChange={(val) => { setKeyword(val); setPage(1); }}
        searchPlaceholder="아이디·이름으로 검색"
        filters={
          <select className="form_select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} aria-label="계정 구분 필터">
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        }
        extra={
          <button type="button" className="btn btn_outline_primary" onClick={() => { setKeyword(''); setRoleFilter('ALL'); setPage(1); }}>
            초기화
          </button>
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

      <UserPagination page={page} totalPages={totalPages} totalCount={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} showInfo={false} />
    </section>
  );
}