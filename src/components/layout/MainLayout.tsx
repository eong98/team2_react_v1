/* --------------- css import --------------- */
import './mainLayout.css'
/* ------------------------------------------- */

import { Link, Outlet, useLocation } from 'react-router-dom'
import { getCopyright } from '../../utils/Tool'

const MainLayout = () => {
  const { pathname } = useLocation();
  const isMain = pathname.includes('/index');
  const isAdmin = pathname.includes('/dbms');
  return (
    <div className='home'>
      <header>
        <nav>
          <h1 className="logo">
            <Link to='/'>allimio</Link>
          </h1>

          {!isAdmin ? (
            <>
              <div className="navlinks">
                <a href="#features">감지 기능</a>
                <a href="#flow">작동 방식</a>
                <Link to="/user/dashboard/test1">대시보드</Link>
                <a href="#roadmap">확장 계획</a>
              </div>

              <div className="nav_cta">
                <Link to="/" className="btn btn_ghost">
                  문의하기
                </Link>

                <Link to="/login" className="btn btn_primary">
                  데모 신청
                </Link>
              </div>
            </>
          ): null}
        </nav>
      </header>

      <main id='container' className={`wrap${isMain ? ' main' : ''}`}>
        <Outlet />
      </main>

      
      <footer>
        <div className="wrap foot_row">
          <div className="logo">
            allimio
          </div>

          
          {!isAdmin ? (
            <div className="foot_links">
              <a href="#features">감지 기능</a>
              <a href="#flow">작동 방식</a>
              <Link to="/">대시보드</Link>
              <a href="#roadmap">확장 계획</a>
            </div>
          ): null}
          
          <div className="copyright">{getCopyright()}</div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
