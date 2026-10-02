/* --------------- css import --------------- */
import './mainLayout.css'
/* ------------------------------------------- */

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { axiosInstance, getCopyright } from '../../utils/Tool'
import { GlobalStoreSession } from '../../store/LoginStore';
import { AlertModal } from '../ui';
import { useEffect, useState } from 'react';
import ChatBotWidget from '../ui/chatbot/ChatBotWidget';
import { GlobalCurrentShop } from '../../store/UserStore';

import { getUnreadNotificationCount } from '../ts/notification';
import bellUnread from '../../assets/images/icon/notification-bell-unread.svg';


const MainLayout = () => {
  const { pathname, hash, key } = useLocation();
  const navigate = useNavigate();

  const { login, grade, no: mno } = GlobalStoreSession();

  const isAdminGrade = grade >= 1 && grade <= 5; // 1~5 관리자, 6~10 사용자
  const isMain = pathname.includes('/index');
  const isAdmin = pathname.includes('/dbms');


  // 헤더·푸터의 "/index#features" 같은 링크 처리
  useEffect(() => {
    if (!hash) return;

    const id = decodeURIComponent(hash.slice(1));

    let tries = 0;
    let timer: number | undefined;

    const scrollToSection = () => {
      const el = document.getElementById(id);

      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

        return;
      }

      if (tries++ < 20) {
        timer = window.setTimeout(
          scrollToSection,
          50
        );
      }
    };

    scrollToSection();

    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [pathname, hash, key]);


  const [alert, setAlert] = useState<{
    message: string;
    variant?: 'success' | 'error';
    onConfirm?: () => void;
  } | null>(null);


  /* ========================================
     미확인 알림 개수
  ======================================== */

  const [unreadCount, setUnreadCount] = useState(0);


  useEffect(() => {

    // 로그인하지 않았거나 관리자인 경우 조회하지 않음
    if (!login || !mno || isAdminGrade) {
      setUnreadCount(0);
      return;
    }


    const loadUnreadCount = async () => {

      try {

        const count =
          await getUnreadNotificationCount(mno);

        setUnreadCount(count);

      } catch (error) {

        console.error(
          '미확인 알림 개수 조회 실패:',
          error
        );

      }
    };


    loadUnreadCount();

  }, [login, mno, isAdminGrade]);


  /* ========================================
     로그아웃
  ======================================== */

  const handleLogout = async () => {

    try {

      await axiosInstance.post('/auth/logout');

    } catch (err) {

      console.error(
        '로그아웃 처리 중 오류(무시 가능):',
        err
      );

    } finally {

      // 로그인 상태 초기화
      GlobalStoreSession
        .getState()
        .clearAuth();

      // 현재 입장 매장 초기화
      GlobalCurrentShop
        .getState()
        .clearShop();

      navigate('/login');
    }
  };


  return (
    <div className='home'>

      <header>

        <nav>

          <h1 className="logo">
            <Link to={isAdmin ? '/dbms' : '/'}>
              allimio{isAdmin && ' 관리자'}
            </Link>
          </h1>


          {!isAdmin ? (
            <>

              {/* ========================================
                  메인 메뉴
              ======================================== */}

              <div className="navlinks">

                <Link to="/index#features">
                  감지 기능
                </Link>

                <Link to="/index#flow">
                  작동 방식
                </Link>

                <Link to="/index#dashboard">
                  대시보드
                </Link>

                <Link to="/index#roadmap">
                  확장 계획
                </Link>

                <Link
                  to={
                    login
                      ? '/user/notice'
                      : '/board'
                  }
                >
                  고객센터
                </Link>

              </div>


              {/* ========================================
                  오른쪽 메뉴
              ======================================== */}

              <div className="nav_utils">


                {/* 문의 / 구독 */}

                <div className='nav_cta'>

                  <Link
                    to={
                      login
                        ? '/user/qa/new'
                        : '/board/qa/new'
                    }
                    className="btn btn_sm btn_ghost"
                  >
                    문의하기
                  </Link>


                  <Link
                    to="/shopplan"
                    className="btn btn_sm btn_primary"
                  >
                    구독하기
                  </Link>

                </div>


                {/* 로그인 관련 아이콘 */}

                <div className='nav_cta'>

                  {login ? (
                    <>

                      {/* 관제 사이트 이동 */}

                      <Link
                        to={
                          isAdminGrade
                            ? '/dbms/memberlist'
                            : '/user/dashboard'
                        }
                        className="nav_icon_btn console"
                        title={
                          isAdminGrade
                            ? '관리자 사이트로 이동'
                            : '관제 사이트로 이동'
                        }
                        aria-label={
                          isAdminGrade
                            ? '관리자 사이트로 이동'
                            : '관제 사이트로 이동'
                        }
                      />


                      {/* 로그아웃 */}

                      <button
                        type="button"
                        className="nav_icon_btn logout"
                        title="로그아웃"
                        aria-label="로그아웃"
                        onClick={handleLogout}
                      />


                      {/* 일반 회원 알림 */}

                      {!isAdminGrade && (

                        <Link
                          to="/user/notification"
                          className="main_notification_btn"
                          title="알림 관리"
                          aria-label={
                            unreadCount > 0
                              ? `알림 관리, 미확인 알림 ${unreadCount}건`
                              : '알림 관리'
                          }
                        >

                          <img
                            src={bellUnread}
                            className="main_notification_bell"
                            alt=""
                          />


                          {unreadCount > 0 && (

                            <span className="main_notification_badge">

                              {unreadCount > 99
                                ? '99+'
                                : unreadCount}

                            </span>

                          )}

                        </Link>

                      )}

                    </>

                  ) : (

                    <>

                      {/* 일반 로그인 */}

                      <Link
                        to="/login"
                        className="nav_icon_btn login"
                        title="로그인"
                        aria-label="로그인"
                      />


                      {/* 관리자 로그인 */}

                      <Link
                        to="/dbms/login"
                        className="nav_icon_btn admin"
                        title="관리자 로그인"
                        aria-label="관리자 로그인"
                      />

                    </>

                  )}

                </div>

              </div>

            </>

          ) : null}


          {/* 관리자 페이지 → 메인 */}

          {isAdmin && (

            <Link
              to="/"
              className="btn btn_link"
            >
              메인페이지로 이동
            </Link>

          )}

        </nav>

      </header>


      {/* ========================================
          CONTENT
      ======================================== */}

      <main
        id="container"
        className={`wrap${isMain ? ' main' : ''}`}
      >

        <Outlet />

      </main>


      {/* ========================================
          FOOTER
      ======================================== */}

      <footer>

        <div className="wrap foot_row">

          <div className="logo">
            allimio{isAdmin && ' 관리자'}
          </div>


          {!isAdmin ? (

            <div className="foot_links">

              <Link to="/index#features">
                감지 기능
              </Link>

              <Link to="/index#flow">
                작동 방식
              </Link>

              <Link to="/index#dashboard">
                대시보드
              </Link>

              <Link to="/index#roadmap">
                확장 계획
              </Link>

              <Link
                to={
                  login
                    ? '/user/notice'
                    : '/board'
                }
              >
                고객센터
              </Link>

            </div>

          ) : null}


          <div className="copyright">
            {getCopyright()}
          </div>

        </div>

      </footer>


      {/* 챗봇 */}

      {!isAdmin && <ChatBotWidget />}


      {/* AlertModal을 실제 사용하는 코드가 추가될 경우 사용 */}
      {alert && (
        <AlertModal
          open={true}
          message={alert.message}
          variant={alert.variant}
          onClose={() => setAlert(null)}
        />
      )}

    </div>
  )
}


export default MainLayout