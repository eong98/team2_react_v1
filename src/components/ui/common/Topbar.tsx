import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useClock } from '../../../hooks/useClock';
import { GlobalCurrentShop } from '../../../store/UserStore';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { axiosInstance } from '../../../utils/Tool.ts';
import type { ShopType, ShopSearchResult } from '../../ts/ShopUser.ts';

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

   ※ 2026-08-13 수정: 매장 스위처를 누르면 /user/shop으로 이동시키는 대신,
     로그인한 회원(mno, GlobalStoreSession)의 매장 목록을 바로 슬라이드
     드롭다운으로 펼쳐서 보여줍니다. 목록에서 매장을 클릭하면 그 자리에서
     GlobalCurrentShop().setShop()으로 전환되고(페이지 이동 없음), CCTV
     목록/이슈 등 shopNo를 구독하는 화면들은 자동으로 새 매장 기준으로
     다시 불러옵니다. 매장이 많아 전체 목록/검색/생성이 필요하면 드롭다운
     하단의 "매장 전체 관리" 링크로 /user/shop 목록 화면으로 이동합니다.

   API (ShopCont, /shop)
   GET /shop/search?mno=&keyword=&page=&size=
     → { content, totalElements, totalPages, page(0부터), size }
     (드롭다운에서는 keyword 없이 size를 넉넉히(50) 줘서 로그인 회원의
     매장을 사실상 전부 한 번에 불러옵니다. 매장이 50개를 넘는 경우는
     "매장 전체 관리" 링크의 검색/페이징 화면을 쓰면 됩니다.)
--------------------------------------------------------------------- */
export default function Topbar({ onMenuClick }: TopbarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isUserArea = pathname.startsWith('/user');
  const clock = useClock();
  const { no: shopNo, title: shopTitle, setShop } = GlobalCurrentShop();
  const { no: mno } = GlobalStoreSession();

  const [open, setOpen] = useState(false);
  const [shops, setShops] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 드롭다운 열릴 때마다 최신 매장 목록을 다시 불러옵니다(방금 생성한 매장도 바로 보이도록).
  useEffect(() => {
    if (!open || !mno) return;

    setLoading(true);
    axiosInstance
      .get<ShopSearchResult>('/shop/search', {
        params: { mno, page: 0, size: 50 },
      })
      .then((res) => setShops(res.data.content ?? []))
      .catch((err) => {
        console.error('매장 목록 조회 실패:', err);
        setShops([]);
      })
      .finally(() => setLoading(false));
  }, [open, mno]);

  // 바깥 클릭 / ESC로 닫기
  useEffect(() => {
    if (!open) return;

    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectShop = (shop: ShopType) => {
    if (!shop.no) return;
    setShop({ no: shop.no, title: shop.title ?? '' });
    setOpen(false);
  };

  const goManageShops = () => {
    setOpen(false);
    navigate('/user/shop');
  };

  if (isUserArea) {
    return (
      <header className="topbar">
        <div className="topbar_left">
          <button className="menu_btn" onClick={onMenuClick} aria-label="전체 메뉴 열기">
            ☰
          </button>

          <div className="store_switch_wrap" ref={wrapRef}>
            <button
              type="button"
              className="store_switch"
              id="storeSwitchBtn"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={open}
              style={{ color: 'inherit', cursor: 'pointer' }}
            >
              <span className="st_dot" />
              <span id="currentStoreName">{shopNo ? shopTitle : '매장을 선택해주세요'}</span>
              <span className={`store_switch_chev${open ? ' open' : ''}`}>▾</span>
            </button>

            <div className={`store_dropdown${open ? ' open' : ''}`} role="listbox" aria-label="매장 목록">
              {loading ? (
                <div className="store_dropdown_empty">불러오는 중...</div>
              ) : shops.length === 0 ? (
                <div className="store_dropdown_empty">등록된 매장이 없습니다.</div>
              ) : (
                <ul className="store_dropdown_list">
                  {shops.map((s) => (
                    <li key={s.no}>
                      <button
                        type="button"
                        className={`store_dropdown_item${s.no === shopNo ? ' active' : ''}`}
                        role="option"
                        aria-selected={s.no === shopNo}
                        onClick={() => selectShop(s)}
                      >
                        <span className="sd_name">{s.title}</span>
                        <span className="sd_addr">
                          {s.address}
                          {s.address2 ? ` ${s.address2}` : ''}
                        </span>
                        {s.no === shopNo && <span className="sd_check">✓</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="store_dropdown_foot">
                <button type="button" className="btn btn_sm btn_ghost" onClick={goManageShops}>
                  매장 전체 관리
                </button>
              </div>
            </div>
          </div>
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
    </header>
  );
}