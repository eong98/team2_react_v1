import type { QaTypes } from '../../ts/QaType';

/* ---------------------------------------------------------------------
   잠긴 비밀글 화면 — 문의 상세(회원 /user/qa, 비회원 /board/qa) 공용

   서버가 열 수 없는 비밀글을 locked=true(내용 없음)로 응답하면,
   상세 내용 대신 이 화면을 보여줍니다. (목록에서는 모달 없이 상세로 이동)
   - password를 넘기면 비밀번호 입력 칸 표시 (비회원이 자기 글을 열 때)
   - 넘기지 않으면 안내만 표시 (작성자만 볼 수 있는 글)

   디자인은 구독권 화면의 로그인 안내와 같은 구성: 아이콘 → 제목 → 글 → 설명 → 입력 → 구분선 아래 링크
   (스타일: styles/common.css .qa_locked)
--------------------------------------------------------------------- */

interface QaLockedViewProps {
  /** 잠긴 글 (번호·제목만 사용) */
  post: Pick<QaTypes, 'no' | 'title'>;
  /** 안내 문구 */
  desc: string;
  /** 비밀번호 입력 (없으면 입력 칸 없이 안내만) */
  password?: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    error?: string;
    checking?: boolean;
  };
  /** 구분선 아래 한 줄 — 예: "내 글이 아닌가요?" + [목록으로 돌아가기] */
  footText: string;
  footLinkLabel: string;
  onFootLink: () => void;
}

export default function QaLockedView({ post, desc, password, footText, footLinkLabel, onFootLink }: QaLockedViewProps) {
  return (
    <div className="detail_area">
      <div className="card card_pad_lg">
        <div className="qa_locked">
          <span className="qa_locked_icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              <path d="M12 14.5v2.5" />
            </svg>
          </span>
          <p className="qa_locked_title">비밀글입니다</p>
          <p className="qa_locked_post">No.{post.no} · {post.title}</p>
          <p className="qa_locked_desc">{desc}</p>

          {password && (
            <>
              <form
                className="qa_locked_form"
                onSubmit={(e) => {
                  e.preventDefault();
                  password.onSubmit();
                }}
              >
                <label className="hidden" htmlFor="qaLockedPw">비밀번호</label>
                <input
                  id="qaLockedPw"
                  type="password"
                  className={`form_input ${password.error ? 'is_error' : ''}`}
                  placeholder="게시글 비밀번호"
                  value={password.value}
                  onChange={(e) => password.onChange(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn_md btn_primary" disabled={password.checking}>
                  {password.checking ? '확인 중...' : '확인'}
                </button>
              </form>
              {password.error && <div className="form_hint error qa_locked_error">{password.error}</div>}
            </>
          )}

          <div className="qa_locked_foot">
            <span>{footText}</span>
            <button type="button" className="qa_locked_link" onClick={onFootLink}>
              {footLinkLabel}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
