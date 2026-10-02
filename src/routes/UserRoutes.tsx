import { Link, Navigate, Route, Routes } from 'react-router-dom';

/* 예시용 입니다. */
import DashboardLayout from '../components/layout/DashboardLayout';
import Dashboard from '../pages/user/dashboard/Dashboard'; // [추가] 매장 통계


import QaList from '../pages/user/qa/QaList';
import QaForm from '../pages/user/qa/QaForm';
import QaDetail from '../pages/user/qa/QaDetail';

import NoticeList from '../pages/user/notice/NoticeList';
import NoticeDetail from '../pages/user/notice/NoticeDetail';


import ShopList from '../pages/user/shop/ShopList';
import ShopForm from '../pages/user/shop/ShopForm';
import ShopCalendar from '../pages/user/shop/ShopCalendar';
import CctvIssueList from '../pages/user/cctv/CctvIssueList';
import CctvList from '../pages/user/cctv/CctvList';
import CctvVisitorList from '../pages/user/cctv/CctvVisitorList';

import SurveyUserList from '../pages/user/survey/SurveyUserList';
import SurveyAnswerForm from '../pages/user/survey/SurveyAnswerForm';
import SurveyMyResponse from '../pages/user/survey/SurveyMyResponse';

import ShopMapUserList from '../pages/user/shopmap/ShopMapUserList';

import MyPage from '../pages/main/mypage/MyPage';
import ChangePassword from '../pages/main/mypage/ChangePassword';
import InviteMain from '../pages/user/invite/InviteMain';

import ShopMatch from '../pages/user/shoporder/ShopMatch';
import ShopOrderList from '../pages/user/shoporder/ShopOrderList';
import ShopOrderDetail from '../pages/user/shoporder/ShopOrderDetail';
import ShopPaymentList from '../pages/user/shoporder/ShopPaymentList';
import ShopPaymentDetail from '../pages/user/shoporder/ShopPaymentDetail';
import ShopRefundDetail from '../pages/user/shoporder/ShopRefundDetail';
import ShopOrderLog from '../pages/user/shoporder/ShopOrderLog';
import ShopOrder from '../pages/user/shop/ShopOrderList';
import ShopOrderMatch from '../pages/user/shoporder/ShopOrderMatch';

import ShopSurveyList from '../pages/user/shopsurvey/ShopSurveyList';
import ShopSurveyDetail from '../pages/user/shopsurvey/ShopSurveyDetail';
import ShopSurveyEdit from '../pages/user/shopsurvey/ShopSurveyEdit';

import Notification from '../pages/user/notification/Notification';
import ShopOrderPendingnList from '../pages/user/shoporder/ShopOrderPendingList';


export default function UserRoutes() {
  return (
    <Routes>
      {/* 참고해서 추가하시면 됩니다 / 페이지 추가 */}
      <Route index element={<Navigate to="shop" replace />} />

      <Route path="qa" element={<QaList />} />
      <Route path="qa/new" element={<QaForm />} />
      <Route path="qa/:no/edit" element={<QaForm />} />
      <Route path="qa/:no" element={<QaDetail />} />

      <Route path="notice" element={<NoticeList />} />
      <Route path="notice/:no" element={<NoticeDetail />} />

      {/* 전체 구독내역 */}
      <Route path="shoporder" element={<ShopOrderList />} />
      <Route path="shoporder/:no/match" element={<ShopMatch />} />
      <Route path="shoporder/:ono" element={<ShopOrderDetail />}>
        <Route path="payment" element={<ShopPaymentList />} />
        <Route path="history" element={<ShopOrderLog />} />
      </Route>
      <Route path="shoporder/:ono/payment/:pno" element={<ShopPaymentDetail />} />
      <Route path="shoporder/:ono/payment/:pno/refund" element={<ShopRefundDetail />} />
      <Route path="pending" element={<ShopOrderPendingnList />} />

      {/* 매장별 구독권 */}
      <Route path="order" element={<ShopOrder />} />
      <Route path="order/:sno/match" element={<ShopOrderMatch />} />
      <Route path="order/:ono" element={<ShopOrderDetail />}>
        <Route path="payment" element={<ShopPaymentList />} />
        <Route path="history" element={<ShopOrderLog />} />
      </Route>
      <Route path="order/:ono/payment/:pno" element={<ShopPaymentDetail />} />
      <Route path="order/:ono/payment/:pno/refund" element={<ShopRefundDetail />} />


      <Route path="shop" element={<ShopList />} />
      <Route path="shop/new" element={<ShopForm />} />
      <Route path="shop/:no/edit" element={<ShopForm />} />
      <Route path="cctv" element={<CctvList />} />
      <Route path="cctvissue" element={<CctvIssueList />} />
      <Route path="cctvvisitor" element={<CctvVisitorList />} />
      <Route path="calendar" element={<ShopCalendar />} />

      
      <Route path="mypage" element={<MyPage />} />
      <Route path="mypage/change-password" element={<ChangePassword />} />
      <Route path="invite" element={<InviteMain />} />

      <Route path="notification" element={<Notification />} />

      {/* [추가] 매장 통계 대시보드 - DashboardLayout(시뮬레이션 토글/목업 이벤트) 밖에 둠 */}
      <Route path="dashboard" element={<Dashboard />} />

      {/* 매장 고객 설문 (점주용 조회/생성). 손님 응답 화면은 App.tsx의 /s/:qrid */}
      <Route path="shopsurvey" element={<ShopSurveyList />} />
      <Route path="shopsurvey/new" element={<ShopSurveyEdit />} />
      <Route path="shopsurvey/:svno" element={<ShopSurveyDetail />} />
      <Route path="shopsurvey/:svno/edit" element={<ShopSurveyEdit />} />

      <Route path="survey" element={<SurveyUserList />} />
      <Route path="survey/:no" element={<SurveyAnswerForm />} />
      <Route path="survey/:no/response" element={<SurveyMyResponse />} />

      <Route path="shopmap" element={<ShopMapUserList />} />


    </Routes>
  );
}