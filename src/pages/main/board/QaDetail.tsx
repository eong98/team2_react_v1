import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePaging } from '../../../hooks/usePaging';
import { QA_STATUS_MAP, QA_TYPE_MAP, type QaTypes } from '../../../components/ts/QaType';
import { axiosInstance } from '../../../utils/Tool';
import { AlertModal, AttachViewer, ConfirmDeleteModal, Modal, PageHeader, PrevNextNav } from '../../../components/ui';
import { ATTACH_BOARD_LABEL, deleteAttachByBno } from '../../../components/ts/Attach';
import QaLockedView from '../../../components/ui/common/QaLockedView';
import {
  QA_TOKEN_REQUIRED,
  clearQaGuestToken,
  getQaGuestToken,
  qaErrorCode,
  qaErrorMessage,
  qaGuestHeaders,
  verifyQaGuest,
} from '../../../components/ts/QaGuestToken';

/* ---------------------------------------------------------------------
   비회원 문의 상세 (/board/qa/:no)

   비밀번호를 확인하면 서버가 이 글 전용 임시 토큰(10분)을 주고,
   sessionStorage에 보관했다가 X-Qa-Token 헤더로 보냅니다(QaGuestToken.ts).
   - 비밀글이 아니면 토큰 없이 조회
   - 비밀글인데 토큰이 없거나 만료됐으면 서버가 locked=true(내용 없음)로 응답
     → 오류 화면·모달 대신 비밀번호 입력 칸이 있는 잠금 화면을 보여줌 (요청이 실패가 아니라 콘솔 오류도 없음)
   - 수정·삭제도 토큰으로 본인 확인 (없으면 먼저 비밀번호 확인)

   API
   GET    /qa/guest/{no}          → QaResponse
   POST   /qa/guest/{no}/verify   → {token, expiresIn}
   DELETE /qa/guest/{no}          → 삭제
--------------------------------------------------------------------- */

/** 비밀번호 확인 후 이어서 할 일 */
type PwPurpose = 'view' | 'edit' | 'delete';

