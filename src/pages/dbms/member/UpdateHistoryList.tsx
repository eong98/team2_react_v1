import { useEffect, useMemo, useState } from 'react';
import { PageHeader, DataTable, type DataTableColumn, UserPagination } from '../../../components/ui';
import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance } from '../../../utils/Tool';

// ✅ UpdateHistory.ts 파일에서 UpdateLog 타입을 가져옵니다.
import type { UpdateHistory } from './UpdateHistory'; 

const PAGE_SIZE = 10;
const UPDATE_LOG_API = '/v1/update-log';

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
//    필터 선택 시 행 데이터와 매칭됩니다. (기존 'name' → 'mname' 오타 수정 + 누락 항목 추가)
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

export default function UpdateLogList() {
  const [logs, setLogs] = useState<ProcessedLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('ALL');
  const [fieldFilter, setFieldFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');
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

  // 필터링 및 정렬 
  const processedLogs = useMemo(() => {
    const searchKeyword = keyword.trim().toLowerCase();

    return logs
      .filter((log) => {
        if (targetFilter !== 'ALL' && log.targetType !== targetFilter) return false;
        if (fieldFilter !== 'ALL' && log.changedColumn !== fieldFilter) return false;
        if (!searchKeyword) return true;

        const searchString = `${log.targetId} ${log.changedColumn} ${log.oldValue} ${log.newValue} ${log.updtMnno} ${log.targetType}`.toLowerCase();
        return searchString.includes(searchKeyword);
      })
      .sort((a, b) => {
        const dateA = parseDate(a.changeDate);
        const dateB = parseDate(b.changeDate);
        return (!Number.isNaN(dateA) && !Number.isNaN(dateB)) ? dateB - dateA : b.no - a.no;
      });
  }, [logs, targetFilter, fieldFilter, keyword]);

  // 페이지네이션 처리
  const totalPages = Math.max(1, Math.ceil(processedLogs.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedLogs = processedLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = processedLogs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, processedLogs.length);

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

  const handleReset = () => {
    setTargetFilter('ALL');
    setFieldFilter('ALL');
    setKeyword('');
    setPage(1);
  };

  return (
    <section className="view active">
      <PageHeader 
        title="업데이트 로그" 
        description="USER 및 DBMS 계정의 정보 변경 이력을 통합 조회합니다." 
      />

      <Filterbar
        left={
          <span className="pagination_info">
            전체 로그 <em className="b_num">{processedLogs.length}</em>건 중 {from}–{to}건 표시
          </span>
        }
        searchValue={keyword}
        onSearchChange={(val) => { setKeyword(val); setPage(1); }}
        searchPlaceholder="대상번호·변경내용·관리자번호 검색"
        // ✅ select들을 개별 flex 아이템으로 그대로 넘깁니다.
        //    (기존처럼 별도 div로 감싸면 그 안의 요소들이 줄어들지 못해
        //     화면이 좁아질 때 한 덩어리로 영역 밖으로 튀어나갑니다.)
        filters={
          <>
            <select
              className="form_select"
              value={targetFilter}
              onChange={(e) => { setTargetFilter(e.target.value as TargetFilter); setPage(1); }}
              aria-label="구분 필터"
            >
              <option value="ALL">USER + DBMS</option>
              <option value="USER">USER</option>
              <option value="DBMS">DBMS</option>
            </select>
            <select
              className="form_select"
              value={fieldFilter}
              onChange={(e) => { setFieldFilter(e.target.value); setPage(1); }}
              aria-label="변경 항목 필터"
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </>
        }
        // ✅ 버튼은 extra 슬롯으로 분리 (Filterbar가 flexShrink:0을 자동으로 적용해줌)
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
