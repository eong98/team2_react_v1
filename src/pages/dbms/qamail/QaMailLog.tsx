import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminToolbar, AlertModal, DataTable, DbmsPagination, PageHeader, type DataTableColumn } from '../../../components/ui';
import { QA_MAIL_TYPE_LABEL, getQaMailLogs, resendQaMail, type QaMailLog as QaMailLogRow } from '../../../components/ts/QaMail';
import { qaErrorMessage } from '../../../components/ts/QaGuestToken';
import './qaMailLog.css';

/* ---------------------------------------------------------------------
   /dbms/qamail — 문의 메일 발송 내역 (관리자)

   문의사항에서 보낸 메일의 발송 결과를 확인합니다.
   - 답변 알림: 관리자가 문의에 처음 답변을 등록했을 때 작성자에게 보낸 메일
   - 비밀번호 재설정 인증: 비회원이 문의글 비밀번호 재설정을 요청했을 때 보낸 인증번호 메일
     (인증번호와 본문은 저장하지 않고, 보냈다는 사실만 남김)

   실패한 답변 알림은 [다시 보내기]로 다시 보낼 수 있습니다. 다시 보내면 새 줄이 추가되고 이전 기록은 그대로 남습니다.
   문의글이 삭제돼도 발송 기록은 남고, 문의 제목 자리에 "삭제된 게시글"로 표시됩니다.
--------------------------------------------------------------------- */

const PAGE_SIZE = 10;

type AlertState = { message: string; variant?: 'success' | 'error' } | null;

