import { Link, Navigate, Route, Routes } from 'react-router-dom';

/* 예시용 입니다. */
import DashboardLayout from '../components/layout/DashboardLayout';
import Test1 from '../pages/user/dashboard/Test1';
import Test2 from '../pages/user/dashboard/Test2';
import Test3 from '../pages/user/dashboard/Test3';
import Test4 from '../pages/user/dashboard/Test4';
import Test5 from '../pages/user/dashboard/Test5';
import Form from '../pages/user/form/Form';
import List from '../pages/user/form/List';
import SendForm from '../pages/user/send/Form';
import SendList from '../pages/user/send/List';


import QaList from '../pages/user/qa/QaList';
import QaForm from '../pages/user/qa/QaForm';
import QaDetail from '../pages/user/qa/QaDetail';


import ShopList from '../pages/user/shop/ShopList';
import ShopForm from '../pages/user/shop/ShopForm';
import ShopCalendar from '../pages/user/shop/ShopCalendar';
import CctvIssueList from '../pages/user/cctv/CctvIssueList';
import CctvList from '../pages/user/cctv/CctvList';
import CctvVisitorList from '../pages/user/cctv/CctvVisitorList';

import SurveyUserList from '../pages/user/survey/SurveyUserList';
import SurveyAnswerForm from '../pages/user/survey/SurveyAnswerForm';


export default function UserRoutes() {
  return (
    <Routes>
      {/* 참고해서 추가하시면 됩니다 / 페이지 추가 */}
      <Route index element={<Navigate to="shop" replace />} />
      {/* 
      <Route path="notice" element={<NoticeList />} />
      <Route path="notice/new" element={<NoticeForm />} />
      <Route path="notice/:no/edit" element={<NoticeForm />} />
      */}
      <Route path="qa" element={<QaList />} />
      <Route path="qa/new" element={<QaForm />} />
      <Route path="qa/:no/edit" element={<QaForm />} />
      <Route path="qa/:no" element={<QaDetail />} />

      <Route path="shop" element={<ShopList />} />
      <Route path="shop/new" element={<ShopForm />} />
      <Route path="shop/:no/edit" element={<ShopForm />} />
      <Route path="cctv" element={<CctvList />} />
      <Route path="cctvissue" element={<CctvIssueList />} />
      <Route path="cctvvisitor" element={<CctvVisitorList />} />
      <Route path="calendar" element={<ShopCalendar />} />



      {/* 예시용 */}
      <Route element={<DashboardLayout />}>{/* 대시보드용 레이아웃 적용 */}
        <Route path="dashboard/test1" element={<Test1 />} />
        <Route path="dashboard/test2" element={<Test2 />} />
        <Route path="dashboard/test3" element={<Test3 />} />
        <Route path="dashboard/test4" element={<Test4 />} />
        <Route path="dashboard/test5" element={<Test5 />} />
      </Route>

      <Route path="form" element={<Form />} />
      <Route path="list" element={<List />} />
      <Route path="send/form" element={<SendForm />} />
      <Route path="send/list" element={<SendList />} />
      <Route path="survey" element={<SurveyUserList />} />
      <Route path="survey/:no" element={<SurveyAnswerForm />} />


    </Routes>
  );
}