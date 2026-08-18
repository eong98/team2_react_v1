// src/pages/dbms/member/LoginHistoryList.tsx
import { useEffect, useMemo, useState } from 'react';
import { PageHeader, DataTable, type DataTableColumn, UserPagination } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance, getIP } from '../../../utils/Tool';

import type { LoginHistory } from './LoginHistory';

const PAGE_SIZE = 10;
const LOGIN_HISTORY_API = `http://${getIP()}:9102/history/login/list`;

// LOGIN_RESULT: 0 실패, 1 성공
const RESULT_LABELS: Record<number, string> = {
  0: '실패',
  1: '성공',
};
const RESULT_BADGE: Record<number, string> = {
  0: 'badge_danger',
  1: 'badge_success',
};

type LogTargetType = 'USER' | 'DBMS';
type TargetFilter = 'ALL' | LogTargetType;

interface ProcessedLog extends LoginHistory {
  targetType: LogTargetType;
  targetId: number;
}

const TARGET_LABEL_MAP: Record<LogTargetType, string> = {
  USER: '회원',
  DBMS: '관리자',
};

const TARGET_OPTIONS: Array<{ value: TargetFilter; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'USER', label: '회원' },
  { value: 'DBMS', label: '관리자' },
];

const RESULT_OPTIONS: Array<{ value: 'ALL' | '0' | '1'; label: string }> = [
  { value: 'ALL', label: '결과 전체' },
  { value: '1', label: '성공' },
  { value: '0', label: '실패' },
];

/** 검색 대상 필드 선택 옵션 — 선택 시 그 필드에서만 검색어를 매칭합니다. */
type SearchField = 'ALL' | 'loginId' | 'targetId' | 'ipAddr' | 'failReason';

const SEARCH_FIELD_OPTIONS: Array<{ value: SearchField; label: string }> = [
  { value: 'ALL', label: '전체 항목' },
  { value: 'loginId', label: '로그인 아이디' },
  { value: 'targetId', label: '대상번호' },
  { value: 'ipAddr', label: 'IP주소' },
  { value: 'failReason', label: '실패 사유' },
];

interface Filters {
  keyword: string;
  searchField: SearchField;
  targetType: TargetFilter;
  result: 'ALL' | '0' | '1';
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  keyword: '',
  searchField: 'ALL',
  targetType: 'ALL',
  result: 'ALL',
  dateFrom: '',
  dateTo: '',
};

const parseDate = (val: string) => {
  if (!val) return NaN;
  return new Date(val.includes(' ') && !val.includes('T') ? val.replace(' ', 'T') : val).getTime();
};

const formatDate = (val: string) => {
  if (!val) return '-';
  const time = parseDate(val);
  return Number.isNaN(time)
    ? val
    : new Date(time).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
      });
};

