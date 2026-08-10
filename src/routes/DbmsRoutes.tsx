

import { Navigate, Route, Routes } from 'react-router-dom';
import NoticeList from '../pages/dbms/board/NoticeList';
import NoticeForm from '../pages/dbms/board/NoticeForm';
import ShopList from '../pages/dbms/shop/ShopList';
import ShopForm from '../pages/dbms/shop/ShopForm';
import InMenuList from '../pages/dbms/menu/InMenuList';
import InMenuForm from '../pages/dbms/menu/InMenuForm';
import ShopMenuList from '../pages/dbms/menu/ShopMenuList';
import ShopMenuForm from '../pages/dbms/menu/ShopMenuForm';
import SurveyForm from '../pages/dbms/survey/SurveyForm';
import SurveyList from '../pages/dbms/survey/SurveyList';
import SurveyResponseList from '../pages/dbms/survey/SurveyResponseList';

export default function DbmsRoutes() {
  return (
    <Routes>

      {/* 참고해서 추가하시면 됩니다 / 페이지 추가 */}
      <Route path="notice" element={<NoticeList />} />
      <Route path="notice/new" element={<NoticeForm />} />
      <Route path="notice/:no/edit" element={<NoticeForm />} />

      <Route path="inmenu" element={<InMenuList />} />
      <Route path="inmenu/new" element={<InMenuForm />} />
      <Route path="inmenu/:no/edit" element={<InMenuForm />} />

      <Route path="shopmenu" element={<ShopMenuList />} />
      <Route path="shopmenu/new" element={<SurveyForm />} />
      <Route path="shopmenu/:no/edit" element={<SurveyForm />} />      

      <Route path="shop" element={<ShopList />} />
      <Route path="shop/:no/edit" element={<ShopForm />} />
      
      <Route path="survey" element={<SurveyList />}/>
      <Route path="survey/create" element={<SurveyForm />} />
      <Route path="survey/:no/edit" element={<SurveyForm />} />
      <Route path="survey/:no/responses" element={<SurveyResponseList />}/>
    </Routes>
  );
}
