import { Link } from "react-router-dom";
import { useClock } from "../../hooks/useClock";

export default function Hero() {
  const clock = useClock();

  return (
    <section className="hero">
      <div className="wrap hero_grid">
        <div>
          <span className="eyebrow">AI 무인매장 실시간 관제</span>
          <h1>
            사람이 없어도,
            <br />
            <em>매장은 지켜집니다</em>
          </h1>
          <p className="hero_sub">
            무인카페·스터디카페의 CCTV 영상을 AI가 실시간으로 분석해 폭행, 기물파손, 쓰러짐, 무단침입을 즉시
            감지하고 관리자에게 알립니다.
          </p>
          <div className="hero_actions">
            <Link to="/member/signup" className="btn btn_primary">
              데모 신청하기
            </Link>
            <a href="#flow" className="btn btn_ghost">
              작동 방식 보기
            </a>
          </div>
          <div className="hero_stats">
            <div>
              <div className="num mono">2.3초</div>
              <div className="lab">평균 알림 전송 속도</div>
            </div>
            <div>
              <div className="num mono">5종</div>
              <div className="lab">실시간 이상행동 감지</div>
            </div>
            <div>
              <div className="num mono">24/7</div>
              <div className="lab">무중단 실시간 분석</div>
            </div>
          </div>
        </div>

        <div className="wall">
          <div className="wall_bar">
            <span className="live">LIVE</span>
            <span>본점 · CAM 01–04</span>
          </div>
          <div className="cams">
            <div className="cam">
              <span className="cam_tag">CAM 01</span>
              <div className="cam_noise" />
            </div>
            <div className="cam alert">
              <span className="cam_tag">CAM 02</span>
              <div className="cam_noise" />
              <div className="bbox" />
            </div>
            <div className="cam">
              <span className="cam_tag">CAM 03</span>
              <div className="cam_noise" />
            </div>
            <div className="cam">
              <span className="cam_tag">CAM 04</span>
              <div className="cam_noise" />
            </div>
          </div>
          <div className="wall_footer">
            <span>본점 · 스터디카페 A</span>
            <span>{clock}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
