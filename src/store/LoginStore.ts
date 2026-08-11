import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
//===================================================
// 로그인 관련 store
//===================================================

// 1. 기존 쿠키 저장소 정의
const cookieStorage = {
  getItem: (name: string) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? JSON.parse(match[2]) : null
  },
  setItem: (name: string, value: any) => {
    document.cookie = `${name}=${JSON.stringify(value)}; path=/; max-age=30` // 30초 후 만료
  },
  removeItem: (name: string) => {
    document.cookie = `${name}=; Max-Age=0; path=/`
  },
}

// ==========================================
// Session
// ==========================================
interface SessionStore {
  login: boolean;
  setLogin: (value: boolean) => void;
  no: number;
  setNo: (value: number) => void;
  id: string;
  setId: (value: string) => void;
  // 1~5 관리자, 5~10 사용자
  grade: number;
  setGrade: (value: number) => void;
}

export const GlobalStoreSession = create<SessionStore>()(
  persist(
    (set) => ({
      login: false,
      setLogin: (value) => set({ login: value }),
      no: 99,
      setNo: (value) => set({ no: value }),
      id: '',
      setId: (value) => set({ id: value }),
      // 1~5 관리자, 6~10 사용자
      grade: 99,  
      setGrade: (value) => set({ grade: value})
    }),
    {
      name: 'auth-cookie-store',
      storage: createJSONStorage(() => sessionStorage), // 세션 스토리지 사용
    }
  )
);

// ==========================================
// Cookie
// ==========================================
interface CookieStore {
  storeId: boolean;
  setStoreId: (value: boolean) => void; 
}

export const GlobalStoreCookie = create<CookieStore>()(
  persist(
    (set) => ({
      storeId: false,
      setStoreId: (value) => set({ storeId: value }),
    }),
    {
      name: 'settings-session-store',
      storage: createJSONStorage(() => cookieStorage), // ?? 쿠키 사용
    }
  )
);
