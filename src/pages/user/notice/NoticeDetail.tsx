import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { NOTICE_TYPE_MAP, type NoticeTypes } from '../../../components/ts/NoticeType';
import { axiosInstance } from '../../../utils/Tool';
import { usePaging } from '../../../hooks/usePaging';
import { PageHeader, PrevNextNav } from '../../../components/ui';

export default function NoticeDetail() {
  const { no } = useParams<{ no: string }>(); // URL에서 no 추출
  const { goToList } = usePaging({ basePath: '/user/notice' });

  const [notice, setNotice] = useState<NoticeTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 이전글 다음글
  const [navPosts, setNavPosts] = useState({
    prev: null,
    next: null
  });
  
  
  /* 공지사항내용 상세 데이터 */
  const loadNotice = () => {
    axiosInstance
      .get(`/notice/${no}`)
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

  }, [no]);

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
            <div className="empty_row">해당 공지사항를 찾을 수 없거나 권한이 없습니다.</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title="공지사항 상세"
        description="등록한 공지사항와 답변 내용을 확인할 수 있습니다."
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
        </div>

        {/* 🔑 이전글 / 다음글 컴포넌트 연동 */}
      <PrevNextNav
        prev={navPosts.prev}
        next={navPosts.next}
        basePath="../notice"
      />

      </div>
    </section>
  );
}