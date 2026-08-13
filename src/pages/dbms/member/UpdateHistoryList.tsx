import { useEffect, useMemo, useState } from 'react';
import { PageHeader, DataTable, type DataTableColumn, UserPagination } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance, getIP } from '../../../utils/Tool';

import type { UpdateHistory } from './UpdateHistory';

const PAGE_SIZE = 10;
const UPDATE_LOG_API = `http://${getIP()}:9102/history/update/list`;

type LogTargetType = 'USER' | 'DBMS';
type TargetFilter = 'ALL' | LogTargetType;

interface ProcessedLog extends UpdateHistory {
  targetType: LogTargetType;
  targetId: number;
}

/** 구분(회원/관리자) 표시 라벨 */
const TARGET_LABEL_MAP: Record<LogTargetType, string> = {
  USER: '회원',
  DBMS: '관리자',
};

/**
 * 백엔드가 changedColumn에 저장하는 필드명(대문자, 예: MNAME/PHONE)을
 * 화면에 보여줄 한글 라벨로 매핑합니다.
 */
const FIELD_LABEL_MAP: Record<string, string> = {
  MNAME: '이름',
  EMAIL: '이메일',
  PHONE: '연락처',
  STATUS: '상태',
  ZIPCODE: '우편번호',
  ADDR: '주소',
  ADDRDETAIL: '상세 주소',
  NATION: '국가',
  GRADE: '권한',
  PASSWORD: '비밀번호',
};

const FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: '전체 항목' },
  ...Object.entries(FIELD_LABEL_MAP).map(([value, label]) => ({ value, label })),
];

const getFieldLabel = (col: string) => FIELD_LABEL_MAP[col.toUpperCase()] ?? col;
const formatValue = (val?: string | null) => (val && val.trim() !== '' ? val : '-');

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

/** changedColumn(':::' 구분)과 oldValue/newValue('/' 구분)를 같은 인덱스로 짝지어 반환합니다. */
const splitFields = (log: ProcessedLog) => {
  const fields = log.changedColumn ? log.changedColumn.split(':::').filter(Boolean) : [];
  const oldValues = log.oldValue ? log.oldValue.split(':::') : [];
  const newValues = log.newValue ? log.newValue.split(':::') : [];
  return { fields, oldValues, newValues };
};

interface Filters {
  keyword: string;
  targetType: TargetFilter;
  field: string; // 'ALL' | 'MNAME' | 'PHONE' ...
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  keyword: '',
  targetType: 'ALL',
  field: 'ALL',
  dateFrom: '',
  dateTo: '',
};

