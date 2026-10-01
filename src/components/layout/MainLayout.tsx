/* --------------- css import --------------- */
import './mainLayout.css'
/* ------------------------------------------- */

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { axiosInstance, getCopyright } from '../../utils/Tool'
import { GlobalStoreSession } from '../../store/LoginStore';
import { AlertModal } from '../ui';
import { useEffect, useState } from 'react';
import ChatBotWidget from '../ui/chatbot/ChatBotWidget';

const MainLayout = () => {
  const { pathname, hash, key } = useLocation();
  const navigate = useNavigate();
  const { login, grade } = GlobalStoreSession();
  const isAdminGrade = grade >= 1 && grade <= 5; // 1~5 관리자, 6~10 사용자
  const isMain = pathname.includes('/index');
  const isAdmin = pathname.includes('/dbms');

  // 헤더·푸터의 "/index#features" 같은 링크 처리 — React Router는 주소만 바꾸고 스크롤은 안 해줌.
  //  1) 메인에서 클릭: 바로 해당 섹션으로 스크롤 (같은 링크를 다시 눌러도 key가 바뀌어 다시 동작)
  //  2) 고객센터 등 다른 페이지에서 클릭: 메인으로 이동 → 섹션이 화면에 그려질 때까지 잠깐 기다렸다가 스크롤
  // 고정 헤더에 가려지지 않게 섹션에 scroll-margin-top(mainLayout.css)을 줌
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer: number | undefined;
    const scrollToSection = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries++ < 20) timer = window.setTimeout(scrollToSection, 50); // 최대 1초 대기
    };
    scrollToSection();
    return () => window.clearTimeout(timer);
  }, [pathname, hash, key]);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

    
  return (
    <div className='home'>
      <header>
        <nav>
          <h1 className="logo">
            <Link to={isAdmin ? '/dbms' : '/'}>allimio{isAdmin && ' 관리자'}</Link>
          </h1>

          {!isAdmin ? (
            <>
              <div className="navlinks">
                {/* "#features"처럼 현재 페이지 기준으로 쓰면 고객센터 등에서 누를 때 그 페이지에 #만 붙어 메인으로 안 감 → 항상 /index 포함 */}
                <Link to="/index#features">감지 기능</Link>
                <Link to="/index#flow">작동 방식</Link>
                <Link to="/index#dashboard">대시보드</Link>
                <Link to="/index#roadmap">확장 계획</Link>
                <Link to={login ? '/user/notice' : '/board'}>고객센터</Link>
              </div>

              <div className="nav_utils">
                <div className='nav_cta'>
                  <Link to={login ? '/user/qa/new' : '/board/qa/new'} className="btn btn_sm btn_ghost">
                    문의하기
                  </Link>

                  <Link to={'/shopplan'} className="btn btn_sm btn_primary">
                    구독하기
                  </Link>
                </div>

                {/* 로그인 전: 로그인 + 관리자 로그인(동그란 아이콘) / 로그인 후: 로그아웃 */}
                <div className='nav_cta'>
                  {/* 로그인 전: 로그인 + 관리자 로그인 / 로그인 후: 로그아웃
                      아이콘은 CSS 배경 이미지(assets/images/icon/ico-login*.png, ico-admin*.png, ico-logout*.png) */}
                  {login ? (
                    <>
                      {/* 관제 사이트 이동 — 관리자(1~5등급)는 관리자 사이트, 일반 회원은 사용자 관제 화면 */}
                      <Link to={isAdminGrade ? '/dbms/memberlist' : '/user/dashboard'} className="nav_icon_btn console"
                        title={isAdminGrade ? '관리자 사이트로 이동' : '관제 사이트로 이동'}
                        aria-label={isAdminGrade ? '관리자 사이트로 이동' : '관제 사이트로 이동'} />
                      <button type="button" className="nav_icon_btn logout"
                        title="로그아웃" aria-label="로그아웃" />
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="nav_icon_btn login" title="로그인" aria-label="로그인" />
                      <Link to="/dbms/login" className="nav_icon_btn admin" title="관리자 로그인" aria-label="관리자 로그인" />
                    </>
                  )}
                </div>
              </div>
            </>
          ): null}

          {isAdmin && (
            <Link to='/' className='btn btn_link'>메인페이지로 이동</Link>
          )}
        </nav>
      </header>

      <main id='container' className={`wrap${isMain ? ' main' : ''}`}>
        <Outlet />
      </main>

      
      <footer>
        <div className="wrap foot_row">
          <div className="logo">
            allimio{isAdmin && ' 관리자'}
          </div>

          
          {!isAdmin ? (
            <div className="foot_links">
              <Link to="/index#features">감지 기능</Link>
              <Link to="/index#flow">작동 방식</Link>
              <Link to="/index#dashboard">대시보드</Link>
              <Link to="/index#roadmap">확장 계획</Link>
              <Link to={login ? '/user/notice' : '/board'}>고객센터</Link>
            </div>
          ): null}
          
          <div className="copyright">{getCopyright()}</div>
        </div>
      </footer>


      {!isAdmin && <ChatBotWidget />}
    </div>
  )
}

export default MainLayout
