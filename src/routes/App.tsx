/* --------------- css import --------------- */
import '../styles/common.css'
import '../styles/contents.css'
/* ------------------------------------------- */

import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import { ScrollToTop } from '../utils/Tool';

/* 메인페이지 import */
import MainLayout from '../components/layout/MainLayout'
import Home from '../pages/main/Home';
import Login from '../pages/main/Login'
import Singup from '../pages/main/Signup'

/* 서비스페이지 import */
import BaseLayout from '../components/layout/BaseLayout';
import UserRoutes from './UserRoutes';
import DbmsRoutes from './DbmsRoutes';
import RequireUserAuth from './RequireUserAuth';

import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/ui/common/Topbar';
import ChatWidget from '../components/ui/user/ChatWidget';


/* 구독권 구매 */
import ShopPlan from '../pages/main/shopplan/ShopPlan';

/* 고객센터 */
import BoardLayout from '../components/layout/BoardLayout';
import FaqList from '../pages/main/board/FaqList';
import NoticeList from '../pages/user/notice/NoticeList';
import NoticeDetail from '../pages/user/notice/NoticeDetail';
import QaList from '../pages/main/board/QaList';
import QaDetail from '../pages/main/board/QaDetail';
import QaForm from '../pages/user/qa/QaForm';


import DesignGuide from '../pages/guide/DesignGuide';


function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div id='allimio'>
        <Routes>
          {/* 메인 (공통) 영역 */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/index" replace />} />{/* 메인페이지 */}
            <Route path="/dbms" element={<Navigate to="/dbms/login" replace />} />

            <Route path='/index' element={<Home />} />
            <Route path='/login' element={<Login />} />{/* 로그인 */}

            {/* 회원가입, 구독권 등.... */}
            <Route path='/singup' element={<Singup />} />
            <Route path='/shopplan' element={<ShopPlan />} />

            {/* 고객센터(비회원 전용) */}
            <Route path='/board' element={<BoardLayout />}>
              <Route index element={<Navigate to="faq" replace />} />
              <Route path='faq' element={<FaqList />} />
              <Route path='notice' element={<NoticeList />} />
              <Route path='notice/:no' element={<NoticeDetail />} />
              <Route path='qa' element={<QaList />} />
              <Route path='qa/:no' element={<QaDetail />} />
              <Route path='qa/new' element={<QaForm />} />
              <Route path='qa/:no/edit' element={<QaForm />} />
            </Route>

        
          </Route>

          {/* 서비스 영역 - 사용자 (로그인 + mno + grade 1~10 필요, 아니면 /login) */}
          <Route element={<RequireUserAuth />}>
            <Route element={<BaseLayout Sidebar={Sidebar} Topbar={Topbar} ChatWidget={ChatWidget} />}>
              <Route path="/user/*" element={<UserRoutes />} />
            </Route>
          </Route>

          {/* 서비스 영역 - 관리자 */}
          <Route element={<BaseLayout Sidebar={Sidebar} Topbar={Topbar} />}>
            <Route path="/dbms/*" element={<DbmsRoutes />} />
          </Route>




          {/* 가이드 */}
          <Route element={<BaseLayout Sidebar={Sidebar} Topbar={Topbar} />}>
            <Route path="/guide" element={<DesignGuide />} />
          </Route>
          
        </Routes>
      </div>
    </BrowserRouter>


  )
}

export default App