export default function QaMailLog() {
  const navigate = useNavigate();

  // 입력 중인 검색 조건 / 실제 조회에 쓰는 조건 (검색 버튼을 눌러야 반영)
  const [draftWord, setDraftWord] = useState('');
  const [draftStype, setDraftStype] = useState('');
  const [draftResult, setDraftResult] = useState('');
  const [filter, setFilter] = useState({ word: '', stype: '', result: '' });
  const [page, setPage] = useState(1); // 1부터 (서버는 0부터)

  const [rows, setRows] = useState<QaMailLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resendingNo, setResendingNo] = useState<number | null>(null);
  const [alert, setAlert] = useState<AlertState>(null);

  // 조건을 빠르게 바꿀 때 늦게 도착한 이전 응답이 화면을 덮어쓰지 않도록 요청 번호로 구분
  const requestSeq = useRef(0);

  const loadLogs = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await getQaMailLogs({ ...filter, page: page - 1, size: PAGE_SIZE });
      if (seq !== requestSeq.current) return;
      // 마지막 페이지의 줄이 없어졌으면 한 페이지 앞으로
      if (data.content.length === 0 && data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages);
        return;
      }
      setRows(data.content);
      setTotalCount(data.totalElements);
      setTotalPages(Math.max(1, data.totalPages));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('문의 메일 발송 내역 조회 실패:', err);
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
      setAlert({ message: '문의 메일 발송 내역을 불러오지 못했습니다.', variant: 'error' });
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onSearch = () => {
    setFilter({ word: draftWord.trim(), stype: draftStype, result: draftResult });
    setPage(1);
  };

  const onReset = () => {
    setDraftWord('');
    setDraftStype('');
    setDraftResult('');
    setFilter({ word: '', stype: '', result: '' });
    setPage(1);
  };

  /** 실패한 답변 알림 다시 보내기 — 발송은 서버에서 백그라운드로, 잠시 뒤 목록을 다시 불러옴 */
  const onResend = async (row: QaMailLogRow) => {
    setResendingNo(row.no);
    try {
      const message = await resendQaMail(row.no);
      setAlert({ message, variant: 'success' });
      window.setTimeout(loadLogs, 4000);
    } catch (err) {
      setAlert({ message: qaErrorMessage(err, '다시 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'), variant: 'error' });
    } finally {
      setResendingNo(null);
    }
  };

  const columns: DataTableColumn<QaMailLogRow>[] = [
    { header: 'No', width: '6%', mono: true, render: (row) => row.no },
    {
      header: '발송 일시',
      width: '14%',
      mono: true,
      render: (row) => row.cdate,
    },
    {
      header: '종류',
      width: '13%',
      render: (row) => (
        <span className={`badge ${row.stype === 1 ? 'badge_info' : 'badge_neutral'}`}>
          {QA_MAIL_TYPE_LABEL[row.stype] ?? '-'}
        </span>
      ),
    },
    {
      header: '문의글',
      width: '25%',
      render: (row) =>
        row.qaDeleted ? (
          <div className="qa_mail_post">
            <span className="qa_mail_deleted">삭제된 게시글</span>
            <span className="cell_sub">No.{row.qno}</span>
          </div>
        ) : (
          <div className="qa_mail_post">
            <button
              type="button"
              className="qa_mail_post_link"
              title={row.qaTitle ?? ''}
              onClick={() => navigate(`/dbms/qa/${row.qno}`)}
            >
              {row.qaTitle || '-'}
            </button>
            <span className="cell_sub">No.{row.qno}</span>
          </div>
        ),
    },
    {
      header: '받는 사람',
      width: '20%',
      render: (row) => (
        <div className="qa_mail_post">
          <span className="qa_mail_email" title={row.email}>{row.email}</span>
          <span className="cell_sub">{row.mno ? `${row.memberName || '회원'} #${row.mno}` : '비회원'}</span>
        </div>
      ),
    },
    {
      header: '결과',
      width: '14%',
      render: (row) => (
        <div className="qa_mail_post">
          <span className={`badge ${row.result === 'Y' ? 'badge_success' : 'badge_danger'}`}>
            {row.result === 'Y' ? '발송 성공' : '발송 실패'}
          </span>
          {row.result === 'N' && row.msg && (
            <span className="cell_sub qa_mail_msg" title={row.msg}>{row.msg}</span>
          )}
        </div>
      ),
    },
    {
      header: '관리',
      width: '8%',
      render: (row) =>
        row.canResend ? (
          <button
            type="button"
            className="btn btn_xsm btn_outline_primary"
            disabled={resendingNo === row.no}
            onClick={() => onResend(row)}
          >
            {resendingNo === row.no ? '보내는 중' : '다시 보내기'}
          </button>
        ) : (
          <span className="cell_sub">-</span>
        ),
    },
  ];

  return (
    <section className="view active qa_mail_page">
      <PageHeader
        title="문의 메일 발송 내역"
        description="문의 답변 알림과 비회원 비밀번호 재설정 인증 메일의 발송 결과를 확인합니다."
      />

      <AdminToolbar
        searchValue={draftWord}
        onSearchChange={setDraftWord}
        searchPlaceholder="이메일, 메일 제목, 문의 제목 검색"
        onSearchEnter={onSearch}
        filters={
          <>
            <select className="form_select" value={draftStype} onChange={(e) => setDraftStype(e.target.value)} aria-label="메일 종류">
              <option value="">전체 종류</option>
              <option value="1">답변 알림</option>
              <option value="2">비밀번호 재설정 인증</option>
            </select>
            <select className="form_select" value={draftResult} onChange={(e) => setDraftResult(e.target.value)} aria-label="발송 결과">
              <option value="">전체 결과</option>
              <option value="Y">발송 성공</option>
              <option value="N">발송 실패</option>
            </select>
          </>
        }
        extra={
          <>
            <button type="button" className="btn btn_primary" onClick={onSearch}>검색</button>
            <button type="button" className="btn btn_outline_primary" onClick={onReset}>초기화</button>
            <button type="button" className="btn btn_ghost" onClick={loadLogs}>새로고침</button>
          </>
        }
      />

      <div className="qa_mail_count">
        전체<strong>{totalCount.toLocaleString()}</strong>건
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.no}
        loading={loading}
        emptyMessage="문의 메일 발송 내역이 없습니다."
      />

      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}
