/* ---------------------------------------------------------------------
   /dbms/qamail(문의 메일 발송 내역) 타입/API
   백엔드 dev.jpa.allimio.qa.mail.QaMailDTO(record)와 1:1로 맞춰져 있습니다.

   API (QaMailCont, /qa/mail) - 관리자(ROLE_MANAGER) 쿠키 로그인 필요
   GET  /qa/mail/logs?word=&stype=&result=&page=0&size=10  → QaMailLogPage

   메일 종류 STYPE : 1 답변 등록 알림 / 2 비밀번호 재설정 인증번호
   발송 결과 RESULT: Y 성공 / N 실패
--------------------------------------------------------------------- */
import { axiosInstance } from '../../utils/Tool';

export interface QaMailLog {
  no: number;
  qno: number; // 문의글 번호
  qaTitle: string | null; // 문의 제목 — 삭제된 글이면 null
  qaDeleted: boolean; // 문의글이 삭제됐는지 (소프트 삭제·영구 삭제)
  mno: number | null; // 받는 회원 번호 (비회원이면 null)
  memberName: string | null;
  email: string;
  stype: number;
  title: string; // 메일 제목
  content: string | null; // 메일 본문 (인증번호 메일은 저장하지 않음)
  result: 'Y' | 'N';
  msg: string | null; // 실패 사유
  cdate: string;
}

export interface QaMailLogPage {
  content: QaMailLog[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터
  size: number;
}

export interface QaMailLogQuery {
  word?: string;
  stype?: string; // '' | '1' | '2'
  result?: string; // '' | 'Y' | 'N'
  page: number; // 0부터
  size: number;
}

export const QA_MAIL_TYPE_LABEL: Record<number, string> = {
  1: '답변 알림',
  2: '비밀번호 재설정 인증',
};

export const getQaMailLogs = async (query: QaMailLogQuery): Promise<QaMailLogPage> => {
  const res = await axiosInstance.get<QaMailLogPage>('/qa/mail/logs', {
    params: {
      word: query.word || undefined,
      stype: query.stype || undefined,
      result: query.result || undefined,
      page: query.page,
      size: query.size,
    },
  });
  return res.data;
};

