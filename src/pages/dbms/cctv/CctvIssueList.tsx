import { useEffect, useState } from 'react';
import { AdminToolbar, DataTable, PageHeader, DbmsPagination, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool.ts';
import type { CctvIssueSearchResult, CctvIssueType } from './CctvIssue.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV 이슈 내역 목록(/dbms/cctv/issue 등) - 읽기 전용.

   CCTV_ISSUE 컬럼: no/cno/mno/code/state/comnet/reliability/pdate/noticeyn/cdate
   - 등록/조회(상세)/수정 화면 없음. 목록만 보여주고 검색 + 페이징만 지원.
   - 맨 앞 "번호" 컬럼은 실제 PK(no)가 아니라, 검색 결과 총 건수 기준으로
     내림차순 매긴 가상의 순번(cnt)입니다. 전체 몇 건인지 한눈에 보기 위한 용도.

   API (CctvIssueCont, /cctv_issue)
   GET /cctv_issue/search?cno=&code=&state=&noticeyn=&keyword=&cdateFrom=&cdateTo=&page=&size=
     → { content, totalElements, totalPages, page(0-base), size }

   ⚠️ CODE(문제유형코드)/STATE(오탐여부) 값 체계는 참조 테이블이 없어서
     SentinelEye 5대 이상행동(폭행/기물파손/쓰러짐·응급/무단침입/장시간체류) 기준으로
     임시 매핑해뒀습니다. 실제 코드값이 다르면 아래 CODE_LABELS/STATE_LABELS만
     고치면 됩니다 (매핑에 없는 값은 원본 코드/숫자를 그대로 보여주므로 깨지지 않음).
--------------------------------------------------------------------- */

const PAGE_SIZE = 10;

// 문제유형코드(CODE) - VARCHAR2(2) 라서 2자리 코드로 가정
const CODE_LABELS: Record<string, string> = {
  '01': '폭행',
  '02': '기물파손',
  '03': '쓰러짐/응급',
  '04': '무단침입',
  '05': '장시간체류',
};

// 오탐여부(STATE) - NUMBER(3,0), 처리 상태 워크플로우로 가정
const STATE_LABELS: Record<number, string> = {
  0: '미확인',
  1: '정탐',
  2: '오탐',
};
const STATE_BADGE: Record<number, string> = {
  0: 'badge_warning',
  1: 'badge_danger',
  2: 'badge_neutral',
};

type RowType = CctvIssueType & { cnt: number };

interface Filters {
  cno: string;
  code: string;
  state: string; // '' | '0' | '1' | '2' ...
  noticeyn: string; // '' | 'Y' | 'N'
  keyword: string; // comnet(상황설명) 포함 검색
  dateFrom: string; // yyyy-MM-dd
  dateTo: string; // yyyy-MM-dd
}

const EMPTY_FILTERS: Filters = {
  cno: '',
  code: '',
  state: '',
  noticeyn: '',
  keyword: '',
  dateFrom: '',
  dateTo: '',
};

export default function CctvIssueListView() {
  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<CctvIssueSearchResult>('/cctv_issue/search', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          cno: applied.cno.trim() !== '' ? Number(applied.cno.trim()) : undefined,
          code: applied.code || undefined,
          state: applied.state !== '' ? Number(applied.state) : undefined,
          noticeyn: applied.noticeyn || undefined,
          keyword: applied.keyword.trim() || undefined,
          cdateFrom: applied.dateFrom || undefined,
          cdateTo: applied.dateTo || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setRows(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error(err);
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, page]);

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

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (r) => r.cnt },
    { header: 'CCTV', width: '70px', mono: true, render: (r) => `#${r.cno}` },
    { header: '담당자', width: '90px', mono: true, render: (r) => (r.mno ? `#${r.mno}` : '-') },
    {
      header: '문제유형',
      width: '110px',
      render: (r) => <span className="badge badge_info">{CODE_LABELS[r.code] ?? r.code}</span>,
    },
    {
      header: '오탐여부',
      width: '90px',
      render: (r) => (
        <span className={`badge ${STATE_BADGE[r.state] ?? 'badge_neutral'}`}>
          {STATE_LABELS[r.state] ?? r.state}
        </span>
      ),
    },
    {
      header: '상황설명',
      width: '30%',
      render: (r) => (
        <span title={r.comnet ?? ''}>
          {r.comnet ? (r.comnet.length > 40 ? `${r.comnet.slice(0, 40)}…` : r.comnet) : '-'}
        </span>
      ),
    },
    { header: '신뢰도', width: '80px', mono: true, render: (r) => r.reliability ?? '-' },
    {
      header: '발송여부',
      width: '90px',
      render: (r) => (
        <span className={`badge ${r.noticeyn === 'Y' ? 'badge_success' : 'badge_neutral'}`}>
          {r.noticeyn === 'Y' ? '발송완료' : '미발송'}
        </span>
      ),
    },
    { header: '처리일시', mono: true, render: (r) => r.pdate ?? '-' },
    { header: '등록일', mono: true, render: (r) => r.cdate },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="CCTV 이슈 내역"
        description="AI가 감지한 CCTV 이상행동 이슈 내역입니다. (CCTV_ISSUE 테이블 기준)"
      />

      <AdminToolbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="상황설명으로 검색"
        filters={
          <>
            <select
              className="form_select"
              value={draft.code}
              onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value }))}
              aria-label="문제유형 필터"
            >
              <option value="">유형 전체</option>
              {Object.entries(CODE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.state}
              onChange={(e) => setDraft((prev) => ({ ...prev, state: e.target.value }))}
              aria-label="오탐여부 필터"
            >
              <option value="">상태 전체</option>
              {Object.entries(STATE_LABELS).map(([state, label]) => (
                <option key={state} value={state}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.noticeyn}
              onChange={(e) => setDraft((prev) => ({ ...prev, noticeyn: e.target.value }))}
              aria-label="발송여부 필터"
            >
              <option value="">발송여부 전체</option>
              <option value="Y">발송완료</option>
              <option value="N">미발송</option>
            </select>

            <input
              type="number"
              className="form_input"
              placeholder="CCTV번호"
              value={draft.cno}
              onChange={(e) => setDraft((prev) => ({ ...prev, cno: e.target.value }))}
              style={{ maxWidth: 110 }}
              aria-label="CCTV번호 필터"
            />

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              aria-label="등록일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              aria-label="등록일 종료"
            />
          </>
        }
        extra={
          <>
            <button type="button" className="btn btn_primary" onClick={onSearch}>
              검색
            </button>
            <button type="button" className="btn btn_outline_primary" onClick={onReset}>
              초기화
            </button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.no}
        loading={loading}
        emptyMessage="검색 결과가 없습니다."
      />

      <DbmsPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
    </section>
  );
}