export default function LoginHistoryList() {
  const [logs, setLogs] = useState<ProcessedLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchLoginHistory = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(LOGIN_HISTORY_API);
        const rawData: LoginHistory[] = response.data || [];

        // mno가 null이면 관리자(DBMS), 아니면 회원(USER)으로 분류
        const mappedData: ProcessedLog[] = rawData.map((log) => {
          const isDbms = log.mno === null;

          return {
            ...log,
            targetType: isDbms ? 'DBMS' : 'USER',
            targetId: isDbms ? (log.mnno ?? 0) : (log.mno ?? 0),
          };
        });

        setLogs(mappedData);
      } catch (error) {
        console.error('로그인 로그 조회 실패:', error);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoginHistory();
  }, []);

  const processedLogs = useMemo(() => {
    const searchKeyword = applied.keyword.trim().toLowerCase();
    const fromTime = applied.dateFrom ? new Date(`${applied.dateFrom}T00:00:00`).getTime() : null;
    const toTime = applied.dateTo ? new Date(`${applied.dateTo}T23:59:59`).getTime() : null;

    return logs
      .filter((log) => {
        if (applied.targetType !== 'ALL' && log.targetType !== applied.targetType) return false;
        if (applied.result !== 'ALL' && String(log.loginResult) !== applied.result) return false;

        if (fromTime !== null || toTime !== null) {
          const loginTime = parseDate(log.loginDate);
          if (Number.isNaN(loginTime)) return false;
          if (fromTime !== null && loginTime < fromTime) return false;
          if (toTime !== null && loginTime > toTime) return false;
        }

        if (!searchKeyword) return true;

        // 필드를 선택한 경우 해당 필드에서만 검색
        switch (applied.searchField) {
          case 'loginId':
            return log.loginId.toLowerCase().includes(searchKeyword);
          case 'targetId':
            return String(log.targetId).includes(searchKeyword);
          case 'ipAddr':
            return (log.ipAddr ?? '').toLowerCase().includes(searchKeyword);
          case 'failReason':
            return (log.failReason ?? '').toLowerCase().includes(searchKeyword);
          default: {
            const searchString = `${log.loginId} ${log.targetId} ${log.ipAddr ?? ''} ${log.failReason ?? ''}`.toLowerCase();
            return searchString.includes(searchKeyword);
          }
        }
      })
      .sort((a, b) => {
        const dateA = parseDate(a.loginDate);
        const dateB = parseDate(b.loginDate);
        return !Number.isNaN(dateA) && !Number.isNaN(dateB) ? dateB - dateA : b.no - a.no;
      });
  }, [logs, applied]);

  const totalPages = Math.max(1, Math.ceil(processedLogs.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedLogs = processedLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const onReset = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  };

  const columns = useMemo<DataTableColumn<ProcessedLog>[]>(() => [
    { header: '로그번호', accessor: 'no', width: '8%', mono: true },
    {
      header: '구분', width: '8%',
      render: (log) => (
        <span className={`badge ${log.targetType === 'USER' ? 'badge_neutral' : 'badge_info'}`}>
          {TARGET_LABEL_MAP[log.targetType]}
        </span>
      ),
    },
    {
      header: '결과', width: '8%',
      render: (log) => (
        <span className={`badge ${RESULT_BADGE[log.loginResult] ?? 'badge_neutral'}`}>
          {RESULT_LABELS[log.loginResult] ?? log.loginResult}
        </span>
      ),
    },
    { header: '로그인 아이디', width: '15%', render: (log) => <span className="cell_title mono">{log.loginId}</span> },
    { header: '대상번호', width: '8%', mono: true, render: (log) => <span>{log.targetId}</span> },
    { header: '실패 사유', width: '20%', render: (log) => <span title={log.failReason ?? '-'}>{log.failReason || '-'}</span> },
    { header: 'IP주소', width: '13%', mono: true, render: (log) => <span>{log.ipAddr || '-'}</span> },
    { header: '로그인 일시', width: '15%', mono: true, render: (log) => <span className="mono">{formatDate(log.loginDate)}</span> },
  ], []);

  return (
    <section className="view active">
      <PageHeader title="로그인 로그" description="회원 및 관리자 계정의 로그인 시도(성공/실패) 이력을 통합 조회합니다." />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={processedLogs.length}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="선택한 항목에서 검색 (Enter 또는 검색 버튼)"
        onSearchEnter={onSearch}
        filters={
          <>
            <select
              className="form_select"
              value={draft.targetType}
              onChange={(e) => setDraft((prev) => ({ ...prev, targetType: e.target.value as TargetFilter }))}
              aria-label="구분 필터"
            >
              {TARGET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.result}
              onChange={(e) => setDraft((prev) => ({ ...prev, result: e.target.value as Filters['result'] }))}
              aria-label="결과 필터"
            >
              {RESULT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.searchField}
              onChange={(e) => setDraft((prev) => ({ ...prev, searchField: e.target.value as SearchField }))}
              aria-label="검색 항목 선택"
            >
              {SEARCH_FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
              aria-label="로그인일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
              aria-label="로그인일 종료"
            />
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

      {isLoading ? (
        <div className="loading_box">로그인 로그를 불러오는 중입니다...</div>
      ) : (
        <DataTable<ProcessedLog>
          columns={columns}
          data={pagedLogs}
          rowKey={(log) => `${log.targetType}-${log.no}`}
          emptyMessage="로그인 로그가 존재하지 않습니다."
        />
      )}

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={processedLogs.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        showInfo={false}
      />
    </section>
  );
}