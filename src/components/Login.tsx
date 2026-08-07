import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// 파일이름 꼭 맞춰주세요 
/* ---------------------------------------------------------------------
   ⚠️ 이 파일은 "관리자 CRUD 리스트" 공용 디자인 틀 사용 예시입니다.
   검색 / 생성 / 수정 / 삭제 / 페이지네이션이 모두 붙어있는 기본 패턴이라
   CCTV, 이슈, 유형코드, 매장 등 다른 리스트 화면도 이 구조를 그대로 복사해서
   columns / 상태값 / API 연동 부분만 바꾸면 됩니다.
   (공용 컴포넌트: src/components/dbms/common/*, 스타일: src/components/style/dbms.css)

   ※ 생성/수정은 모달이 아니라 전용 라우트(페이지)로 분리했습니다.
     - 작성: /dbms/board/notice/new
     - 수정: /dbms/board/notice/:no/edit
     - 삭제는 그대로 확인 모달(ConfirmDeleteModal) 사용.
     → 폼 화면 구현은 NoticeFormView.tsx 참고.
--------------------------------------------------------------------- */

export default function Login() {

  return (
    <main id='container' className='wrap login'>
      <section className="view active">
        <div className="view_head">
          <h1>로그인</h1>
          <p>allimio 관제 서비스에 오신 것을 환영합니다.</p>
        </div>
        <div className="card card_pad_lg">
          <div className="form_group">
            <label className="form_label" htmlFor="member-fld-1">
              아이디(이메일)<span className="req">*</span>
            </label>
            <input id="member-fld-1" className="form_input" placeholder="you@example.com" />
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="member-fld-2">
              비밀번호<span className="req">*</span>
            </label>
            <input id="member-fld-2" className="form_input" type="password" placeholder="비밀번호 입력" />
          </div>
          <button className="btn btn_lg btn_primary">로그인</button>
          <div className="link_row">
            <Link to="/">아이디/비밀번호 찾기</Link>
            <Link to="/">회원가입</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
