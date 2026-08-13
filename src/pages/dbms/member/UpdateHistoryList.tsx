import { useEffect, useMemo, useState } from 'react';
import { PageHeader, DataTable, type DataTableColumn, UserPagination } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance, getIP } from '../../../utils/Tool';

// ✅ UpdateHistory.ts 파일에서 UpdateLog 타입을 가져옵니다.
import type { UpdateHistory } from './UpdateHistory';

const PAGE_SIZE = 10;
const UPDATE_LOG_API = `http://${getIP()}:9102/history/update/list`;

type LogTargetType = 'USER' | 'DBMS';
type TargetFilter = 'ALL' | LogTargetType;

/**
 * UpdateHistory.ts에서 가져온 기본 UpdateLog 타입에
 * 화면 표시를 위한 targetType과 targetId 속성만 추가합니다.
 */
interface ProcessedLog extends UpdateHistory {
  targetType: LogTargetType;
  targetId: number;
}

const COLUMN_LABELS: Record<string, string> = {
  id: '아이디', mname: '이름', email: '이메일', phone: '연락처', status: '계정 상태',
  zipcode: '우편번호', addr: '주소', addrDetail: '상세 주소', nation: '국가',
  grade: '등급', role: '권한', password: '비밀번호'
};

// ✅ FIELD_OPTIONS의 value는 반드시 COLUMN_LABELS(= 실제 changedColumn 값)의 키와 일치해야
//    필터 선택 시 행 데이터와 매칭됩니다.
const FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: '전체 항목' },
  ...Object.entries(COLUMN_LABELS).map(([value, label]) => ({ value, label })),
];

const getColumnLabel = (col: string) => COLUMN_LABELS[col] ?? col;
const formatValue = (val?: string | null) => val || '-';

const parseDate = (val: string) => {
  if (!val) return NaN;
  return new Date(val.includes(' ') && !val.includes('T') ? val.replace(' ', 'T') : val).getTime();
};

const formatDate = (val: string) => {
  if (!val) return '-';
  const time = parseDate(val);
  return Number.isNaN(time) ? val : new Date(time).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
};

/* ---------------------------------------------------------------------
   검색 필터 - dbms/cctv/CctvIssueList.tsx 패턴 참고
   draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 필터링에 쓰이는 값
--------------------------------------------------------------------- */
interface Filters {
  keyword: string; // 대상번호·변경내용·관리자번호 통합 검색
  targetType: TargetFilter; // USER / DBMS 구분
  field: string; // 변경 항목(changedColumn)
  dateFrom: string; // 변경일시 시작 (yyyy-MM-dd)
  dateTo: string; // 변경일시 종료 (yyyy-MM-dd)
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

  // 데이터 조회 및 가공
  useEffect(() => {
    const fetchUpdateLogs = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(UPDATE_LOG_API);
        const rawData: UpdateHistory[] = response.data || [];

        // ✅ mno가 null이면 관리자(DBMS), null이 아니면 일반회원(USER)으로 분류
        const mappedData: ProcessedLog[] = rawData.map((log) => {
          const isDbms = log.mno === null;

          return {
            ...log,
            targetType: isDbms ? 'DBMS' : 'USER',
            targetId: isDbms ? (log.mnno ?? 0) : (log.mno ?? 0)
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
        if (applied.field !== 'ALL' && log.changedColumn !== applied.field) return false;

        if (fromTime !== null || toTime !== null) {
          const changeTime = parseDate(log.changeDate);
          if (Number.isNaN(changeTime)) return false;
          if (fromTime !== null && changeTime < fromTime) return false;
          if (toTime !== null && changeTime > toTime) return false;
        }

        if (!searchKeyword) return true;

        const searchString = `${log.targetId} ${log.changedColumn} ${log.oldValue} ${log.newValue} ${log.updtMnno} ${log.targetType}`.toLowerCase();
        return searchString.includes(searchKeyword);
      })
      .sort((a, b) => {
        const dateA = parseDate(a.changeDate);
        const dateB = parseDate(b.changeDate);
        return (!Number.isNaN(dateA) && !Number.isNaN(dateB)) ? dateB - dateA : b.no - a.no;
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
    { header: '로그번호', accessor: 'no', width: '8%', mono: true },
    {
      header: '구분', width: '9%',
      render: (log) => <span className={`badge ${log.targetType === 'USER' ? 'badge_neutral' : 'badge_primary'}`}>{log.targetType}</span>
    },
    {
      header: '대상번호', width: '10%', mono: true,
      render: (log) => <span>{log.targetId}</span>
    },
    { header: '변경 항목', width: '14%', render: (log) => <span className="cell_title">{getColumnLabel(log.changedColumn)}</span> },
    { header: '변경 전', width: '18%', render: (log) => <span title={formatValue(log.oldValue)}>{formatValue(log.oldValue)}</span> },
    { header: '변경 후', width: '18%', render: (log) => <span title={formatValue(log.newValue)}>{formatValue(log.newValue)}</span> },
    { header: '변경 일시', width: '15%', mono: true, render: (log) => <span className="mono">{formatDate(log.changeDate)}</span> },
    { header: '변경 관리자', width: '8%', mono: true, render: (log) => <span>{log.updtMnno || '-'}</span> },
  ], []);

  return (
    <section className="view active">
      <PageHeader
        title="업데이트 로그"
        description="USER 및 DBMS 계정의 정보 변경 이력을 통합 조회합니다."
      />

      {/* ✅ 하드코딩 left 문구 제거 - page/pageSize/totalCount만 넘기면 Filterbar가 안내문구를 자동 계산 (QaList.tsx 패턴) */}
      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={processedLogs.length}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="대상번호·변경내용·관리자번호 검색"
        onSearchEnter={onSearch}
        filters={
          <>
            <select
              className="form_select"
              value={draft.targetType}
              onChange={(e) => setDraft((prev) => ({ ...prev, targetType: e.target.value as TargetFilter }))}
              aria-label="구분 필터"
            >
              <option value="ALL">USER + DBMS</option>
              <option value="USER">USER</option>
              <option value="DBMS">DBMS</option>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="변경일 시작"
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
              aria-label="변경일 종료"
            />
          </>
        }
        // ✅ 버튼 순서/스타일 QaList.tsx 통일 (초기화 ghost → 검색 primary)
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