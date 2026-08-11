//===================================================
// 유저 관련 store
//===================================================
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/* ---------------------------------------------------------------------
   현재 선택(입장)한 매장 정보를 전역으로 들고 있는 store.

   - /user/shop 목록에서 "입장하기"를 누르면 setShop()으로 채워짐(ShopList.tsx).
   - Topbar(공용 상단바, BaseLayout이 /user·/dbms 양쪽에 넘겨서 씀)가 여기서
     매장명(no/title)을 읽어서 /user 하위 모든 페이지에 공통으로 보여줌.
     예전에는 pathname.includes('/dashboard')일 때만 보였고, 이름도
     "본점 · 스터디카페 A"로 하드코딩되어 있었음 → 이제 실제 선택한 매장을 반영.
   - CCTV 관제/이슈 등 매장(no)에 종속된 다른 화면도 이 store에서
     GlobalCurrentShop().no 를 읽어 API 호출(cno/mno 필터 등)에 그대로 쓰면 됨.
   - 새로고침해도 유지되도록 sessionStorage에 저장 (LoginStore.GlobalStoreSession과 동일 방식).
     로그아웃/매장 전환 시에는 clearShop()으로 초기화.
--------------------------------------------------------------------- */
interface CurrentShopState {
  no: number | null;
  title: string;
  setShop: (shop: { no: number; title: string }) => void;
  clearShop: () => void;
}

export const GlobalCurrentShop = create<CurrentShopState>()(
  persist(
    (set) => ({
      no: null,
      title: '',
      setShop: ({ no, title }) => set({ no, title }),
      clearShop: () => set({ no: null, title: '' }),
    }),
    {
      name: 'current-shop-store',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
