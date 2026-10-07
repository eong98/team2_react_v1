import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
//===================================================
// 로그인 관련 store
//===================================================

// 1. 기존 쿠키 저장소 정의
const cookieStorage = {
  getItem: (name: string) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    if (!match) return null
    try {
      return JSON.parse(decodeURIComponent(match[2]))
    } catch {
      return null
    }
  },
  setItem: (name: string, value: any) => {
    document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${60 * 60 * 24 * 30}`
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
  // 1~5 관리자, 6~10 사용자 10:점주, 6~9:직원
  grade: number;
  setGrade: (value: number) => void;
  mname: string;
  setMname: (value: string) => void;
  clearAuth:() => void;
}

export const GlobalStoreSession = create<SessionStore>()(
  persist(
    (set) => ({
      login: false,
      setLogin: (value) => set({ login: value }),
      // no가 0이면 손님
      no: 0,
      setNo: (value) => set({ no: value }),
      id: '',
      setId: (value) => set({ id: value }), 
      // 1: 최상위 관리자, 2~5: 일반 관리자, 6~10 사용자, 10:점주 , 99: 손님
      grade: 99,  
      setGrade: (value) => set({ grade: value}),
      mname: '',
      setMname: (value) => set({ mname: value}),
      
      clearAuth: () =>
        set({
          login: false,
          no: 0,
          id: '',
          grade: 99,
          mname: '',
        })
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
  savedId: string;
  setSavedId: (value: string) => void;
  savedDbmsId: string;
  setSavedDbmsId: (value: string) => void; 
}

export const GlobalStoreCookie = create<CookieStore>()(
  persist(
    (set) => ({
      storeId: false,
      setStoreId: (value) => set({ storeId: value }),
      savedId: '',
      setSavedId: (value) => set({ savedId: value }),
      savedDbmsId: '',
      setSavedDbmsId: (value) => set({ savedDbmsId: value }),
    }),
    {
      name: 'settings-session-store',
      storage: createJSONStorage(() => cookieStorage), // ?? 쿠키 사용
    }
  )
);