export default function UpdateLogList() {
  const [logs, setLogs] = useState<ProcessedLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchUpdateLogs = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(UPDATE_LOG_API);
        const rawData: UpdateHistory[] = response.data || [];

        // mno가 null이면 관리자(DBMS), null이 아니면 일반회원(USER)으로 분류
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
        console.error('업데이트 로그 조회 실패:', error);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdateLogs();
  }, []);

  // 필터링 및 정렬 - applied 기준으로만 계산 (draft는 타이핑 중인 값)
  const processedLogs = useMemo(() => {
    const searchKeyword = applied.keyword.trim().toLowerCase();
    const fromTime = applied.dateFrom ? new Date(`${applied.dateFrom}T00:00:00`).getTime() : null;
    const toTime = applied.dateTo ? new Date(`${applied.dateTo}T23:59:59`).getTime() : null;

    return logs
      .filter((log) => {
        if (applied.targetType !== 'ALL' && log.targetType !== applied.targetType) return false;

        const { fields, newValues } = splitFields(log);

        // 변경일시 범위 필터는 항목 필터와 무관하게 공통 적용
        if (fromTime !== null || toTime !== null) {
          const changeTime = parseDate(log.changeDate);
          if (Number.isNaN(changeTime)) return false;
          if (fromTime !== null && changeTime < fromTime) return false;
          if (toTime !== null && changeTime > toTime) return false;
        }

        // 특정 항목(예: 연락처)을 선택한 경우
        // → 그 항목이 실제로 변경된 로그만 표시하고, 검색어는 해당 항목의 "변경 후" 값에서만 매칭
        if (applied.field !== 'ALL') {
          const idx = fields.indexOf(applied.field);
          if (idx === -1) return false;

          if (!searchKeyword) return true;
          return (newValues[idx] ?? '').toLowerCase().includes(searchKeyword);
        }

        // 전체 항목 조회 시에는 기존처럼 로그 전체에서 검색
        if (!searchKeyword) return true;

        const searchString = `${log.targetId} ${log.changedColumn} ${log.oldValue} ${log.newValue} ${log.updtMnno} ${log.targetType}`.toLowerCase();
        return searchString.includes(searchKeyword);
      })
      .sort((a, b) => {
        const dateA = parseDate(a.changeDate);
        const dateB = parseDate(b.changeDate);
        return !Number.isNaN(dateA) && !Number.isNaN(dateB) ? dateB - dateA : b.no - a.no;
      });
  }, [logs, applied]);

  // 페이지네이션 처리
  const totalPages = Math.max(1, Math.ceil(processedLogs.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedLogs = processedLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // [검색 버튼 클릭] draft를 applied로 확정하고 1페이지로 이동
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

  // 테이블 컬럼 정의
  const columns = useMemo<DataTableColumn<ProcessedLog>[]>(() => [
    { header: '로그번호', accessor: 'no', width: '7%', mono: true },
    {
      header: '구분', width: '8%',
      render: (log) => (
        <span className={`badge ${log.targetType === 'USER' ? 'badge_neutral' : 'badge_info'}`}>
          {TARGET_LABEL_MAP[log.targetType]}
        </span>
      ),
    },
    {
      header: '대상번호', width: '9%', mono: true,
      render: (log) => <span>{log.targetId}</span>,
    },
    {
      header: '변경 항목', width: '13%',
      render: (log) => {
        const { fields } = splitFields(log);
        if (fields.length === 0) return <span className="cell_sub">-</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {fields.map((f, i) => (
              <span key={`${f}-${i}`} className="cell_title">
                {getFieldLabel(f)}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: '변경 전', width: '17%',
      render: (log) => {
        const { fields, oldValues } = splitFields(log);
        if (fields.length === 0) return <span>{formatValue(log.oldValue)}</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {fields.map((f, i) => (
              <span key={`${f}-${i}`} title={formatValue(oldValues[i])}>
                {formatValue(oldValues[i])}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: '변경 후', width: '17%',
      render: (log) => {
        const { fields, newValues } = splitFields(log);
        if (fields.length === 0) return <span>{formatValue(log.newValue)}</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {fields.map((f, i) => (
              <span key={`${f}-${i}`} title={formatValue(newValues[i])}>
                {formatValue(newValues[i])}
              </span>
            ))}
          </div>
        );
      },
    },
    { header: '변경 일시', width: '14%', mono: true, render: (log) => <span className="mono">{formatDate(log.changeDate)}</span> },
    { header: '변경 관리자', width: '8%', mono: true, render: (log) => <span>{log.updtMnno || '-'}</span> },
  ], []);

  return (
    <section className="view active">
      <PageHeader
        title="업데이트 로그"
        description="회원 및 관리자 계정의 정보 변경 이력을 통합 조회합니다."
      />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={processedLogs.length}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="변경 후 값으로 검색 (항목을 선택하면 해당 항목에서만 검색)"
        onSearchEnter={onSearch}
        filters={
          <>
            <select
              className="form_select"
              value={draft.targetType}
              onChange={(e) => setDraft((prev) => ({ ...prev, targetType: e.target.value as TargetFilter }))}
              aria-label="구분 필터"
            >
              <option value="ALL">회원 + 관리자</option>
              <option value="USER">회원</option>
              <option value="DBMS">관리자</option>
            </select>

            <select
              className="form_select"
              value={draft.field}
              onChange={(e) => setDraft((prev) => ({ ...prev, field: e.target.value }))}
              aria-label="변경 항목 필터"
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
              aria-label="변경일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
              aria-label="변경일 종료"
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
        <div className="loading_box">업데이트 로그를 불러오는 중입니다...</div>
      ) : (
        <DataTable<ProcessedLog>
          columns={columns}
          data={pagedLogs}
          rowKey={(log) => `${log.targetType}-${log.no}`}
          emptyMessage="업데이트 로그가 존재하지 않습니다."
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