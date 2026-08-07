/* --------------- css import --------------- */
import '../style/dbms.css'
/* ------------------------------------------- */

import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../app/AppShell';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from './ChatWidget';
import NoticeList from './board/NoticeList';
import NoticeForm from './board/NoticeForm';
import ShopList from './shop/ShopList';
import ShopForm from './shop/ShopForm';
import InMenuList from './menu/InMenuList';
import InMenuForm from './menu/InMenuForm';
import SurveyForm from './survey/SurveyForm';
import SurveyList from './survey/SurveyList';
import SurveyResponseList from './survey/SurveyResponseList';


export default function BoardLayout() {
  return (
    <Routes>
      <Route element={<AppShell Sidebar={Sidebar} Topbar={Topbar} ChatWidget={ChatWidget} />}>
        <Route index element={<Navigate to="notice" replace />} />
        {/* 참고해서 추가하시면 됩니다 / 페이지 추가 */}
        <Route path="notice" element={<NoticeList />} />
        <Route path="notice/new" element={<NoticeForm />} />
        <Route path="notice/:no/edit" element={<NoticeForm />} />

        <Route path="shop" element={<ShopList />} />
        <Route path="shop/:no/edit" element={<ShopForm />} />

        <Route path="menu" element={<InMenuList />} />
        <Route path="menu/new" element={<InMenuForm />} />
        <Route path="menu/:no/edit" element={<InMenuForm />} />
        
        <Route path="survey" element={<SurveyList />}/>
        <Route path="survey/create" element={<SurveyForm />} />
        <Route path="survey/:no/edit" element={<SurveyForm />} />
        <Route path="survey/:no/responses" element={<SurveyResponseList />}/>
      </Route>
    </Routes>
  );
}
