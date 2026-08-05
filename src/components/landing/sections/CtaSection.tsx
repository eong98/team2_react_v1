import { Link } from 'react-router-dom';

export default function CtaSection() {
  return (
    <section className="cta border_top">
      <div className="wrap">
        <h2>지금, 매장에 눈을 달아주세요</h2>
        <p>도입 상담과 데모 시연을 신청하시면 담당자가 안내해드립니다.</p>
        <div className="cta_actions">
          <Link to="/member/signup" className="btn btn_primary">
            데모 신청하기
          </Link>
          <a href="/board#qna" className="btn btn_ghost">
            문의하기
          </a>
        </div>
      </div>
    </section>
  );
}
