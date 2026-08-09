import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/common/PageHeader';

/* ---------------------------------------------------------------------
  
  페이지의 최상단 타이틀은 PageHeader 공통화한 것으로 사용
  에러 메시지 노출을 위해 form_group 으로 감싸서 사용할 것

  ** 웹 접근성 **
  req 사용시 title='필수 입력 요소' 필수 명시
  인풋 사용시 checkbox,radio 외 모든 인풋요소에 label htmlFor / input id 값 매칭 필수

--------------------------------------------------------------------- */

export default function Login() {

  return (
    <section className="view active">
      <PageHeader title="로그인" title_size="xlg" description="allimio 관제 서비스에 오신 것을 환영합니다." />
      
      <div className="card card_pad_lg">
        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-1">
            아이디(이메일)<span className="req" title='필수 입력 요소'>*</span>
          </label>
          <input id="member-fld-1" className="form_input" placeholder="you@example.com" />
        </div>


        <div className="form_group">
          <label className="form_label" htmlFor="member-fld-2">
            비밀번호<span className="req"title='필수 입력 요소'>*</span>
          </label>
          <input id="member-fld-2" className="form_input is_error" type="password" placeholder="비밀번호 입력" />
          <div className="form_hint error">비밀번호는 8자 이상이어야 합니다</div>
        </div>
        
        <button className="btn btn_lg btn_primary">로그인</button>
        
        <div className="link_row">
          <Link to="/">아이디/비밀번호 찾기</Link>
          <Link to="/">회원가입</Link>
        </div>
      </div>
    </section>
  );
}
