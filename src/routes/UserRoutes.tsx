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


export default function UserRoutes() {
  return (
    <Routes>
      {/* 참고해서 추가하시면 됩니다 / 페이지 추가 */}
      {/* 
      <Route path="notice" element={<NoticeList />} />
      <Route path="notice/new" element={<NoticeForm />} />
      <Route path="notice/:no/edit" element={<NoticeForm />} />
      */}

      
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
    </Routes>
  );
}