import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AlertModal, ConfirmDeleteModal, PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { QA_STATUS_MAP, QA_TYPE_MAP, type QaTypes, type TabKey } from '../../../components/ts/QaType';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { useTab } from '../../../hooks/useTab';

export default function QaDetail() {
  const { no } = useParams<{ no: string }>(); // URL에서 no 추출
  const { no: mno, grade } = GlobalStoreSession(); // 현재 로그인한 회원 번호

  // 범용 useTab 훅 사용
  const { goToList, navigateWithTab } = useTab<TabKey>({
    defaultTab: 'qa',
    basePath: '/user/qa',
  });

  const [qa, setQa] = useState<QaTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  /* 문의내용 상세 데이터 */
  const loadQa = () => {
    axiosInstance
      .get(`/qa/${no}`, {
        headers: {
          accessNo: String(mno),
          grade: String(grade),
        },
      })
      .then((res) => setQa(res.data))
      .catch((err) => {
        console.error('문의 상세 조회 실패:', err);
        setError('문의 내용을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }


  useEffect(() => {
    if (!no) return;
    setLoading(true);
    setError(null);

    loadQa();

  }, [no, mno, grade]);

  const [deleteTarget, setDeleteTarget] = useState<QaTypes | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  // 비밀번호 입력 후 삭제 실행
  const handleDeleteWithPw = async (inputPw: string = '') => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await axiosInstance.delete('/qa', {
        data: { no: deleteTarget.no, pw: inputPw },
      });

      setAlert({ message: '삭제되었습니다.', variant: 'success', onConfirm: () => goToList() });
      setDeleteTarget(null);
    } catch (error) {
      console.error('삭제 실패:', error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 400 || status === 401) {
          setAlert({ message: '비밀번호가 올바르지 않거나 입력값이 잘못되었습니다.', variant: 'error' });
        } else if (status === 404) {
          setAlert({ message: '존재하지 않거나 이미 삭제된 항목입니다.', variant: 'error' });
        } else if (status === 500) {
          if (data?.message?.includes('비밀번호') || data?.message?.includes('password')) {
            setAlert({ message: '비밀번호가 일치하지 않습니다.', variant: 'error' });
          } else {
            setAlert({ message: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.', variant: 'error' });
          }
        } else {
          setAlert({ message: `오류가 발생했습니다. (에러 코드: ${status || 'Unknown'})`, variant: 'error' });
        }
      } else {
        setAlert({ message: '알 수 없는 오류가 발생했습니다.', variant: 'error' });
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="문의 상세" description="내용을 불러오는 중입니다." />
      </section>
    );
  }

  if (error || !qa) {
    return (
      <section className="view active">
        <PageHeader
          title="문의 상세"
          description={error ?? '등록한 문의와 답변 내용을 확인할 수 있습니다.'}
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        <div className="qa_area">
          <div className="card card_pad_lg">
            <div className="empty_row">해당 문의를 찾을 수 없거나 권한이 없습니다.</div>
          </div>
        </div>
      </section>
    );
  }

  // 답변 대기중이 아닌경우만
  const isWait = qa.status !== 0;
  const answered = qa.status === 2 && qa.answer;

  return (
    <section className="view active">
      <PageHeader
        title="문의 상세"
        description="등록한 문의와 답변 내용을 확인할 수 있습니다."
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <div className="qa_area">
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
            <span className={`badge ${QA_STATUS_MAP[qa.status].className}`}>{QA_STATUS_MAP[qa.status].label}</span>
            <span className={`badge ${QA_TYPE_MAP[qa.type].className}`}>{QA_TYPE_MAP[qa.type].label}</span>
          </div>

          <div className="title_area">
            <h3 className="title md">{qa.title}</h3>
            <p className="b_title">
              <span>작성자 No.{qa.mno}</span>
              <span className="right">{qa.cdate}</span>
            </p>
          </div>

          <p className="card_contents">{qa.content}</p>

          {/* 본인 글인 경우에만 수정/삭제 노출 */}
          {mno === qa.mno && (
            <div className="form_page_footer">
              <button type="button" className="btn btn_sm btn_danger" onClick={() => setDeleteTarget(qa)}>
                삭제
              </button>
              {/* 답변대기인 경우에만 수정 버튼 노출 */}
              {!isWait && (
                <button
                  type="button"
                  className="btn btn_sm btn_outline_primary"
                  onClick={() => navigateWithTab('edit')}
                >
                  수정
                </button>
              )}
            </div>
          )}
        </div>

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

      {/* 비밀번호 입력 삭제 모달 */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(pw) => handleDeleteWithPw(pw || '')}
        loading={deleting}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined}
        requirePassword={true}
      />

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