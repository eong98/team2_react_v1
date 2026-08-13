import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { NOTICE_TYPE_MAP, type NoticeTypes } from '../../../components/ts/NoticeType';
import { axiosInstance } from '../../../utils/Tool';
import { usePaging } from '../../../hooks/usePaging';
import { AlertModal, ConfirmDeleteModal, PageHeader, PrevNextNav } from '../../../components/ui';
import { GlobalStoreSession } from '../../../store/LoginStore';
import axios from 'axios';

export default function NoticeDetail() {
  const { no } = useParams<{ no: string }>(); // URL에서 no 추출
  const { no:ano, id, grade } = GlobalStoreSession();
  const { goToList, navigateWithQuery } = usePaging({ basePath: '/dbms/notice' });

  const [notice, setNotice] = useState<NoticeTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 이전글 다음글
  const [navPosts, setNavPosts] = useState({
    prev: null,
    next: null
  });
  
  // 삭제 모달 대상 Q&A 및 삭제 중 상태
  const [deleteTarget, setDeleteTarget] = useState<NoticeTypes | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false); // 👈 삭제 진행 로딩 상태 추가

  
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);
  
  /* 공지사항내용 상세 데이터 */
  const loadNotice = () => {
    axiosInstance
      .get(`/notice/${no}`, {
        headers: {
          accessNo: String(ano),
          grade: String(grade),
        }
      })
      .then(result => result.data)
      .then(data => {
        setNotice(data);
        setNavPosts({
          prev : data.prev ?? null,
          next: data.next ?? null,
        })

        console.log(data)
      })
      .catch((err) => {
        console.error('공지사항 상세 조회 실패:', err);
        setError('공지사항 내용을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }


  useEffect(() => {
    if (!no) return;
    setLoading(true);
    setError(null);

    loadNotice();

  }, [no, ano, grade]);

  
  /** Q&A / FAQ 삭제 핸들러 (비밀번호 입력) */
  const handleDeleteWithPw = async (inputPw: string = '') => {
    if (!deleteTarget) return;
    setDeleting(true);
    console.log(inputPw)

    try {
      // Axios DELETE 요청 시 Body로 데이터를 전달할 때는 { data: ... } 옵션을 사용합니다.
      await axiosInstance.delete('/qa', {
        data: {
          no: deleteTarget.no,
          pw: inputPw,
        },
      });
      
      // 빈 페이지 보정(현재 페이지에 데이터가 없으면 한 칸 앞으로)은 이제 loadQaList 안에서
      // 알아서 처리하므로, 여기서는 그냥 다시 조회하면 됩니다.
      setAlert({
        message: '삭제되었습니다.',
        variant: 'success',
        onConfirm: loadNotice,
      });
      setDeleteTarget(null);

    } catch (error) {
      console.error('삭제 실패:', error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status; // HTTP 상태 코드 (400, 401, 404, 500 등)
        const data = error.response?.data; // 백엔드가 보내준 JSON 데이터
                // ----------------------------------------------------
        // 1. HTTP 상태 코드(Status)에 따른 에러 처리
        // ----------------------------------------------------
        if (status === 400 || status === 401) {
          // 비밀번호 틀림 / 잘못된 입력값인 경우
          // const msg = data?.message || '비밀번호가 올바르지 않거나 입력값이 잘못되었습니다.';
          // alert(msg);

        } else if (status === 404) {
          // 존재하지 않는 글번호(no)인 경우
          setAlert({ message: '존재하지 않거나 이미 삭제된 FAQ입니다.', variant: 'error' });

        } else if (status === 500) {
          // 🚨 500 에러일 때: 백엔드 메시지에 "비밀번호"라는 단어가 포함되어 있는지 체크
          if (data?.message?.includes('비밀번호') || data?.message?.includes('password')) {
            setAlert({ message: '비밀번호가 일치하지 않습니다.', variant: 'error' });
          } else {
            setAlert({ message: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.', variant: 'error' });
          }
          
        } else {
          // 기타 상태 코드 처리
          setAlert({ message: `오류가 발생했습니다. (에러 코드: ${status || 'Unknown'})`, variant: 'error' });
        }
        
      } else {
        // Axios 에러가 아닌 일반 자바스크립트 오류
        setAlert({ message: '알 수 없는 오류가 발생했습니다.' , variant: 'error' });
      }
    } finally {
      setDeleting(false);
    }
  };


  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="공지사항 상세" description="내용을 불러오는 중입니다." />
      </section>
    );
  }

  if (error || !notice) {
    return (
      <section className="view active">
        <PageHeader
          title="공지사항 상세"
          description={error ?? '서비스 업데이트와 점검 안내를 확인하세요.'}
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        <div className="detail_area">
          <div className="card card_pad_lg">
            <div className="empty_row">해당 공지사항을 찾을 수 없거나 권한이 없습니다.</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title="공지사항 상세"
        description="등록한 공지사항의 상세 내용을 확인하고 관리합니다."
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
            <p className="b_title">No.{notice.no}</p>
            {notice.vmode === 'N' && (
              <span className="badge neutral">
                <span className="lock" aria-hidden="true"></span> 비밀글
              </span>
            )}
          </div>

          <div className="badge_area">
            <span className={`badge ${NOTICE_TYPE_MAP[notice.type]?.className}`}>{NOTICE_TYPE_MAP[notice.type]?.label}</span>
          </div>

          <div className="title_area">
            <h3 className="title md">
              {notice.title} 
              {notice.fileyn === 'Y' && (
                <span className='icon file'>
                  <span className='hidden'>첨부파일 포함</span>
                </span>
              )}
            </h3>
            <p className="b_title">
              <span>작성자 No.{notice.ano}</span>
              <span className="right">조회수 {notice.vcnt} · {notice.cdate}</span>
            </p>
          </div>

          <p className="card_contents">{notice.content}</p>

          <div className="form_page_footer">
            <button type="button" className="btn btn_sm btn_danger" onClick={() => setDeleteTarget(notice)}>
              삭제
            </button>
            <button
              type="button"
              className="btn btn_sm btn_outline_primary"
              onClick={() => navigateWithQuery('edit')}
            >
              수정
            </button>
          </div>
        </div>

        {/* 🔑 이전글 / 다음글 컴포넌트 연동 */}
      <PrevNextNav
        prev={navPosts.prev}
        next={navPosts.next}
        basePath="../notice"
      />


      {/* 🔑 삭제 확인 모달 (수정됨) */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(pw) => handleDeleteWithPw(pw)}
        loading={deleting}
        targetLabel={
          deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined
        }
        requirePassword={true}
      />


      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
      </div>
    </section>
  );
}