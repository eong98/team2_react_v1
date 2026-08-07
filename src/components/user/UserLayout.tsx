import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../app/AppShell';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from './ChatWidget';

import NoticeList from './board/NoticeList';
import NoticeForm from './board/NoticeForm';

import Live from './dashboard/Live';

export default function BoardLayout() {
  return (
    <Routes>
      <Route element={<AppShell Sidebar={Sidebar} Topbar={Topbar} ChatWidget={ChatWidget} />}>
        <Route index element={<Navigate to="live" replace />} />{/* 제일먼저 보여줄 화면 */}
        
        {/* 참고해서 추가하시면 됩니다 / 페이지 추가 */}
        <Route path="notice" element={<NoticeList />} />
        <Route path="notice/new" element={<NoticeForm />} />
        <Route path="notice/:no/edit" element={<NoticeForm />} />


        <Route path="live" element={<Live />} />
      </Route>
    </Routes>
  );
}
