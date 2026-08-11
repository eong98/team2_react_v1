//===================================================
// 관리자 관련 store
//===================================================
import { create } from 'zustand';
import { axiosInstance, getIP } from '../utils/Tool';

export interface TotalMemberUser {
  no: number;         // 고유 일련번호
  id: string;         // 아이디
  mname: string;      // 이름 
  email: string;      // 이메일
  phone: string;      // 전화번호
  grade: number;      // 권한 등급
  status: string;     // 상태
  udate: string;      // 수정일
  cdate: string;      // 가입일/등록일
  
  role: 'USER' | 'ADMIN'; // 프론트 가공용 임시 플래그

  // 일반 회원 전용 고유 필드
  zipcode?: string;   // 우편번호
  addr?: string;      // 기본주소
  addrDetail?: string;// 상세주소
  nation?: string;    // 국가

  // 관리자 전용 필드는 현재 공통 필드 외에 별도 표기 없음
}

interface DbmsAdminState {
  memberList: TotalMemberUser[];
  isLoading: boolean;
  fetchMemberList: () => Promise<void>;
}

export const useDbmsStore = create<DbmsAdminState>((set) => ({
  memberList: [],
  isLoading: false,

  fetchMemberList: async () => {
    set({ isLoading: true });
    try {
      const [resUsers, resAdmins] = await Promise.all([
        axiosInstance.get(`http://${getIP()}:9102/v1/user/find`),  // 회원정보 조회 
        axiosInstance.get(`http://${getIP()}:9102/v1/dbms/find`),   // 관리자정보 조회
      ]);

      // 회원이면 role에 USER를, 관리자면 ADMIN을 부여
      const userConverted = resUsers.data.map((user: any) => ({ ...user, role: 'USER' as const }));
      const adminConverted = resAdmins.data.map((admin: any) => ({ ...admin, role: 'ADMIN' as const }));

      const combinedList = [...userConverted, ...adminConverted];

      // 등록일(cdate) 최신순 정렬
      combinedList.sort((a, b) => new Date(b.cdate).getTime() - new Date(a.cdate).getTime());

      // 최종 세팅
      set({ memberList: combinedList });
    } catch (error) {
      console.error("회원/관리자 데이터 조회 실패:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));