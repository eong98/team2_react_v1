import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header>
      <nav>
        <div className="logo">
          <span className="dot" />
          allimio
        </div>
        <div className="navlinks">
          {/* Link 로 변경예정 */}
          <a href="#features">감지 기능</a>
          <a href="#flow">작동 방식</a>
          <Link to="/user/live">대시보드</Link>
          <a href="#roadmap">확장 계획</a>
        </div>
        <div className="nav_cta">
          <Link to="/login" className="btn btn_ghost">
            로그인
          </Link>
          <Link to="/board/qa" className="btn btn_ghost">
            문의하기
          </Link>
          {/* <Link to="/member/signup" className="btn btn_primary">
            데모 신청
          </Link> */}
        </div>
      </nav>
    </header>
  );
}
