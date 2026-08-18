export interface MyMemberInfo {
  no: number;
  id: string;
  mname: string;
  email: string;
  phone: string;
  zipcode: string;
  addr: string;
  addrDetail: string;
  nation: string;
  grade: number;
  status: string;
  cdate: string;
  udate: string | null;
}

export interface MyManagerInfo {
  no: number;
  id: string;
  mname: string;
  email: string;
  phone: string;
  grade: number;
  status: string;
  cdate: string;
  udate: string | null;
}

/** grade 1~5: 관리자, 6~10: 회원 (LoginStore.ts 주석 기준) */
export const isAdminGrade = (grade: number) => grade >= 1 && grade <= 5;