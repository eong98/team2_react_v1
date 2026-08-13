import { usePaging } from "../../../hooks/usePaging";


export interface NavPost {
  no: number | string;
  title: string;
  fileyn?: string;
  cdate: string;
}

interface PrevNextNavProps {
  /** 이전글 데이터 (없으면 null 또는 undefined) */
  prev?: NavPost | null;
  /** 다음글 데이터 (없으면 null 또는 undefined) */
  next?: NavPost | null;
  /** 이동할 기본 경로 (예: '/user/notice' 또는 '../notice') */
  basePath?: string;
}

/**
 * 이전글/다음글 네비게이션. 일반 <Link> 대신 usePaging의 navigateWithQuery를 씁니다 —
 * 그래야 지금 목록에서 몇 번째 탭·몇 페이지를 보다가 들어왔는지(?tab=...&page=...)가
 * 다음글/이전글로 넘어갈 때도 유지되고, 거기서 "목록으로" 눌러도 원래 있던 자리로 돌아갑니다.
 *
 * 사용 예:
 *   const [navPosts, setNavPosts] = useState<{ prev: NavPost | null; next: NavPost | null }>({
 *     prev: null,
 *     next: null,
 *   });
 *
 *   // 상세 조회 응답에서
 *   setNavPosts({ prev: res.data.prev ?? null, next: res.data.next ?? null });
 *
 *   <PrevNextNav prev={navPosts.prev} next={navPosts.next} basePath="../notice" />
 */
export default function PrevNextNav({ prev, next, basePath = '' }: PrevNextNavProps) {
  const { navigateWithQuery } = usePaging();

  return (
    <div className="pn_nav">
      {/* 이전글 */}
      <div className={`pn_row prev ${!prev ? 'disabled' : ''}`}>
        <span className="pn_label">이전글</span>
        {prev ? (
          <>
            <button type="button" className="pn_title" onClick={() => navigateWithQuery(`${basePath}/${prev.no}`)}>
              {prev.title}
            </button>

            <div className="info">
              {prev.fileyn === 'Y' && (
                <span className='icon file'>
                  <span className='hidden'>첨부파일 포함</span>
                </span>
              )}
              <span className="pn_date">{prev.cdate.split(' ')[0]}</span>
            </div>
          </>
        ) : (
          <span className="pn_title">이전글이 없습니다.</span>
        )}
      </div>

      {/* 다음글 */}
      <div className={`pn_row next ${!next ? 'disabled' : ''}`}>
        <span className="pn_label">다음글</span>
        {next ? (
          <>
            <button type="button" className="pn_title" onClick={() => navigateWithQuery(`${basePath}/${next.no}`)}>
              {next.title}
            </button>

            <div className="info">
              {next.fileyn === 'Y' && (
                <span className='icon file'>
                  <span className='hidden'>첨부파일 포함</span>
                </span>
              )}
              <span className="pn_date">{next.cdate.split(' ')[0]}</span>
            </div>
          </>
        ) : (
          <span className="pn_title">다음글이 없습니다.</span>
        )}
      </div>
    </div>
  );
}