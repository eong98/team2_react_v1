import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, UserPagination } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';

interface Store {
  name: string;
  addr: string;
  cams: number;
  todayEvents: number;
  status: 'danger' | 'warning' | 'success';
  statusText: string;
}

const STORES: Store[] = [
  { name: '본점 · 스터디카페 A', addr: '서울 강남구 · 카메라 6대', cams: 6, todayEvents: 5, status: 'danger', statusText: '이상 감지' },
  { name: '2호점 · 무인카페 B', addr: '서울 마포구 · 카메라 4대', cams: 4, todayEvents: 0, status: 'success', statusText: '정상' },
  { name: '3호점 · 스터디카페 C', addr: '경기 성남시 · 카메라 8대', cams: 8, todayEvents: 2, status: 'warning', statusText: '주의' },
  { name: '4호점 · 무인카페 D', addr: '인천 부평구 · 카메라 4대', cams: 4, todayEvents: 0, status: 'success', statusText: '정상' },
];

const STATUS_LIST: { value: Store['status']; label: string }[] = [
  { value: 'danger', label: '이상 감지' },
  { value: 'warning', label: '주의' },
  { value: 'success', label: '정상' },
];

const PAGE_SIZE = 6;

export default function Test4() {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<Store['status'] | ''>('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return STORES.filter((s) => {
      const matchKeyword = kw === '' || s.name.toLowerCase().includes(kw) || s.addr.toLowerCase().includes(kw);
      const matchStatus = statusFilter === '' || s.status === statusFilter;
      return matchKeyword && matchStatus;
    });
  }, [keyword, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  const goSearch = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const selectStatus = (status: Store['status'] | '') => {
    setStatusFilter(status);
    setPage(1);
  };

  // TODO: 매장 전환 상태를 여러 화면(Topbar 등)이 같이 봐야 하면 전역 상태/API로 옮겨야 합니다.
  // 지금은 우선 실시간 관제 화면으로 이동만 시킵니다.
  const enterStore = (name: string) => {
    console.log('매장 전환:', name);
    navigate('../test1');
  };

  return (
    <section className="view active">
      <PageHeader 
      title="매장 목록" 
      description="운영 중인 매장을 선택해 관제 화면으로 전환합니다." 
      createLabel="+ 매장생성"
      onCreate={() => navigate('new')}
      />

      <Filterbar
        searchValue={keyword}
        onSearchChange={goSearch}
        searchPlaceholder="매장명·주소로 검색"
        left={
          <span className="pagination_info">
            전체 {filtered.length}건 중 {from}–{to}건 표시
          </span>
        }
        filters={
          <select
            className="form_select"
            value={statusFilter}
            onChange={(e) => selectStatus(e.target.value as Store['status'] | '')}
            aria-label="상태 필터"
          >
            <option value="">전체 상태</option>
            {STATUS_LIST.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        }
      />

      <div className="store_grid">
        {paged.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>조건에 맞는 매장이 없습니다.</p>
        ) : (
          paged.map((s) => (
            <div className="card store_card" key={s.name}>
              <div className="store_thumb">
                <div className="noise" />
                <div className={`sdot badge badge_${s.status}`}>{s.statusText}</div>
              </div>
              <div className="store_body">
                <div className="sname">{s.name}</div>
                <div className="saddr">{s.addr}</div>
                <div className="store_meta">
                  <div>
                    카메라<b>{s.cams}대</b>
                  </div>
                  <div>
                    오늘 이벤트<b>{s.todayEvents}건</b>
                  </div>
                </div>
                <button type="button" className="btn btn_primary" onClick={() => enterStore(s.name)}>
                  입장하기
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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