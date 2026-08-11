import { useLocation, useNavigate } from 'react-router-dom';
import { useClock } from '../../../hooks/useClock';
import { GlobalCurrentShop } from '../../../store/UserStore';

interface TopbarProps {
  onMenuClick: () => void;
}

/* ---------------------------------------------------------------------
   BaseLayout이 /user·/dbms 양쪽에 공통으로 넘겨서 쓰는 상단바.

   ※ 2026-08-11 수정: 매장 스위처/LIVE/시계가 붙은 상단바는 원래
     pathname.includes('/dashboard')일 때만(=/user/dashboard/* 안에서만)
     보였고 매장명도 "본점 · 스터디카페 A"로 하드코딩돼 있었음.
     → /user 하위 모든 페이지에서 보이도록 조건을 startsWith('/user')로
       바꾸고, 매장명/번호는 GlobalCurrentShop(store/UserStore.ts)에서
       읽어오도록 변경. 매장은 /user/shop 목록에서 "입장하기"를 누를 때
       GlobalCurrentShop().setShop()으로 채워짐(ShopList.tsx 참고).
     /dbms/*는 그대로 아래 모바일형 헤더로 빠짐(기존과 동일).
--------------------------------------------------------------------- */
export default function Topbar({ onMenuClick }: TopbarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isUserArea = pathname.startsWith('/user');
  const clock = useClock();
  const { no: shopNo, title: shopTitle } = GlobalCurrentShop();

  if (isUserArea) {
    return (
      <header className="topbar">
        <div className="topbar_left">
          <button className="menu_btn" onClick={onMenuClick} aria-label="전체 메뉴 열기">
            ☰
          </button>
          <button
            type="button"
            className="store_switch"
            id="storeSwitchBtn"
            onClick={() => navigate('/user/shop')}
            style={{ color: 'inherit', cursor: 'pointer' }}
          >
            <span className="st_dot" />
            <span id="currentStoreName">{shopNo ? shopTitle : '매장을 선택해주세요'}</span> ▾
          </button>
        </div>
        <div className="topbar_right">
          {shopNo && <span className="live_pill">LIVE</span>}
          <span className="clock mono" id="clock">
            {clock}
          </span>
        </div>
      </header>
    );
  }

  return (
    <header className="topbar_mobile">
      <button className="menu_btn" onClick={onMenuClick} aria-label="전체 메뉴 열기">
        ☰
      </button>
      <div className="brand">
        <span className="logo_placeholder" aria-hidden="true" />
        allimio
      </div>
    </header>
  );
}
