/* --------------- css import --------------- */
import './boardlayout.css'
/* ------------------------------------------- */

import { NavLink, Outlet } from 'react-router-dom';

/* ---------------------------------------------------------------------
   고객센터 레이아웃 (/board/*) — 비회원도 접근 가능한 고객센터 영역입니다.
   좌측 LNB(자주묻는 질문/공지사항/1:1 문의)와 우측 컨텐츠(Outlet)로 구성됩니다.
   기본 진입(/board)은 자주묻는 질문(FAQ) 화면으로 리다이렉트됩니다.
--------------------------------------------------------------------- */

const BOARD_MENUS = [
  { to: 'faq', label: '자주묻는 질문' },
  { to: 'notice', label: '공지사항' },
  { to: 'qa', label: '문의사항' },
];

export default function BoardLayout() {
  return (
    <div className="board_layout">
      <aside className="board_lnb">
        <h2 className="board_lnb_title">고객센터</h2>
        <nav>
          <ul>
            {BOARD_MENUS.map((menu) => (
              <li key={menu.to}>
                <NavLink to={menu.to} className={({ isActive }) => `board_lnb_link${isActive ? ' active' : ''}`}>
                  {menu.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="board_content">
        <Outlet />
      </div>
    </div>
  );
}