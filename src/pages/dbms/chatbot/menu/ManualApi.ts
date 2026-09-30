import axios from 'axios';

/**
 * H200 FastAPI 주소.
 * 설문 AI 분석 실행은 Spring이 아니라 FastAPI가 직접 담당한다.
 */
// export const FASTAPI_BASE_URL = 'http://139.150.91.194:11200';
export const FASTAPI_BASE_URL = 'http://localhost:11200';


/* ---------------------------------------------------------------------
   옵션형 메뉴 자동생성 (Spring을 거치지 않고 FastAPI를 직접 호출)
--------------------------------------------------------------------- */

export interface ManualDocResult {
  no: number;
  filename: string;
  cdate: string;
  vectorized: boolean;
}

/** md 문서 업로드. 같은 파일명이 이미 있으면 서버가 자동으로 덮어씀. */
export const uploadManualDoc = async (file: File): Promise<ManualDocResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post<ManualDocResult>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/** 업로드된 문서를 새 파일로 교체 (같은 NO 유지). */
export const updateManualDoc = async (docNo: number, file: File): Promise<ManualDocResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.put<ManualDocResult>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/${docNo}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export interface ManualDocSummary {
  no: number;
  filename: string;
  uploadPath: string;
  cdate: string;
  updateYn: 'Y' | 'N';
}

/** 업로드되어 있는 문서 전체 목록 조회. */
export const getManualDocs = async (): Promise<ManualDocSummary[]> => {
  const response = await axios.get<ManualDocSummary[]>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/list`);
  return response.data;
};

/** 문서 삭제. 이 문서로 생성된 AI 옵션메뉴도 함께 삭제됨. */
export const deleteManualDoc = async (docNo: number): Promise<void> => {
  await axios.delete(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/${docNo}`);
};

export interface BulkDeleteResult {
  deleted: number[];
  failed: { no: number; error: string }[];
}

/** 문서 일괄 삭제. */
export const deleteManualDocs = async (docNos: number[]): Promise<BulkDeleteResult> => {
  const response = await axios.post<BulkDeleteResult>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/delete-bulk`, {
    nos: docNos,
  });
  return response.data;
};

/** [AI 옵션생성] 버튼 활성화 여부 조회. */
export const isGenerateAvailable = async (): Promise<boolean> => {
  const response = await axios.get<{ available: boolean }>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/generate-available`);
  return response.data.available;
};

export interface GeneratedMenuLeaf {
  no: number;
  label: string;
  answer: string;
}

export interface GeneratedMenuMid {
  no: number;
  label: string;
  answer: string | null;
  leaves: GeneratedMenuLeaf[];
  /** 이 하위메뉴를 만든 매뉴얼 파일명 */
  filename?: string;
}

export interface GeneratedMenuTop {
  no: number;
  label: string;
  answer: string;
  /** 이번 생성에서 이 카테고리에 추가된 하위메뉴만 */
  children: GeneratedMenuMid[];
}

export interface GenerateMenuResult {
  categories: GeneratedMenuTop[];
  vectorizeFailedDocs: { no: number; filename: string }[];
  /** 주제를 하나도 만들지 못한 문서(기존 메뉴 유지, 다음 생성 때 재시도) */
  skippedDocs?: string[];
  /** 최상위 6개 · 하위 5개 제한으로 자리가 없어 제외된 섹션 */
  droppedSections?: string[];
}

