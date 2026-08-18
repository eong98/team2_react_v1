export type QuestionType = 'TEXT' | 'SINGLE' | 'MULTIPLE' | 'SCORE';
export type SurveyStatus = 'READY' | 'ACTIVE' | 'END';

export interface SurveyQuestionForm {
  no?: number;
  surveyNo?: number;
  qtext: string;
  qtype: QuestionType;
  qoptions: string[];
  requiredYn: 'Y' | 'N';
  seqNo: number;
}

export interface SurveyQuestion {
  no: number;
  surveyNo: number;
  qtext: string;
  qtype: QuestionType;
  qoptions: string | null;
  requiredYn: 'Y' | 'N';
  seqNo: number;
}

export interface Survey {
  no: number;
  memberNo: number;
  title: string;
  detail: string | null;
  startDate: string;
  endDate: string;
  cdate?: string;
  questions: SurveyQuestion[];
}

export interface SurveyInfo {
  no: number;
  title: string;
  detail: string | null;
  startDate: string;
  endDate: string;
}

/** 문항별 실제 답변 */
export interface SurveyAnswer {
  no: number;
  responseNo: number;
  questionNo: number;
  qtext: string;
  qtype: QuestionType;
  atext: string | null;
  cdate: string;
}

/** 회원 한 명의 설문 제출 결과 */
export interface SurveyResponse {
  no: number;
  surveyNo: number;
  memberNo: number;
  checkYn: 'Y' | 'N';
  checkDate: string | null;
  cdate: string;
  answers: SurveyAnswer[];
}

/** 설문 전체 AI 분석 결과 */
export interface SurveyAnalysis {
  no?: number;
  surveyNo: number;
  aiScore: number;
  positiveRate: number;
  neutralRate: number;
  negativeRate: number;
  summary: string;
  positiveSummary: string;
  negativeSummary: string;
  cdate?: string;
}

export type AnswerValue = string | string[];
export type AnswerState = Record<number, AnswerValue>;

export interface SurveySaveRequest {
  memberNo: number;
  title: string;
  detail: string;
  startDate: string;
  endDate: string;
  questions: Array<{
    qtext: string;
    qtype: QuestionType;
    qoptions: string | null;
    requiredYn: 'Y' | 'N';
    seqNo: number;
  }>;
}

export interface SurveySubmitRequest {
  memberNo: number;
  answers: Array<{
    questionNo: number;
    atext: string;
  }>;
}

export const SURVEY_LIST_PAGE_SIZE = 3;
export const SURVEY_RESPONSE_PAGE_SIZE = 10;
export const TEST_MEMBER_NO = 1;

export const createEmptyQuestion = (seqNo: number): SurveyQuestionForm => ({
  qtext: '',
  qtype: 'TEXT',
  qoptions: [],
  requiredYn: 'Y',
  seqNo,
});

export const toInputDate = (value?: string | null) => (value ? value.slice(0, 10) : '');
export const toServerStartDate = (value: string) => (value ? `${value} 00:00:00` : '');
export const toServerEndDate = (value: string) => (value ? `${value} 23:59:59` : '');

export const parseQuestionType = (value: string): QuestionType => {
  if (value === 'SINGLE') return 'SINGLE';
  if (value === 'MULTIPLE') return 'MULTIPLE';
  if (value === 'SCORE') return 'SCORE';
  return 'TEXT';
};

export const formatDate = (value?: string | null) => (value ? value.slice(0, 10) : '-');
export const formatDateTime = (value?: string | null) => (value ? value.slice(0, 16) : '-');

export const getOptions = (qoptions: string | null): string[] => {
  if (!qoptions) return [];
  return qoptions.split('|').map((option) => option.trim()).filter(Boolean);
};

const toDate = (value: string) => new Date(value.replace(' ', 'T'));

export const getSurveyStatus = (survey: Pick<Survey, 'startDate' | 'endDate'>): SurveyStatus => {
  const now = new Date();
  const start = toDate(survey.startDate);
  const end = toDate(survey.endDate);

  if (now < start) return 'READY';
  if (now > end) return 'END';
  return 'ACTIVE';
};

export const getStatusLabel = (status: SurveyStatus) => {
  if (status === 'READY') return '예정';
  if (status === 'ACTIVE') return '진행중';
  return '종료';
};

export const getStatusClass = (status: SurveyStatus) => {
  if (status === 'ACTIVE') return 'badge badge_success';
  if (status === 'READY') return 'badge badge_info';
  return 'badge';
};

export const getQuestionTypeLabel = (qtype: QuestionType | string) => {
  if (qtype === 'SCORE') return '만족도';
  if (qtype === 'SINGLE') return '단일 선택';
  if (qtype === 'MULTIPLE') return '복수 선택';
  return '주관식';
};

export const getSatisfactionLabel = (value?: string | null) => {
  if (value === '1') return '매우 불만족';
  if (value === '2') return '불만족';
  if (value === '3') return '보통';
  if (value === '4') return '만족';
  if (value === '5') return '매우 만족';
  return value ?? '-';
};

export const getAnswerText = (answer: SurveyAnswer) =>
  answer.qtype === 'SCORE' ? getSatisfactionLabel(answer.atext) : (answer.atext ?? '-');