import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PageHeader, DataTable, type DataTableColumn, UserPagination } from '../../../components/ui';
import type { LiveOutletContext } from '../../../components/layout/DashboardLayout';
import { CAMERAS, statusBadgeClass, type EventStatus, type DashboardEvent } from './Live.mock';
import Filterbar from '../../../components/ui/user/Filterbar';

const TYPE_LIST = ['폭행', '기물파손', '쓰러짐', '무단침입', '장시간 배회'];
const STATUS_LIST: EventStatus[] = ['대기', '처리완료', '오탐지'];

const PAGE_SIZE = 6;

export default function Test2() {
  // events/setDetailId는 DashboardLayout(부모 레이아웃)가 들고 있는 걸 공유해서 씀
  // (그래야 여기서 "보기"를 눌러도 같은 EventDetailPanel이 열림)
  const { events, setDetailId } = useOutletContext<LiveOutletContext>();

  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [camFilter, setCamFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | ''>('');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return events.filter((ev) => {
      const matchKeyword = kw === '' || ev.cam.toLowerCase().includes(kw) || ev.type.toLowerCase().includes(kw);
      const matchCam = camFilter === '' || ev.cam === camFilter;
      const matchType = typeFilter === '' || ev.type === typeFilter;
      const matchStatus = statusFilter === '' || ev.status === statusFilter;
      return matchKeyword && matchCam && matchType && matchStatus;
    });
  }, [events, keyword, camFilter, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  const resetFilters = () => {
    setKeyword('');
    setCamFilter('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const columns: DataTableColumn<DashboardEvent>[] = [
    {
      header: '시간',
      width: '30%',
      mono: true,
      render: (ev) => (
        <span style={{ cursor: 'pointer' }} onClick={() => setDetailId(ev.id)}>
          {ev.date} {ev.time}
        </span>
      ),
    },
    { header: '카메라', accessor: 'cam' },
    { header: '유형', accessor: 'type' },
    { header: '신뢰도', mono: true, render: (ev) => `${ev.confidence}%` },
    {
      header: '상태',
      width: 90,
      render: (ev) => <span className={`badge ${statusBadgeClass(ev.status)}`}>{ev.status}</span>,
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="이벤트 이력"
        description="날짜·카메라·유형별로 필터링해 지난 이벤트를 확인할 수 있습니다."
      />

      <Filterbar
        left={
          <span className="pagination_info">
            전체 <em className='b_num'>{filtered.length}</em>건 중 {from}–{to}건 표시
          </span>
        }
        searchValue={keyword}
        onSearchChange={setKeyword}
        searchPlaceholder="카메라·유형으로 검색"
        filters={
          <>
            <select className="form_select" value={camFilter} onChange={(e) => setCamFilter(e.target.value)} aria-label="카메라 필터">
              <option value="">전체 카메라</option>
              {CAMERAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select className="form_select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="유형 필터">
              <option value="">전체 유형</option>
              {TYPE_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="form_select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EventStatus | '')}
              aria-label="상태 필터"
            >
              <option value="">전체 상태</option>
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        }
        extra={
          <button type="button" className="btn btn_outline_primary" onClick={resetFilters}>
            초기화
          </button>
        }
      />

      <DataTable<DashboardEvent>
        columns={columns}
        data={filtered}
        rowKey={(ev) => ev.id}
        onEdit={(ev) => setDetailId(ev.id)}
        editLabel="보기"
        emptyMessage="조건에 맞는 이벤트가 없습니다."
      />

      
      
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