export default function QaDetail() {
  const { no } = useParams<{ no: string }>();
  const navigate = useNavigate();
  const { goToList, navigateWithQuery } = usePaging({ basePath: '../qa' });

  const [qa, setQa] = useState<QaTypes | null>(null);
  /** 잠긴 비밀글(비밀번호 확인 전) — 번호·제목 등만 있음 */
  const [locked, setLocked] = useState<QaTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 이전글 다음글
  const [navPosts, setNavPosts] = useState<{ prev: any; next: any }>({
    prev: null,
    next: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<QaTypes | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  // 비밀번호 확인 모달
  const [pwPurpose, setPwPurpose] = useState<PwPurpose | null>(null);
  const [pw, setPw] = useState('');
  const [checking, setChecking] = useState(false);
  const [pwError, setPwError] = useState('');

  /* 문의내용 상세 데이터 조회 */
  const loadQa = () => {
    if (!no) return;
    setLoading(true);
    setError(null);

    axiosInstance
      .get(`/qa/guest/${no}`, { headers: qaGuestHeaders(no) })
      .then((res) => res.data)
      .then((data) => {
        // 토큰이 없거나 만료된 비밀글 → 잠금 화면 (비밀번호 확인 후 다시 조회)
        if (data.locked) {
          clearQaGuestToken(no);
          setQa(null);
          setLocked(data);
          setPwPurpose('view');
          return;
        }
        setLocked(null);
        setQa(data);
        setNavPosts({
          prev : data.prev ?? null,
          next: data.next ?? null,
        })
      })
      .catch((err) => {
        setQa(null);
        // 비밀글인데 토큰이 없거나 만료 → 비밀번호 확인
        if (qaErrorCode(err) === QA_TOKEN_REQUIRED) {
          clearQaGuestToken(no);
          setError('비밀글입니다. 목록에서 다시 열어 비밀번호를 확인해 주세요.');
          return;
        }
        if (err?.response?.status === 400 || err?.response?.status === 404) {
          setError(qaErrorMessage(err, '해당 문의를 찾을 수 없거나 권한이 없습니다.'));
          return;
        }
        console.error('문의 상세 조회 실패:', err);
        setError('문의 내용을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // 다른 글로 이동하면(이전글·다음글 등) 앞 글의 내용·잠금·비밀번호 입력을 먼저 비움
    setQa(null);
    setLocked(null);
    setPwPurpose(null);
    setPw('');
    setPwError('');
    loadQa();
  }, [no]);

  const openPwModal = (purpose: PwPurpose) => {
    setPwPurpose(purpose);
    setPw('');
    setPwError('');
  };

  const closePwModal = () => setPwPurpose(null);

  /** 비밀번호 확인 → 토큰 저장 후 하려던 일 이어서 */
  const handleVerify = async () => {
    if (!no || !pwPurpose) return;
    if (!pw.trim()) {
      setPwError('비밀번호를 입력해주세요.');
      return;
    }
    setPwError('');
    setChecking(true);
    try {
      await verifyQaGuest(no, pw);
      const purpose = pwPurpose;
      setPwPurpose(null);

      if (purpose === 'view') loadQa();
      if (purpose === 'edit') navigateWithQuery('edit');
      if (purpose === 'delete') setDeleteTarget(qa);
    } catch (err) {
      // 불일치(남은 횟수)·잠김(5회 실패) 안내는 서버 문구 그대로
      setPwError(qaErrorMessage(err, '비밀번호가 일치하지 않습니다.'));
    } finally {
      setChecking(false);
    }
  };

  // 수정 — 확인한 토큰이 없으면 비밀번호부터
  const handleEdit = () => {
    if (no && getQaGuestToken(no)) {
      navigateWithQuery('edit');
    } else {
      openPwModal('edit');
    }
  };

  // 삭제 — 확인한 토큰이 없으면 비밀번호부터
  const handleDelete = () => {
    if (no && getQaGuestToken(no)) {
      setDeleteTarget(qa);
    } else {
      openPwModal('delete');
    }
  };

  // 삭제 실행 (토큰으로 본인 확인)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await axiosInstance.delete(`/qa/guest/${deleteTarget.no}`, { headers: qaGuestHeaders(deleteTarget.no) });
      // 글 삭제가 성공한 뒤에만 첨부파일 삭제 (게시판 구분 tname 포함)
      await deleteAttachByBno(deleteTarget.no, ATTACH_BOARD_LABEL[0].table);
      clearQaGuestToken(deleteTarget.no);

      setAlert({ message: '삭제되었습니다.', variant: 'success', onConfirm: () => goToList() });
      setDeleteTarget(null);
    } catch (err) {
      setDeleteTarget(null);
      if (qaErrorCode(err) === QA_TOKEN_REQUIRED) {
        // 확인 시간(10분)이 지남 → 비밀번호 다시 확인
        clearQaGuestToken(no ?? '');
        openPwModal('delete');
        return;
      }
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 400 && status !== 404) {
        console.error('삭제 실패:', err);
      }
      setAlert({ message: qaErrorMessage(err, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  /** 비밀번호 확인 모달 (조회·수정·삭제 공용) */
  const pwModal = (
    <Modal
      open={pwPurpose !== null && pwPurpose !== 'view'} // 조회용 비밀번호는 잠금 화면에서 직접 입력
      onClose={closePwModal}
      titleId="qaDetailPwCheckTitle"
      title="비밀번호 확인"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={closePwModal}>
            취소
          </button>
          <button type="button" className="btn btn_md btn_primary" disabled={checking} onClick={handleVerify}>
            {checking ? '확인 중...' : '확인'}
          </button>
        </>
      }
    >
      <div>
        <p className="cell_sub" style={{ marginBottom: 14 }}>
          본인 확인을 위해 작성 시 입력한 비밀번호를 입력해주세요.
        </p>
        <div className="form_group">
          <label className="form_label" htmlFor="qaDetailPw">비밀번호</label>
          <div className="form_control">
            <input
              id="qaDetailPw"
              type="password"
              className={`form_input ${pwError ? 'is_error' : ''}`}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            {pwError && <div className="form_hint error">{pwError}</div>}
          </div>
        </div>
      </div>
    </Modal>
  );


  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="문의사항 상세" description="내용을 불러오는 중입니다." />
      </section>
    );
  }


  // 잠긴 비밀글 — 내용 대신 비밀번호 입력 화면 (회원이 쓴 비밀글이면 로그인 안내)
  if (locked) {
    return (
      <section className="view active">
        <PageHeader
          title="문의사항 상세"
          description="비밀글은 작성자만 볼 수 있습니다."
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        {locked.mno ? (
          <QaLockedView
            post={locked}
            desc="회원이 작성한 비밀글은 작성자만 볼 수 있습니다."
            footText="작성자이신가요?"
            footLinkLabel="로그인하러가기"
            onFootLink={() => navigate('/login')}
          />
        ) : (
          <QaLockedView
            post={locked}
            desc="작성 시 입력한 비밀번호를 입력하면 내용을 볼 수 있습니다."
            password={{ value: pw, onChange: setPw, onSubmit: handleVerify, error: pwError, checking }}
            footText="내 글이 아닌가요?"
            footLinkLabel="목록으로 돌아가기"
            onFootLink={() => goToList()}
          />
        )}
      </section>
    );
  }

  if (error || !qa) {
    return (
      <section className="view active">
        <PageHeader
          title="문의사항 상세"
          description={error ?? '등록한 문의와 답변 내용을 확인할 수 있습니다.'}
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        <div className="detail_area">
          <div className="card card_pad_lg">
            <div className="empty_row">해당 문의를 찾을 수 없거나 권한이 없습니다.</div>
          </div>
        </div>
        {pwModal}
      </section>
    );
  }

  const isWait = qa.status !== 0;
  const answered = qa.status === 2 && qa.answer;

  return (
    <section className="view active">
      <PageHeader
        title="문의사항 상세"
        description="등록한 문의와 답변 내용을 확인할 수 있습니다."
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <div className="detail_area">
        {/* 질문 영역 */}
        <div className="card card_pad_lg">
          <div className="card_header">
            <p className="b_title">No.{qa.no}</p>
            {qa.vmode === 'Y' && (
              <span className="badge neutral">
                <span className="lock" aria-hidden="true"></span> 비밀글
              </span>
            )}
          </div>

          <div className="badge_area">
            <span className={`badge ${QA_STATUS_MAP[qa.status]?.className}`}>{QA_STATUS_MAP[qa.status]?.label}</span>
            <span className={`badge ${QA_TYPE_MAP[qa.type]?.className}`}>{QA_TYPE_MAP[qa.type]?.label}</span>
          </div>

          <div className="title_area">
            <h3 className="title md">
              {qa.title}
              {qa.fileyn === 'Y' && (
                <span className="icon file">
                  <span className="hidden">첨부파일 포함</span>
                </span>
              )}
            </h3>
            <p className="b_title">
              <span>작성자 :
                {qa.mno !== null ? (
                  ` ${qa.id} (No.${qa.mno})`
                ):(' 비회원')}
              </span>
              <span className="right">
                {qa.cdate} | 조회수 {qa.vcnt}
              </span>
            </p>
          </div>

          <div className="card_contents">{qa.content}</div>

          {qa.fileyn === 'Y' && <AttachViewer bno={qa.no} tname={ATTACH_BOARD_LABEL[0].table} onlyList={false} />}

          {/* 비회원 글만 수정/삭제 노출 (회원 글은 로그인 후 내 문의에서) — 본인 확인은 비밀번호로 */}
          {!qa.mno && (
            <div className="form_page_footer">
              <button type="button" className="btn btn_danger" onClick={handleDelete}>
                삭제
              </button>
              {!isWait && (
                <button type="button" className="btn btn_outline_primary" onClick={handleEdit}>
                  수정
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI 자동 답변 — 관리자 답변과 별도 (문의 등록 직후 매뉴얼로 답할 수 있을 때만 등록됨) */}
        {qa.aiAnswer && (
          <div className="card card_pad_lg">
            <h3 className="title sm">AI 답변</h3>
            <div className="answer_area">
              <p className="cell_title">{qa.aiAnswer}</p>
              <div className="cell_sub">
                {qa.aiAdate ? `${qa.aiAdate} · ` : ''}AI가 매뉴얼을 바탕으로 작성한 답변입니다. 관리자 답변도 함께 확인해 주세요.
              </div>
            </div>
          </div>
        )}

        {/* 답변 영역 */}
        <div className="card card_pad_lg">
          <h3 className="title sm">답변</h3>
          <div className="answer_area">
            {answered ? (
              <>
                <p className="cell_title">{qa.answer}</p>
                {qa.adate && <div className="cell_sub">답변일 · {qa.adate}</div>}
              </>
            ) : (
              <p className="cell_title">아직 답변이 등록되지 않았습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* 이전글 / 다음글 Navigation */}
      <PrevNextNav prev={navPosts.prev} next={navPosts.next} basePath="../qa" />

      {/* 삭제 확인 모달 (본인 확인은 이미 비밀번호로 마침) */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined}
      />

      {pwModal}

      {/* 안내 알림 모달 */}
      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}
