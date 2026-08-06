import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
// import MobileTabbar from './MobileTabbar';
import ChatWidget from './ChatWidget';
import NoticeList from './board/NoticeList';
import NoticeForm from './board/NoticeForm';
import ShopList from './shop/ShopList';
import ShopForm from './shop/ShopForm';
import InMenuList from './menu/InMenuList';
import InMenuForm from './menu/InMenuForm';


function Shell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && <div className="sidebar_backdrop open" onClick={() => setNavOpen(false)} />}
      
      <main className="main">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <div className="views">
          <Outlet />
        </div>
      </main>

      {/* <MobileTabbar /> */}
      <ChatWidget />
    </div>
  );
}

export default function BoardLayout() {
  return (
    <Routes>
      <Route element={<Shell />}>
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
      </Route>
    </Routes>
  );
}