/** 신규/수정 문서로 옵션형 메뉴 트리를 자동 생성 (USEYN='N' 비공개로 저장). 진행률 없음. */
export const generateMenu = async (): Promise<GenerateMenuResult> => {
  const response = await axios.post<GenerateMenuResult>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/generate-menu`);
  return response.data;
};

/** info: 오류가 아닌 안내 (예: 하위메뉴 5개 제한으로 제외된 섹션) */
export type GenerateLogState = 'running' | 'done' | 'failed' | 'info';

export interface GenerateLog {
  key: string;
  message: string;
  state: GenerateLogState;
}

/** 서버 백그라운드 작업 상태 — 새로고침해도 이 값으로 진행 화면을 복원한다. */
export interface GenerateJobStatus {
  /** generate: AI 옵션생성 / suggest: 최상위 메뉴 추천 (같은 작업 틀, 동시에 하나만 실행) */
  kind?: 'generate' | 'suggest';
  status: 'idle' | 'running' | 'done' | 'error';
  percent?: number;
  logs?: GenerateLog[];
  elapsedSec?: number;
  /** kind='generate'면 GenerateMenuResult, 'suggest'면 SuggestCategoriesResult */
  result?: GenerateMenuResult | SuggestCategoriesResult | null;
  error?: string | null;
}

/** AI 옵션생성 시작 (백그라운드). 이미 진행 중이면 그 작업 상태를 그대로 반환. */
export const startGenerateMenu = async (): Promise<GenerateJobStatus> => {
  const response = await axios.post<GenerateJobStatus>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/generate-menu/start`);
  return response.data;
};

/** AI 옵션생성 진행 상태 조회 (진입 시 1회 + 진행 중 폴링). */
export const getGenerateMenuStatus = async (): Promise<GenerateJobStatus> => {
  const response = await axios.get<GenerateJobStatus>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/generate-menu/status`);
  return response.data;
};

/** 완료/실패한 작업 기록 지우기 (진행 패널 [닫기]). */
export const clearGenerateMenu = async (): Promise<void> => {
  await axios.post(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/generate-menu/clear`);
};

export interface RetryVectorizeResult {
  vectorizeFailedDocs: { no: number; filename: string }[];
}

/** CHAT_MENU 재생성 없이, 벡터화 실패한 문서만 다시 벡터화 시도. */
export const retryVectorize = async (): Promise<RetryVectorizeResult> => {
  const response = await axios.post<RetryVectorizeResult>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/retry-vectorize`);
  return response.data;
};

export interface CategorySuggestion {
  label: string;
  desc: string;
}

export interface SuggestCategoriesResult {
  /** 이미 등록된 관리자 최상위 메뉴 이름 */
  existing: string[];
  /** 최상위 메뉴 최대 개수 (6) — 추천은 매번 기존과 무관하게 이 개수까지 새로 만듦 */
  max: number;
  /** 매뉴얼 섹션 수 — 메뉴 하나에 5개까지 들어가므로 자리 계산에 사용 */
  totalSections: number;
  suggestions: CategorySuggestion[];
}

/**
 * [최상위 메뉴 AI 추천] 백그라운드 시작 — 저장하지 않고 후보만 만듦(로컬 CPU에서 1~2분).
 * 진행 상황/결과는 getGenerateMenuStatus()로 조회 (kind='suggest').
 */
export const startSuggestCategories = async (): Promise<GenerateJobStatus> => {
  const response = await axios.post<GenerateJobStatus>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/suggest-categories/start`);
  return response.data;
};

export interface ReplaceTopMenusResult {
  kept: string[];
  added: string[];
  removed: string[];
}

/**
 * 최상위 메뉴 전체를 선택한 목록으로 교체 — 같은 이름은 유지, 빠진 메뉴는 하위까지 삭제,
 * 매뉴얼 전체는 [AI 옵션생성] 대상으로 되돌림.
 */
export const replaceTopMenus = async (menus: { label: string; desc: string }[]): Promise<ReplaceTopMenusResult> => {
  const response = await axios.put<ReplaceTopMenusResult>(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/top-menus`, { menus });
  return response.data;
};

/** 최상위 메뉴 + 지정한 하위메뉴(STEP2)와 그 하위만 공개. */
export const publishMenuNodes = async (topNo: number, nos: number[]): Promise<void> => {
  await axios.put(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/publish-nodes`, { topNo, nos });
};

/** 최상위 메뉴(및 하위 전체)를 공개(USEYN='Y')로 전환. */
export const publishMenuTree = async (topNo: number): Promise<void> => {
  await axios.put(`${FASTAPI_BASE_URL}/api/chatbot/manual-doc/publish/${topNo}`);
};


