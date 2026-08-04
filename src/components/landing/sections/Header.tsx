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
          <a href="#features">감지 기능</a>
          <a href="#flow">작동 방식</a>
          <a href="/dashboard">대시보드</a>
          <a href="#roadmap">확장 계획</a>
        </div>
        <div className="nav_cta">
          <Link to="/board/qa" className="btn btn_ghost">
            문의하기
          </Link>
          <Link to="/member/signup" className="btn btn_primary">
            데모 신청
          </Link>
        </div>
      </nav>
    </header>
  );
}
