/* ---------------------------------------------------------------------
   FAQ AI 추천 타입/API
   백엔드 dev.jpa.allimio.qa.faq.QaFaqSuggestDTO(record)와 1:1로 맞춰져 있습니다.

   API (QaFaqSuggestCont) - 관리자(ROLE_MANAGER) 쿠키 로그인 필요
   POST /qa/faq/suggest?days=90 → FaqSuggestResult
   분석할 수 없으면 409 + { message }

   자주 들어오는 1:1 문의(관리자 답변이 달린 것)를 AI가 비슷한 것끼리 묶어
   FAQ 초안을 만들어 줍니다. 자동으로 등록하지 않고, 관리자가 추천 화면에서 내용을 확인·수정한 뒤
   직접 등록합니다. (화면: pages/dbms/qa/FaqSuggest.tsx)
--------------------------------------------------------------------- */
import { axiosInstance } from '../../utils/Tool';

export interface FaqSuggestSource {
  no: number;
  title: string;
}

export interface FaqCandidate {
  title: string; // 대표 질문 (FAQ 제목)
  content: string; // 질문 내용
  answer: string; // 정리된 답변
  type: number; // 문의 유형 — 근거가 된 문의들의 유형 중 가장 많은 것 (QA_TYPE_MAP)
  count: number; // 비슷한 문의 수
  sources: FaqSuggestSource[]; // 근거가 된 문의
  reason: string; // 추천 이유
}

export interface FaqSuggestResult {
  candidates: FaqCandidate[];
  analyzed: number; // 분석한 문의 수
  groups: number; // 비슷한 문의 묶음 수 (2건 이상)
  skipped: number; // 이미 FAQ에 있어서 제외한 묶음 수
  from: string;
  to: string;
}

/** 조회기간 선택지 */
export const FAQ_SUGGEST_PERIODS = [
  { days: 30, label: '최근 30일' },
  { days: 90, label: '최근 90일' },
  { days: 180, label: '최근 180일' },
  { days: 365, label: '최근 1년' },
] as const;

/** 추천 화면에서 고치는 초안 한 건 — 등록하거나 제외하면 목록에서 빠짐 */
export interface FaqDraftItem {
  id: number; // 화면에서 초안을 구분하는 번호 (추천 결과의 순서)
  type: number;
  title: string;
  content: string;
  answer: string;
  count: number;
  sources: FaqSuggestSource[];
  reason: string;
  checked: boolean; // 일괄 등록에 포함할지
}

/** 마지막 추천 결과와 남은 초안 보관 (sessionStorage) — 분석에 몇 분 걸려서, 다른 화면을 보고 와도 다시 돌리지 않게 */
const FAQ_SUGGEST_CACHE_KEY = 'faq_suggest_result';

export interface FaqSuggestCache {
  days: number;
  result: FaqSuggestResult;
  items: FaqDraftItem[]; // 아직 등록·제외하지 않은 초안
  registered: number; // 이 추천 결과에서 등록한 수
  at: string; // 분석한 시각 (화면 표시용)
}

export const saveFaqSuggestCache = (cache: FaqSuggestCache) => {
  try {
    sessionStorage.setItem(FAQ_SUGGEST_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 저장소를 못 쓰면 보관하지 않음
  }
};

export const clearFaqSuggestCache = () => {
  try {
    sessionStorage.removeItem(FAQ_SUGGEST_CACHE_KEY);
  } catch {
    // 저장소를 못 쓰면 지울 것도 없음
  }
};

export const loadFaqSuggestCache = (): FaqSuggestCache | null => {
  try {
    const raw = sessionStorage.getItem(FAQ_SUGGEST_CACHE_KEY);
    const cache = raw ? (JSON.parse(raw) as FaqSuggestCache) : null;
    return cache && Array.isArray(cache.result?.candidates) && Array.isArray(cache.items) && cache.items.every((it) => typeof it.id === 'number')
      ? cache
      : null;
  } catch {
    return null;
  }
};

/** 묶음마다 AI를 호출해서 몇 분 걸릴 수 있어 이 요청만 넉넉히 기다림 */
export const requestFaqSuggest = async (days: number): Promise<FaqSuggestResult> => {
  const res = await axiosInstance.post<FaqSuggestResult>('/qa/faq/suggest', null, {
    params: { days },
    timeout: 440_000,
  });
  return res.data;
};
