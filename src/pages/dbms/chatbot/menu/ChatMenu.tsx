import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { axiosInstance, set_focus } from '../../../../utils/Tool';
import { AlertModal, ConfirmDeleteModal, Modal, PageHeader } from '../../../../components/ui';
import { useTab } from '../../../../hooks/useTab';
import type { ChatMenuRequest, ChatMenuTypes } from '../../../../components/ts/ChatMenu';
import {
  uploadManualDoc,
  updateManualDoc,
  getManualDocs,
  deleteManualDoc,
  deleteManualDocs,
  isGenerateAvailable,
  startGenerateMenu,
  regenerateAllMenus,
  getGenerateMenuStatus,
  clearGenerateMenu,
  retryVectorize,
  publishMenuNodes,
  startSuggestCategories,
  replaceTopMenus,
  type SuggestCategoriesResult,
  type ManualDocSummary,
  type GenerateMenuResult,
  type GenerateJobStatus,
  type GenerateLog,
  type GeneratedMenuTop,
} from './ManualApi';
import ChatBotPreview, { type ChatBotPreviewHandle } from './ChatBotPreview';
import { backoffDelay, checkAiServer, isNetworkError } from '../../../../components/ui/chatbot/aiServer';

/* ---------------------------------------------------------------------
   챗봇 옵션 메뉴 관리 (/dbms/chat_menu) — 트리 구조 CRUD + 옵션형 메뉴 자동생성.
   전체 트리를 한 번에 불러와서(GET /chat_menu/tree/admin), 프론트에서
   STEP1 → STEP2 → STEP3 계층으로 재구성해 보여줍니다.

   Spring API
   GET    /chat_menu/tree/admin        → 전체 메뉴 (페이징 없음)
   POST   /chat_menu                   → 등록
   PUT    /chat_menu/{no}              → 수정
   PUT    /chat_menu/{no}/useyn        → 공개/비공개 토글
   DELETE /chat_menu/{no}              → 삭제 (하위 선택지까지 일괄 삭제)

   FastAPI (Spring 안 거치고 직접 호출, ChatApi.ts)
   POST   /api/chatbot/manual-doc                    → 문서 업로드
   PUT    /api/chatbot/manual-doc/{no}                → 문서 교체
   GET    /api/chatbot/manual-doc/list                → 문서 목록
   DELETE /api/chatbot/manual-doc/{no}                → 문서 삭제 (그 문서로 만든 AI메뉴도 삭제)
   POST   /api/chatbot/manual-doc/delete-bulk         → 문서 일괄 삭제
   GET    /api/chatbot/manual-doc/generate-available  → AI생성 버튼 활성화 여부
   POST   /api/chatbot/manual-doc/generate-menu/start  → AI 옵션생성 백그라운드 시작(신규/수정 문서만 대상)
   GET    /api/chatbot/manual-doc/generate-menu/status → 진행 상태(새로고침 후 복원 + 진행 중 폴링)
   POST   /api/chatbot/manual-doc/generate-menu/clear  → 완료 기록 지우기
   POST   /api/chatbot/manual-doc/retry-vectorize     → 벡터화만 재시도
   PUT    /api/chatbot/manual-doc/publish/{topNo}     → 공개 전환
--------------------------------------------------------------------- */

interface TreeNode extends ChatMenuTypes {
  children: TreeNode[];
}

/* 에러타입 정의 */
type FormErrors = Partial<Record<keyof ChatMenuRequest, string>>;

const EMPTY_FORM: ChatMenuRequest = {
  pno: null,
  step: 1,
  label: '',
  answer: '',
  vseq: 0,
  useyn: 'Y',
};

/** 최상위(STEP1) 메뉴 최대 개수 — Spring ChatMenuService.MAX_TOP_MENUS, FastAPI MAX_CATEGORIES와 같은 값 */
const MAX_TOP_MENUS = 6;

/** 화면 탭 — 메뉴 구성(직접 관리) / AI 추천(매뉴얼 첨부·추천·결과 검토) */
type ChatMenuTabKey = 'menu' | 'ai';

/** CHAT_MENU.LABEL은 VARCHAR2(100) BYTE — 한글 1자 = 3바이트라 약 33자까지 */
const LABEL_MAX_BYTES = 100;
const encoder = new TextEncoder();
const byteLength = (text: string): number => encoder.encode(text).length;
/** 입력값이 100바이트를 넘으면 넘치는 글자를 잘라냄(글자 중간에서 깨지지 않게 한 글자씩) */
const cutToBytes = (text: string, max = LABEL_MAX_BYTES): string => {
  if (byteLength(text) <= max) return text;
  let out = '';
  for (const ch of text) {
    if (byteLength(out + ch) > max) break;
    out += ch;
  }
  return out;
};

/** 라벨 입력칸 아래 글자수 표시 — "12자 · 36 / 100 byte" */
function LabelCounter({ value }: { value: string }) {
  const bytes = byteLength(value);
  return (
    <div className={`form_hint chatmenu_label_counter${bytes >= LABEL_MAX_BYTES ? ' is_full' : ''}`}>
      {[...value].length}자 · {bytes} / {LABEL_MAX_BYTES} byte
    </div>
  );
}

/**
 * API 오류 응답에서 사람이 읽을 메시지만 꺼냄.
 * FastAPI는 detail이 문자열이거나(HTTPException) 검증오류 배열([{msg,...}])이고, Spring은 { message }.
 */
const errorMessage = (err: unknown): string => {
  const data = (err as { response?: { data?: { detail?: unknown; message?: string } } })?.response?.data;
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : String(d))).join(', ');
  }
  return data?.message ?? '';
};

/** 경과시간 표시 — 1분 미만 "12초", 1시간 미만 "3분 5초", 그 이상 "1시간 2분 3초" */
const formatElapsed = (totalSec: number): string => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) return `${h}시간 ${m}분 ${sec}초`;
  if (m > 0) return `${m}분 ${sec}초`;
  return `${sec}초`;
};

export default function ChatMenu() {
  const [flatList, setFlatList] = useState<ChatMenuTypes[]>([]);
  const [loading, setLoading] = useState(true);

  // 선택 경로(칼럼 체인) — [STEP1에서 클릭한 노드, STEP2에서 클릭한 노드, ...]
  const [selectedPath, setSelectedPath] = useState<TreeNode[]>([]);

  const previewRef = useRef<ChatBotPreviewHandle>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChatMenuTypes | null>(null);
  const [form, setForm] = useState<ChatMenuRequest>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  /* QaForm 구조에 맞춘 에러 state */
  const [errors, setErrors] = useState<FormErrors>({});

  const [deleteTarget, setDeleteTarget] = useState<ChatMenuTypes | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' | 'info' } | null>(null);

  const [publishing, setPublishing] = useState(false);

  /* ---------------------------------------------------------------------
     옵션형 메뉴 자동생성 — 문서 첨부 상태
  --------------------------------------------------------------------- */
  const [docs, setDocs] = useState<ManualDocSummary[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // 최상위 메뉴 AI 추천 — 추천 후보를 관리자가 골라(이름/설명 수정 가능) 등록
  const [suggestInfo, setSuggestInfo] = useState<Omit<SuggestCategoriesResult, 'suggestions'> | null>(null);
  const [suggestions, setSuggestions] = useState<{ label: string; desc: string; checked: boolean }[]>([]);
  const [registering, setRegistering] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false);
  // 화면을 두 탭으로 나눔 — 메뉴 구성(직접 관리) / AI 추천(매뉴얼·추천·결과 검토). 주소의 ?tab= 으로 유지
  const { tab, changeTab } = useTab<ChatMenuTabKey>({ defaultTab: 'menu' });
  // 하위 메뉴 추천이 끝난 뒤 알려 줄 것 — 메뉴를 만들지 못한 문서 / 자리가 없어 넣지 않은 섹션
  const [resultNotice, setResultNotice] = useState<{ skipped: string[]; dropped: string[] } | null>(null);
  // 같은 내용을 AI 추천 탭에 계속 보여 주는 요약 (창은 한 번 뜨고 닫히므로)
  const [resultInfo, setResultInfo] = useState<{ skipped: string[]; dropped: string[] } | null>(null);
  const [generateAvailable, setGenerateAvailable] = useState(false);
  const [generatedTree, setGeneratedTree] = useState<GeneratedMenuTop[] | null>(null);
  const [vectorizeFailedDocs, setVectorizeFailedDocs] = useState<{ no: number; filename: string }[]>([]);
  const [retryingVectorize, setRetryingVectorize] = useState(false);
  const [docDeleteTarget, setDocDeleteTarget] = useState<ManualDocSummary | null>(null);
  const [docDeleting, setDocDeleting] = useState(false);

  // 첨부문서 일괄삭제 — 체크된 문서 번호
  const [checkedDocNos, setCheckedDocNos] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // AI 옵션생성 진행 상태 — 생성은 서버 백그라운드 작업이라 새로고침해도 /status로 복원된다.
  // serverPercent는 서버가 알려준 실제 단계, displayPercent는 다음 폴링까지 조금씩
  // 차오르는 표시용 값(한 지점에 멈춰 보이지 않게)
  const [jobStatus, setJobStatus] = useState<GenerateJobStatus['status']>('idle');
  const [jobKind, setJobKind] = useState<'generate' | 'suggest'>('generate');
  // 옵션생성이든 최상위 메뉴 추천이든 작업이 돌고 있으면 화면을 잠근다(generating = 작업 진행 중)
  const generating = jobStatus === 'running';
  // AI 서버(FastAPI) 꺼짐 여부 — 요청이 서버까지 닿지 못하면 true, 상태 확인으로 자동 복구
  const [aiServerDown, setAiServerDown] = useState(false);
  const markIfServerDown = (err: unknown) => {
    if (isNetworkError(err)) setAiServerDown(true);
  };
  const suggesting = generating && jobKind === 'suggest';
  const jobTitle = jobKind === 'suggest' ? '최상위 메뉴 추천' : '하위 메뉴 추천';
  // 생성 중에는 화면의 다른 작업을 막는다(inert: 클릭·포커스·키보드 모두 차단). 진행 패널만 조작 가능
  const lockClass = generating ? 'chatmenu_locked' : '';
  const [serverPercent, setServerPercent] = useState(0);
  const [displayPercent, setDisplayPercent] = useState(0);
  const [progressLogs, setProgressLogs] = useState<GenerateLog[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedBase = useRef({ sec: 0, at: 0 }); // 서버 경과시간 + 받은 시각 → 폴링 사이에도 초 단위로 증가
  const resultHandled = useRef(false); // 완료 결과(미리보기/알림)를 한 번만 반영
  const progressLogRef = useRef<HTMLUListElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetNo = useRef<number | null>(null);

  const loadTree = () => {
    setLoading(true);
    axiosInstance
      .get<ChatMenuTypes[]>('/chat_menu/tree/admin')
      .then((res) => setFlatList(res.data))
      .catch((err) => console.error('메뉴 트리 조회 실패:', err))
      .finally(() => setLoading(false));
  };

  const loadDocs = () => {
    setDocsLoading(true);
    getManualDocs()
      .then((res) => setDocs(res))
      .catch((err) => {
        console.error('첨부문서 목록 조회 실패:', err);
        markIfServerDown(err);
      })
      .finally(() => setDocsLoading(false));
  };

  const loadGenerateAvailable = () => {
    isGenerateAvailable()
      .then((available) => setGenerateAvailable(available))
      .catch((err) => {
        console.error('AI생성 가능여부 조회 실패:', err);
        markIfServerDown(err);
      });
  };

  /** 생성 결과 반영 — 벡터화 실패가 있으면 미리보기 대신 재시도 안내 */
  const applyGenerateResult = (result: GenerateMenuResult, showAlert: boolean) => {
    const skipped = result.skippedDocs ?? [];
    const dropped = result.droppedSections ?? [];
    if (showAlert && (skipped.length > 0 || dropped.length > 0)) {
      // 긴 목록이라 일반 알림 대신 전용 창(결과 안내)으로 보여 줌
      setResultNotice({ skipped, dropped });
    }
    // 창을 닫았거나 다른 화면에 있다가 돌아와도 다시 볼 수 있게 AI 추천 탭에 남겨 둠
    setResultInfo(skipped.length > 0 || dropped.length > 0 ? { skipped, dropped } : null);
    if (result.vectorizeFailedDocs.length > 0) {
      setVectorizeFailedDocs(result.vectorizeFailedDocs);
    } else {
      setGeneratedTree(result.categories);
    }
  };

  /** 서버 작업 상태를 화면에 반영. fromMount=true면 새로고침 직후 복원(알림은 띄우지 않음) */
  const applyJobStatus = (st: GenerateJobStatus, fromMount = false) => {
    const kind = st.kind ?? 'generate';
    setJobKind(kind);
    setJobStatus(st.status);
    if (st.status === 'idle') {
      setProgressLogs([]);
      return;
    }
    setServerPercent(st.percent ?? 0);
    setProgressLogs(st.logs ?? []);
    elapsedBase.current = { sec: st.elapsedSec ?? 0, at: Date.now() };
    setElapsedSec(st.elapsedSec ?? 0);

    if (st.status === 'running' || resultHandled.current) return;
    resultHandled.current = true;

    if (st.status === 'done') {
      setDisplayPercent(100);
      if (kind === 'suggest') {
        // 추천 결과 → 선택 패널 (새로고침 후에도 서버 기록이 남아 있으면 다시 채움)
        if (st.result) applySuggestResult(st.result as SuggestCategoriesResult);
        return;
      }
      if (st.result) applyGenerateResult(st.result as GenerateMenuResult, !fromMount);
      loadTree();
      loadGenerateAvailable();
    } else if (st.status === 'error') {
      if (!fromMount) {
        const title = kind === 'suggest' ? '최상위 메뉴 추천' : '하위 메뉴 추천';
        setAlert({ message: `${title} 중 오류가 발생했습니다.\n${st.error ?? ''}`, variant: 'error' });
      }
      loadGenerateAvailable();
    }
  };

  useEffect(() => {
    loadTree();
    loadDocs();
    loadGenerateAvailable();
    // 새로고침/재진입 시 진행 중이거나 끝난 작업이 있으면 이어서 보여줌
    getGenerateMenuStatus()
      .then((st) => {
        if (st.status === 'running') setDisplayPercent(st.percent ?? 0);
        applyJobStatus(st, true);
      })
      .catch((err) => {
        console.error('AI 옵션생성 상태 조회 실패:', err);
        markIfServerDown(err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 진행 중이면 1초마다 서버 상태 폴링 — 실패하면 간격을 늘려(최대 30초) 오류가 쌓이지 않게 함
  useEffect(() => {
    if (!generating) return;
    let timer: number | undefined;
    let fails = 0;
    let stopped = false;
    const tick = () => {
      getGenerateMenuStatus()
        .then((st) => {
          fails = 0;
          setAiServerDown(false);
          applyJobStatus(st);
        })
        .catch((err) => {
          fails += 1;
          console.warn(`AI 옵션생성 상태 조회 실패 (${fails}회 연속):`, err);
          markIfServerDown(err);
        })
        .finally(() => {
          if (!stopped) timer = window.setTimeout(tick, fails ? backoffDelay(fails) : 1000);
        });
    };
    timer = window.setTimeout(tick, 1000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating]);

  // AI 서버가 꺼져 있으면 상태 확인(health)을 간격을 늘려가며 재시도 → 켜지면 목록·상태 자동 새로고침
  useEffect(() => {
    if (!aiServerDown) return;
    let timer: number | undefined;
    let retry = 0;
    let stopped = false;
    const check = async () => {
      if (await checkAiServer()) {
        if (stopped) return;
        setAiServerDown(false);
        reconnectAiServer();
        return;
      }
      if (!stopped) timer = window.setTimeout(check, backoffDelay(++retry));
    };
    timer = window.setTimeout(check, backoffDelay(0));
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiServerDown]);

  /** AI 서버 재연결 후(또는 [지금 다시 연결]) — 문서 목록·생성 가능 여부·작업 상태 다시 불러오기 */
  const reconnectAiServer = () => {
    loadDocs();
    loadGenerateAvailable();
    getGenerateMenuStatus()
      .then((st) => applyJobStatus(st, true))
      .catch((err) => markIfServerDown(err));
  };

  const handleRetryAiServer = async () => {
    if (await checkAiServer()) {
      setAiServerDown(false);
      reconnectAiServer();
    } else {
      setAlert({ message: 'AI 서버(FastAPI)가 아직 응답하지 않습니다. 서버가 켜져 있는지 확인해주세요.', variant: 'error' });
    }
  };

  // 진행 로그가 늘어나면 맨 아래(최신)로 스크롤
  useEffect(() => {
    const el = progressLogRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [progressLogs.length]);

  // 문서 목록이 바뀌면 사라진 문서의 체크 해제
  useEffect(() => {
    setCheckedDocNos((prev) => prev.filter((no) => docs.some((d) => d.no === no)));
  }, [docs]);

  // 생성 중: 표시 진행률을 서버 진행률 쪽으로 따라가게 하고, 다음 이벤트를 기다리는 동안에도
  // 서버값 + 최대 7%까지 천천히(점점 느리게) 차오르게 한다. 경과시간도 함께 갱신.
  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => {
      const base = elapsedBase.current;
      setElapsedSec(base.sec + Math.floor((Date.now() - base.at) / 1000));
      setDisplayPercent((prev) => {
        if (prev < serverPercent) return Math.min(serverPercent, prev + Math.max(1, (serverPercent - prev) / 3));
        const cap = Math.min(serverPercent + 7, 99);
        return prev < cap ? prev + (cap - prev) * 0.04 : prev;
      });
    }, 300);
    return () => window.clearInterval(timer);
  }, [generating, serverPercent]);

  const buildTree = (list: ChatMenuTypes[]): TreeNode[] => {
    const map = new Map<number, TreeNode>();
    list.forEach((item) => map.set(item.no, { ...item, children: [] }));
    const roots: TreeNode[] = [];
    map.forEach((node) => {
      if (node.pno == null) roots.push(node);
      else {
        const parent = map.get(node.pno);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    });
    const sortRec = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.vseq - b.vseq);
      nodes.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  };

  const tree = buildTree(flatList);

  // 관리자가 등록한 최상위 메뉴 — [하위 메뉴 AI 추천]은 매뉴얼 섹션을 이 메뉴들 아래로 분류한다
  const adminRoots = flatList.filter((m) => m.pno == null && m.aiyn !== 'Y');

  /* ---------------------------------------------------------------------
     최상위 메뉴 AI 추천 → 관리자가 골라서 등록
  --------------------------------------------------------------------- */
  const checkedSuggestions = suggestions.filter((sg) => sg.checked && sg.label.trim());

  const updateSuggestion = (idx: number, patch: Partial<{ label: string; desc: string; checked: boolean }>) => {
    setSuggestions((prev) => prev.map((sg, i) => (i === idx ? { ...sg, ...patch } : sg)));
  };

  const applySuggestResult = (res: SuggestCategoriesResult) => {
    const { suggestions: list, ...info } = res;
    setSuggestInfo(info);
    // 남은 자리만큼 미리 체크해 둠 (관리자가 해제/수정 가능)
    setSuggestions(list.map((sg, i) => ({ ...sg, checked: i < info.max })));
  };

  /** 최상위 메뉴 추천 — 옵션생성과 같은 백그라운드 작업 + 진행 패널로 표시 */
  const handleSuggest = async () => {
    if (generating) return;
    resultHandled.current = false;
    setSuggestInfo(null);
    setSuggestions([]);
    setServerPercent(0);
    setDisplayPercent(0);
    setElapsedSec(0);
    setProgressLogs([{ key: 'request', message: '최상위 메뉴 추천 요청 중...', state: 'running' }]);
    setJobKind('suggest');
    setJobStatus('running');
    try {
      applyJobStatus(await startSuggestCategories());
    } catch (err) {
      console.error('최상위 메뉴 추천 시작 실패:', err);
      setJobStatus('idle');
      setProgressLogs([]);
      setAlert({ message: '최상위 메뉴 추천을 시작하지 못했습니다.', variant: 'error' });
    }
  };

  // 등록(교체) 전 확인 — 유지/추가/삭제될 최상위 메뉴 미리 계산 (이름 공백 무시 비교)
  const normLabel = (text: string) => text.replace(/\s+/g, '');
  const replacePlan = (() => {
    const picked = checkedSuggestions.map((sg) => sg.label.trim());
    const roots = flatList.filter((m) => m.pno == null);
    const kept = picked.filter((l) => adminRoots.some((r) => normLabel(r.label) === normLabel(l)));
    return {
      kept,
      added: picked.filter((l) => !kept.includes(l)),
      removed: roots.filter((r) => r.aiyn === 'Y' || !kept.some((l) => normLabel(l) === normLabel(r.label))).map((r) => r.label),
    };
  })();

  const handleRegisterSuggestions = async () => {
    if (!suggestInfo || checkedSuggestions.length === 0) return;
    setRegistering(true);
    try {
      const res = await replaceTopMenus(checkedSuggestions.map((sg) => ({ label: sg.label.trim(), desc: sg.desc.trim() })));
      const lines = [`최상위 메뉴를 교체했습니다. (유지 ${res.kept.length} · 추가 ${res.added.length} · 삭제 ${res.removed.length})`];
      if (res.removed.length > 0) lines.push(`삭제: ${res.removed.join(', ')}`);
      lines.push('이제 [하위 메뉴 AI 추천]을 실행하면 매뉴얼이 새 메뉴 구성에 맞게 다시 분류됩니다.');
      setAlert({ message: lines.join('\n'), variant: 'success' });
      setReplaceConfirmOpen(false);
      setSuggestInfo(null);
      setSuggestions([]);
      // 추천 작업 기록도 지워서 새로고침 후 예전 추천이 다시 뜨지 않게
      handleCloseProgress();
    } catch (err) {
      console.error('최상위 메뉴 교체 실패:', err);
      const detail = errorMessage(err);
      setAlert({ message: `최상위 메뉴 교체 중 오류가 발생했습니다.${detail ? `\n${detail}` : ''}`, variant: 'error' });
    } finally {
      setRegistering(false);
      loadTree();
      loadDocs();
      loadGenerateAvailable();
    }
  };

  // 트리가 바뀌면(수정/삭제 후) selectedPath도 최신 데이터로 다시 맞춤
  useEffect(() => {
    if (selectedPath.length === 0) return;
    const freshPath: TreeNode[] = [];
    let currentLevel = tree;
    for (const oldNode of selectedPath) {
      const found = currentLevel.find((n) => n.no === oldNode.no);
      if (!found) break; // 삭제된 경우 그 지점에서 경로 끊음
      freshPath.push(found);
      currentLevel = found.children;
    }
    setSelectedPath(freshPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatList]);

  /** 노드 클릭 시 — 그 노드가 속한 depth까지만 경로를 자르고, 클릭한 노드를 새로 추가 */
  const handleSelectAt = (depth: number, node: TreeNode) => {
    setSelectedPath((prev) => [...prev.slice(0, depth), node]);
  };

  const lastSelected = selectedPath[selectedPath.length - 1] ?? null;

  // 렌더링할 컬럼들: [STEP1 목록, (선택했으면) 그 자식 목록, (또 선택했으면) 그 자식 목록...]
  const columns: { nodes: TreeNode[]; depth: number }[] = [{ nodes: tree, depth: 0 }];
  selectedPath.forEach((node, idx) => {
    if (node.children.length > 0) {
      columns.push({ nodes: node.children, depth: idx + 1 });
    }
  });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === 'vseq' ? Number(value) : name === 'label' ? cutToBytes(value) : value,
    }));

    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const openCreateModal = (parent: TreeNode | null) => {
    if (!parent && adminRoots.length >= MAX_TOP_MENUS) {
      setAlert({ message: `최상위 메뉴는 최대 ${MAX_TOP_MENUS}개까지 등록할 수 있습니다.\n기존 메뉴를 정리한 뒤 추가해주세요.`, variant: 'info' });
      return;
    }
    setEditTarget(null);
    setForm({ pno: parent ? parent.no : null, step: parent ? parent.step + 1 : 1, label: '', answer: '', vseq: 0, useyn: 'Y' });
    setErrors({});
    setFormOpen(true);
  };

  const openEditModal = (node: TreeNode) => {
    setEditTarget(node);
    setForm({ pno: node.pno, step: node.step, label: node.label, answer: node.answer ?? '', vseq: node.vseq, useyn: node.useyn });
    setErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditTarget(null);
    setErrors({});
  };

  // ==========================================
  // 유효성 검사 (QaForm 동일 구조)
  // ==========================================
  const REQUIRED_FIELDS: { field: keyof FormErrors; label: string }[] = [
    { field: 'label', label: '선택지 텍스트' },
  ];

  const validate = () => {
    const newErrors: FormErrors = {};

    for (const { field, label } of REQUIRED_FIELDS) {
      if (!String(form[field] ?? '').trim()) {
        newErrors[field] = `${label}을(를) 입력해주세요.`;
      }
    }

    if (form.step > 3) {
      newErrors.step = '옵션 단계는 최대 3단계까지만 가능합니다.';
    }

    setErrors(newErrors);
    set_focus('cm_label');
    return Object.keys(newErrors).length === 0;
  };

  const submitForm = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      if (editTarget) {
        await axiosInstance.put(`/chat_menu/${editTarget.no}`, form);
        setAlert({ message: '메뉴가 수정되었습니다.', variant: 'success' });
      } else {
        await axiosInstance.post('/chat_menu', form);
        setAlert({ message: '메뉴가 등록되었습니다.', variant: 'success' });
      }
      closeForm();
      loadTree();
    } catch (err) {
      console.error('메뉴 저장 실패:', err);
      setAlert({ message: '저장 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/chat_menu/${deleteTarget.no}`);
      setAlert({ message: '메뉴가 삭제되었습니다. (하위 선택지 포함)', variant: 'success' });
      setDeleteTarget(null);
      loadTree();
    } catch (err) {
      console.error('메뉴 삭제 실패:', err);
      setAlert({ message: '메뉴 삭제 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  /** 공개/비공개 토글 — 기존 관리자 작성 메뉴, AI생성 메뉴 구분 없이 전부 사용 가능 */
  const toggleUseyn = async (node: TreeNode) => {
    const nextUseyn = node.useyn === 'Y' ? 'N' : 'Y';
    try {
      await axiosInstance.put(`/chat_menu/${node.no}/useyn`, { useyn: nextUseyn });
      loadTree();
    } catch (err) {
      console.error('공개상태 변경 실패:', err);
      setAlert({ message: '공개상태 변경 중 오류가 발생했습니다.', variant: 'error' });
    }
  };

  const handlePreviewRefresh = () => {
    setSelectedPath([]); // 트리 쪽 선택 경로도 초기화
    previewRef.current?.reset(); // 미리보기 내부 상태도 초기화
  };

  /* ---------------------------------------------------------------------
     옵션형 메뉴 자동생성 — 문서 첨부/AI생성/미리보기/공개
  --------------------------------------------------------------------- */

  /**
   * 매뉴얼 여러 개 업로드 — 파일 선택/끌어다놓기 공통.
   * .md만 받고, 한 개씩 순서대로 올린다(같은 파일명 교체 처리가 겹치지 않게). 벡터화는 [하위 메뉴 AI 추천] 때 수행.
   * 같은 파일명은 서버가 기존 문서를 덮어쓴다.
   */
  const uploadFiles = async (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0 || uploading || generating) return;

    const mdFiles = files.filter((f) => f.name.toLowerCase().endsWith('.md'));
    const skipped = files.filter((f) => !f.name.toLowerCase().endsWith('.md')).map((f) => f.name);
    if (mdFiles.length === 0) {
      setAlert({ message: `.md 파일만 첨부할 수 있습니다.\n제외: ${skipped.join(', ')}`, variant: 'error' });
      return;
    }

    setUploading(true);
    const failed: string[] = [];
    for (let i = 0; i < mdFiles.length; i++) {
      setUploadProgress({ current: i + 1, total: mdFiles.length, name: mdFiles[i].name });
      try {
        await uploadManualDoc(mdFiles[i]);
      } catch (err) {
        console.error(`문서 업로드 실패 (${mdFiles[i].name}):`, err);
        failed.push(mdFiles[i].name);
      }
    }
    setUploading(false);
    setUploadProgress(null);
    loadDocs();
    loadGenerateAvailable();

    const okCount = mdFiles.length - failed.length;
    const lines = [`문서 ${okCount}개가 첨부되었습니다.`];
    if (failed.length > 0) lines.push(`업로드 실패: ${failed.join(', ')}`);
    if (skipped.length > 0) lines.push(`.md가 아니라 제외: ${skipped.join(', ')}`);
    setAlert({ message: lines.join('\n'), variant: failed.length > 0 || skipped.length > 0 ? 'error' : 'success' });
  };

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ''; // 같은 파일 연속 선택 가능하도록 초기화
    uploadFiles(files);
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); // 기본동작(브라우저가 파일을 열어버림) 막아야 drop 이벤트가 옴
    if (uploading || generating) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    // 자식 요소로 이동할 때 발생하는 dragleave는 무시
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleReplaceClick = (doc: ManualDocSummary) => {
    replaceTargetNo.current = doc.no;
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetNo = replaceTargetNo.current;
    if (!file || targetNo == null) return;

    setUploading(true);
    try {
      await updateManualDoc(targetNo, file);
      setAlert({ message: '문서가 교체되었습니다.', variant: 'success' });
      loadDocs();
      loadGenerateAvailable();
    } catch (err) {
      console.error('문서 교체 실패:', err);
      setAlert({ message: '문서 교체 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setUploading(false);
      replaceTargetNo.current = null;
    }
  };

  const submitDocDelete = async () => {
    if (!docDeleteTarget) return;
    setDocDeleting(true);
    try {
      await deleteManualDoc(docDeleteTarget.no);
      setAlert({ message: '문서가 삭제되었습니다.', variant: 'success' });
      setDocDeleteTarget(null);
      loadDocs();
      loadGenerateAvailable();
      loadTree();
    } catch (err) {
      console.error('문서 삭제 실패:', err);
      setAlert({ message: '문서 삭제 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setDocDeleting(false);
    }
  };

  const toggleDocChecked = (no: number) => {
    setCheckedDocNos((prev) => (prev.includes(no) ? prev.filter((n) => n !== no) : [...prev, no]));
  };

  const allDocsChecked = docs.length > 0 && checkedDocNos.length === docs.length;
  const toggleAllDocs = () => {
    setCheckedDocNos(allDocsChecked ? [] : docs.map((d) => d.no));
  };

  const submitBulkDocDelete = async () => {
    if (checkedDocNos.length === 0) return;
    setDocDeleting(true);
    try {
      const result = await deleteManualDocs(checkedDocNos);
      if (result.failed.length > 0) {
        setAlert({
          message: `${result.deleted.length}개 삭제, ${result.failed.length}개 삭제 실패했습니다.`,
          variant: 'error',
        });
      } else {
        setAlert({ message: `문서 ${result.deleted.length}개가 삭제되었습니다.`, variant: 'success' });
      }
      setBulkDeleteOpen(false);
      setCheckedDocNos([]);
      loadDocs();
      loadGenerateAvailable();
      loadTree(); // 삭제된 문서로 만든 AI메뉴도 같이 지워지므로 트리 갱신
    } catch (err) {
      console.error('문서 일괄삭제 실패:', err);
      setAlert({ message: '문서 일괄삭제 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setDocDeleting(false);
    }
  };

  const handleGenerate = () => {
    if (!generateAvailable || generating) return;
    runGenerate(startGenerateMenu);
  };

  /** 전체 다시 생성 — 모든 매뉴얼을 새 규칙(내부 정보 제외, 긴 제목 요약 등)으로 다시 만듦 */
  const handleRegenerateAll = () => {
    setRegenConfirmOpen(false);
    if (generating) return;
    runGenerate(regenerateAllMenus);
  };

  const runGenerate = async (start: () => Promise<GenerateJobStatus>) => {
    resultHandled.current = false;
    setGeneratedTree(null);
    setVectorizeFailedDocs([]);
    setServerPercent(0);
    setDisplayPercent(0);
    setElapsedSec(0);
    setResultInfo(null); // 새로 추천하면 지난 결과 요약은 지움
    setProgressLogs([{ key: 'request', message: '하위 메뉴 추천 요청 중...', state: 'running' }]);
    setJobKind('generate');
    setJobStatus('running');
    try {
      // 서버가 백그라운드로 시작하고 즉시 응답 → 이후 진행은 폴링으로 받음
      applyJobStatus(await start());
      loadDocs(); // 전체 다시 생성이면 문서들이 '미반영'으로 바뀐 것을 반영
    } catch (err) {
      console.error('AI 옵션생성 시작 실패:', err);
      setJobStatus('idle');
      setProgressLogs([]);
      setAlert({ message: '하위 메뉴 추천을 시작하지 못했습니다.', variant: 'error' });
    }
  };

  /** 진행 패널 닫기 — 서버의 완료 기록도 지워서 새로고침 후 다시 뜨지 않게 함 */
  const handleCloseProgress = async () => {
    setProgressLogs([]);
    setJobStatus('idle');
    try {
      await clearGenerateMenu();
    } catch (err) {
      console.error('AI 옵션생성 기록 삭제 실패:', err);
    }
  };

  const handleRetryVectorize = async () => {
    setRetryingVectorize(true);
    try {
      const result = await retryVectorize();
      if (result.vectorizeFailedDocs.length > 0) {
        setVectorizeFailedDocs(result.vectorizeFailedDocs);
        setAlert({ message: '일부 문서는 여전히 벡터화에 실패했습니다.', variant: 'error' });
      } else {
        setVectorizeFailedDocs([]);
        setAlert({ message: '벡터화가 완료되었습니다. 추천된 메뉴를 확인해주세요.', variant: 'success' });
        loadTree();
      }
    } catch (err) {
      console.error('벡터화 재시도 실패:', err);
      setAlert({ message: '벡터화 재시도 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setRetryingVectorize(false);
    }
  };

  /** 생성 미리보기 안의 텍스트를 직접 수정 — 로컬 state만 변경(저장은 [공개]에서) */
  const updateGeneratedTop = (topNo: number, updater: (top: GeneratedMenuTop) => GeneratedMenuTop) => {
    setGeneratedTree((prev) => (prev ? prev.map((t) => (t.no === topNo ? updater(t) : t)) : prev));
  };

  const updateGeneratedLeafText = (topNo: number, midNo: number, leafIdx: number, field: 'label' | 'answer', value: string) => {
    updateGeneratedTop(topNo, (top) => ({
      ...top,
      children: top.children.map((mid) =>
        mid.no !== midNo
          ? mid
          : { ...mid, leaves: mid.leaves.map((leaf, li) => (li === leafIdx ? { ...leaf, [field]: value } : leaf)) },
      ),
    }));
  };

  /** 하위(STEP3)가 없는 STEP2의 답변 수정 */
  const updateGeneratedMidAnswer = (topNo: number, midNo: number, value: string) => {
    updateGeneratedTop(topNo, (top) => ({
      ...top,
      children: top.children.map((mid) => (mid.no === midNo ? { ...mid, answer: value } : mid)),
    }));
  };

  // 미리보기에는 이번에 생성됐고 아직 비공개인 하위메뉴(STEP2)만 표시 — 공개했거나 삭제된 것은 자동으로 빠짐.
  // 카테고리(STEP1)는 여러 매뉴얼이 함께 쓰는 공용이라 이미 공개돼 있을 수 있으므로 하위 기준으로 거른다.
  const visibleGenerated = (generatedTree ?? [])
    .map((t) => ({ ...t, children: t.children.filter((c) => flatList.some((m) => m.no === c.no && m.useyn === 'N')) }))
    .filter((t) => t.children.length > 0);

  /** 미리보기에서 수정한 텍스트를 저장(일반 메뉴 수정 API 재사용)한 뒤 공개 전환 */
  const publishOne = async (top: GeneratedMenuTop) => {
    for (const mid of top.children) {
      const originalMid = flatList.find((m) => m.no === mid.no);
      if (originalMid && mid.leaves.length === 0 && originalMid.answer !== mid.answer) {
        await axiosInstance.put(`/chat_menu/${mid.no}`, {
          pno: originalMid.pno,
          step: originalMid.step,
          label: originalMid.label,
          answer: mid.answer,
          vseq: originalMid.vseq,
          useyn: originalMid.useyn,
        });
      }
      for (const leaf of mid.leaves) {
        const original = flatList.find((m) => m.no === leaf.no);
        if (original && (original.label !== leaf.label || original.answer !== leaf.answer)) {
          await axiosInstance.put(`/chat_menu/${leaf.no}`, {
            pno: original.pno,
            step: original.step,
            label: leaf.label,
            answer: leaf.answer,
            vseq: original.vseq,
            useyn: original.useyn,
          });
        }
      }
    }
    // 공용 카테고리 + 이번에 생성된 하위메뉴만 공개 (같은 카테고리의 다른 비공개 메뉴는 그대로)
    await publishMenuNodes(top.no, top.children.map((c) => c.no));
  };

  const handlePublishGenerated = async (top: GeneratedMenuTop) => {
    setPublishing(true);
    try {
      await publishOne(top);
      setAlert({ message: `'${top.label}' 메뉴가 공개되었습니다.`, variant: 'success' });
    } catch (err) {
      console.error('메뉴 공개 실패:', err);
      setAlert({ message: '메뉴 공개 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setPublishing(false);
      loadTree();
    }
  };

  /** 미리보기에 남은 카테고리 전체 일괄 공개 — 하나가 실패해도 나머지는 계속 진행 */
  const handlePublishAllGenerated = async () => {
    if (visibleGenerated.length === 0) return;
    setPublishing(true);
    const failed: string[] = [];
    for (const top of visibleGenerated) {
      try {
        await publishOne(top);
      } catch (err) {
        console.error(`'${top.label}' 공개 실패:`, err);
        failed.push(top.label);
      }
    }
    setPublishing(false);
    loadTree();
    loadDocs();
    if (failed.length > 0) {
      setAlert({
        message: `${visibleGenerated.length - failed.length}개 공개, 실패: ${failed.join(', ')}`,
        variant: 'error',
      });
    } else {
      setAlert({ message: `${visibleGenerated.length}개 메뉴가 모두 공개되었습니다.`, variant: 'success' });
    }
  };

  // AI 추천 탭에 검토할 것이 몇 개 있는지 — 최상위 메뉴 추천 후보 또는 공개 전인 하위 메뉴 추천 결과
  const aiResultCount = visibleGenerated.length > 0 ? visibleGenerated.length : suggestInfo ? suggestions.length : 0;

  return (
    <section className="view active">
      <div className={lockClass} inert={generating}>
        <PageHeader
          title="옵션메뉴 관리"
          description="옵션형 상담 선택지 트리를 관리합니다 (최대 3단계)"
        />
      </div>

      {/* 탭 — AI 작업은 몇 분 걸리므로, 다른 탭에 있어도 진행 중·검토할 결과가 있는지 탭에 표시 */}
      <div className="tabs" role="tablist" aria-label="옵션 메뉴 관리 보기 전환">
        <button
          type="button"
          role="tab"
          className={`tab${tab === 'menu' ? ' on' : ''}`}
          aria-selected={tab === 'menu'}
          onClick={() => changeTab('menu')}
        >
          메뉴 구성
        </button>
        <button
          type="button"
          role="tab"
          className={`tab${tab === 'ai' ? ' on' : ''}`}
          aria-selected={tab === 'ai'}
          onClick={() => changeTab('ai')}
        >
          AI 추천
          {generating ? (
            <span className="chatmenu_tab_state is_running">진행 중</span>
          ) : aiResultCount > 0 ? (
            <span className="chatmenu_tab_state">결과 {aiResultCount}</span>
          ) : null}
        </button>
      </div>

      {/* 탭을 바꿔도 입력하던 내용·펼친 상태가 남도록, 지우지 않고 숨기기만 함 */}
      <div hidden={tab !== 'ai'}>
      {/* ===================== 옵션형 메뉴 자동생성 ===================== */}
      <div className="chatmenu_generate_section">
        <div className="chatmenu_section_head">
          <div>
            <h3 className="chatmenu_section_title">옵션형 메뉴 자동생성</h3>
            <p className="chatmenu_section_desc">매뉴얼(.md)을 올리면 AI가 최상위 메뉴 아래로 내용을 나눠 하위 메뉴와 답변을 만듭니다.</p>
          </div>
          <span className={`chatmenu_count${adminRoots.length >= MAX_TOP_MENUS ? ' is_full' : ''}`}>
            최상위 메뉴 {adminRoots.length}/{MAX_TOP_MENUS}
          </span>
        </div>

        {/* AI 서버(FastAPI) 꺼짐 안내 — 자동으로 재연결을 시도하고, 켜지면 목록·상태를 다시 불러옴 */}
        {aiServerDown && (
          <div className="chatmenu_server_down" role="status">
            <span>
              AI 서버(FastAPI)에 연결할 수 없습니다. 매뉴얼 첨부·AI 추천은 서버가 다시 켜지면 자동으로 복구됩니다.
              {generating && ' 진행 중이던 작업 상태도 다시 확인합니다.'}
            </span>
            <button type="button" className="btn btn_xsm btn_ghost" onClick={handleRetryAiServer}>
              지금 다시 연결
            </button>
          </div>
        )}

        {/* 매뉴얼 첨부 — 클릭 또는 끌어다놓기, 여러 개 가능 (AttachUploader의 file_drop 디자인 재사용) */}
        <label
          className={`file_drop chatmenu_file_drop${dragOver ? ' is_dragover' : ''}${uploading || generating ? ' is_disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md"
            disabled={uploading || generating}
            onChange={handleFileSelected}
            className="sr_only_input"
          />
          <span className="file_upload" aria-hidden="true"></span>
          {generating ? (
            <>
              <span className="b_title">{jobTitle} 중에는 매뉴얼을 첨부할 수 없습니다</span>
              <span className="b_title sm">생성이 끝나면 다시 첨부할 수 있습니다</span>
            </>
          ) : uploadProgress ? (
            <>
              <span className="b_title">
                업로드 중 ({uploadProgress.current}/{uploadProgress.total})
              </span>
              <span className="b_title sm">{uploadProgress.name}</span>
            </>
          ) : (
            <>
              <span className="b_title">클릭하거나 매뉴얼 파일을 끌어다 놓으세요</span>
              <span className="b_title sm">.md 파일 · 여러 개 선택 가능 · 같은 파일명은 기존 문서를 교체</span>
            </>
          )}
        </label>
        <input ref={replaceFileInputRef} type="file" accept=".md" hidden onChange={handleReplaceFileSelected} />

        <div className="chatmenu_doc_upload_row">
          <button
            type="button"
            className="btn btn_md btn_outline_primary"
            onClick={handleSuggest}
            disabled={generating || docs.length === 0}
          >
            {suggesting ? '최상위 메뉴 추천 중...' : '최상위 메뉴 AI 추천'}
          </button>
          {/* 하위 메뉴 추천 버튼은 하나 — 아직 반영되지 않은 매뉴얼이 있으면 그것만 추천하고,
              모두 반영된 상태면 같은 버튼이 다시 추천(매뉴얼 전체로 다시 생성, 확인 창)을 엽니다 */}
          <button
            type="button"
            className="btn btn_md btn_primary"
            onClick={generateAvailable ? handleGenerate : () => setRegenConfirmOpen(true)}
            disabled={generating || docs.length === 0 || adminRoots.length === 0}
          >
            {generating && jobKind === 'generate'
              ? '하위 메뉴 추천 중...'
              : docs.length > 0 && !generateAvailable
                ? '하위 메뉴 다시 추천'
                : '하위 메뉴 AI 추천'}
          </button>
        </div>
        <p className="chatmenu_action_hint">
          {adminRoots.length === 0
            ? '최상위 메뉴를 먼저 등록해야 하위 메뉴를 추천받을 수 있습니다 ([최상위 메뉴 AI 추천] 가능)'
            : docs.length > 0 && !generateAvailable
              ? '모든 매뉴얼이 메뉴에 반영되어 있습니다. [하위 메뉴 다시 추천]을 누르면 매뉴얼 전체로 하위 메뉴와 답변을 새로 만듭니다.'
              : docs.length === 0
                ? '매뉴얼을 올리면 AI가 하위 메뉴와 답변을 만들 수 있습니다.'
                : '[하위 메뉴 AI 추천]을 누르면 아직 반영되지 않은 매뉴얼로 하위 메뉴와 답변을 만듭니다. 지금 등록된 최상위 메뉴들 아래로 분류됩니다.'}
        </p>


        {generating && (
          <div className="form_hint chatmenu_lock_notice">
            {jobTitle} 중에는 매뉴얼 첨부·수정·삭제, 옵션 메뉴 추가·수정·삭제·공개를 할 수 없습니다.
          </div>
        )}

        {/* 하위 메뉴 추천(옵션생성) 진행률 — 완료된 단계는 취소선, 진행 중 단계는 강조 */}
        {(generating || progressLogs.length > 0) && (
          <div
            className={`chatmenu_progress${!generating && jobStatus !== 'error' && ((jobKind === 'suggest' && suggestInfo) || (jobKind === 'generate' && visibleGenerated.length > 0)) ? ' is_compact' : ''}`}
            aria-live="polite"
          >
            <div className="chatmenu_progress_head">
              <span>
                {generating ? `${jobTitle} 진행 중` : jobStatus === 'error' ? `${jobTitle} 실패` : `${jobTitle} 완료`}
              </span>
              <span>
                {Math.floor(displayPercent)}% · {generating ? `${formatElapsed(elapsedSec)} 경과` : `소요 ${formatElapsed(elapsedSec)}`}
                {generating && aiServerDown && ' · 서버 연결 끊김, 재연결 중'}
              </span>
            </div>
            <div
              className="chatmenu_progress_track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.floor(displayPercent)}
            >
              <div
                className={`chatmenu_progress_bar ${generating ? 'running' : ''} ${jobStatus === 'error' ? 'error' : ''}`}
                style={{ width: `${displayPercent}%` }}
              />
            </div>
            <ul ref={progressLogRef} className="chatmenu_progress_log">
              {progressLogs.map((log) => (
                <li key={log.key} className={`is_${log.state}`}>
                  {log.message}
                </li>
              ))}
            </ul>

            {!generating && (
              <div className='form_page_footer'>
                <button type="button" className="btn btn_xsm btn_ghost" onClick={handleCloseProgress}>
                  닫기
                </button>
              </div>
            )}
          </div>
        )}

        
        {/* 최상위 메뉴 AI 추천 결과 — 골라서 등록 */}
        {suggestInfo && (
          <div className={`chatmenu_suggest ${lockClass}`} inert={generating}>
            <div className="chatmenu_section_head">
              <div>
                <h3 className="chatmenu_section_title">최상위 메뉴 추천</h3>
                <p className="chatmenu_section_desc">
                  이름과 안내 문구를 고친 뒤 교체하세요. 교체하면 최상위 메뉴 전체가 선택한 메뉴로 바뀝니다. [다시 추천]을 누르면 새 후보가 나옵니다.
                </p>
              </div>
              <span className={`chatmenu_count${checkedSuggestions.length >= MAX_TOP_MENUS ? ' is_full' : ''}`}>
                선택 {checkedSuggestions.length}/{MAX_TOP_MENUS}
              </span>
            </div>
            {suggestInfo.existing.length > 0 && (
              <p className="chatmenu_suggest_now">
                <span>현재 메뉴</span>
                {suggestInfo.existing.join(' · ')}
              </p>
            )}
            {checkedSuggestions.length * 5 < suggestInfo.totalSections && (
              <div className="chatmenu_suggest_warn">
                매뉴얼 섹션은 {suggestInfo.totalSections}개인데 들어갈 자리는 {checkedSuggestions.length * 5}칸입니다(메뉴 하나에 하위 메뉴 최대 5개).
                이대로면 중요도가 낮은 섹션 일부는 메뉴에 들어가지 않습니다.
              </div>
            )}
            {suggestions.length === 0 ? (
              <div className="flow_empty">
                추천할 메뉴가 없습니다. 다시 추천을 눌러보세요.
              </div>
            ) : (
              <ul className="chatmenu_suggest_list">
                {suggestions.map((sg, i) => {
                  const full = !sg.checked && checkedSuggestions.length >= MAX_TOP_MENUS;
                  return (
                    <li key={i} className={`chatmenu_suggest_item${sg.checked ? ' is_checked' : ''}`}>
                      <div className="form_check chatmenu_suggest_check">
                        <input
                          type="checkbox"
                          id={`suggest_chk_${i}`}
                          checked={sg.checked}
                          disabled={full}
                          onChange={() => updateSuggestion(i, { checked: !sg.checked })}
                        />
                        <label htmlFor={`suggest_chk_${i}`} className="hidden">
                          {sg.label} 선택
                        </label>
                      </div>
                      <div className="chatmenu_suggest_fields">
                        <input
                          type="text"
                          className="form_input chatmenu_suggest_name"
                          aria-label="메뉴 이름"
                          value={sg.label}
                          onChange={(e) => updateSuggestion(i, { label: cutToBytes(e.target.value) })}
                        />
                        <LabelCounter value={sg.label} />
                        <input
                          type="text"
                          className="form_input"
                          aria-label="안내 문구"
                          placeholder="메뉴를 눌렀을 때 보여줄 안내 문구 (분류에도 참고됨)"
                          value={sg.desc}
                          onChange={(e) => updateSuggestion(i, { desc: e.target.value })}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="chatmenu_suggest_actions">
              {/* 위쪽 [최상위 메뉴 AI 추천]과 같은 동작 — 결과를 보다가 바로 다시 받을 수 있게 */}
              <button type="button" className="btn btn_md btn_outline_primary chatmenu_resuggest_btn" onClick={handleSuggest} disabled={generating}>
                ↻ 다시 추천
              </button>
              <button type="button" className="btn btn_md btn_ghost" onClick={() => setSuggestInfo(null)}>
                닫기
              </button>
              <button
                type="button"
                className="btn btn_md btn_primary"
                onClick={() => setReplaceConfirmOpen(true)}
                disabled={registering || checkedSuggestions.length === 0}
              >
                {registering ? '등록 중...' : `선택한 메뉴로 교체 (${checkedSuggestions.length})`}
              </button>
            </div>
          </div>
        )}

        <div className={lockClass} inert={generating}>
        {docsLoading ? (
          <p className="b_title">문서 목록 불러오는 중...</p>
        ) : docs.length === 0 ? (
          <div className="flow_empty">등록된 매뉴얼 문서가 없습니다.</div>
        ) : (
          <>
          <div className="check_row">
            <div className='form_check'>
              <input type="checkbox" id='all_chk' checked={allDocsChecked} onChange={toggleAllDocs} />
              <label htmlFor='all_chk' className='b_title'>전체 선택 ({checkedDocNos.length}/{docs.length})</label>
            </div>

            <button
              type="button"
              className="btn btn_xsm btn_danger_outline"
              disabled={checkedDocNos.length === 0 || docDeleting}
              onClick={() => setBulkDeleteOpen(true)}
            >
              선택 삭제
            </button>
          </div>
          <ul className="chatmenu_doc_list">
            {docs.map((doc) => (
              <li key={doc.no} className="chatmenu_doc_item">
                {/* 공통 체크박스(.form_check + label) — 파일명을 눌러도 선택됨 */}
                <div className="form_check chatmenu_doc_check">
                  <input
                    type="checkbox"
                    id={`doc_chk_${doc.no}`}
                    checked={checkedDocNos.includes(doc.no)}
                    onChange={() => toggleDocChecked(doc.no)}
                  />
                  <label htmlFor={`doc_chk_${doc.no}`} className="b_title chatmenu_doc_filename">
                    {doc.filename}
                  </label>
                </div>
                {doc.updateYn === 'N' && <span className="badge warn">미반영</span>}
                <span className="cell_sub chatmenu_doc_date" title={doc.cdate}>{doc.cdate.split(' ')[0]}</span>
                <div className="chatmenu_doc_item_actions">
                  <button type="button" className="btn btn_xsm btn_ghost" onClick={() => handleReplaceClick(doc)}>
                    수정
                  </button>
                  <button type="button" className="btn btn_xsm btn_danger_outline" onClick={() => setDocDeleteTarget(doc)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
          </>
        )}

        {/* 벡터화 실패 안내 */}
        {vectorizeFailedDocs.length > 0 && (
          <div className="form_hint error" style={{ marginTop: 12 }}>
            <p>
              하위 메뉴 추천은 완료되었으나 벡터화가 실패하였습니다. 아래 문서의 벡터화를 다시 시도한 뒤 추천된 메뉴를 확인해주세요.
            </p>
            <ul>
              {vectorizeFailedDocs.map((d) => (
                <li key={d.no}>{d.filename}</li>
              ))}
            </ul>
            <button type="button" className="btn btn_sm btn_primary" onClick={handleRetryVectorize} disabled={retryingVectorize}>
              {retryingVectorize ? '재시도 중...' : '벡터화 재시도'}
            </button>
          </div>
        )}

        {/* 하위 메뉴 추천 결과 요약 — 만들지 못한 문서 / 넣지 않은 섹션 (끝났을 때 뜨는 창과 같은 내용, 계속 남음) */}
        {resultInfo && !generating && (
          <div className="chatmenu_result_info" role="status">
            <span>
              {resultInfo.skipped.length > 0 && `메뉴를 만들지 못한 문서 ${resultInfo.skipped.length}개`}
              {resultInfo.skipped.length > 0 && resultInfo.dropped.length > 0 && ' · '}
              {resultInfo.dropped.length > 0 && `자리가 없어 메뉴에 넣지 않은 섹션 ${resultInfo.dropped.length}개`}
            </span>
            <button type="button" className="btn btn_xsm btn_ghost" onClick={() => setResultNotice(resultInfo)}>
              자세히 보기
            </button>
          </div>
        )}

        {/* 생성 결과 미리보기 (label/answer 직접 수정 가능) */}
        {visibleGenerated.length > 0 && (
          <div className="chatmenu_generated_preview">
            <div className="chatmenu_section_head">
              <div>
                <h3 className="chatmenu_section_title">하위 메뉴 추천 결과</h3>
                <p className="chatmenu_section_desc">
                  메뉴를 눌러 펼친 뒤 이름과 답변을 검토·수정하세요. [공개]를 눌러야 사용자 화면에 나오고, 누르지 않으면 비공개로 남습니다.
                </p>
              </div>
              <button
                type="button"
                className="btn btn_md btn_primary"
                onClick={handlePublishAllGenerated}
                disabled={publishing}
              >
                {publishing ? '공개 중...' : `일괄 공개 (${visibleGenerated.length})`}
              </button>
            </div>
            {visibleGenerated.map((top, topIdx) => (
              // 최상위 메뉴마다 접었다 펼침 — 처음엔 첫 메뉴만 펼쳐서 전체 구성이 한눈에 보이게
              <details key={top.no} className="chatmenu_generated_top" open={topIdx === 0}>
                <summary className="chatmenu_generated_top_header">
                  <span className="chatmenu_step_badge">STEP1</span>
                  <span className="flow_detail_title">{top.label}</span>
                  <span className="chatmenu_generated_count">
                    하위 메뉴 {top.children.length}개
                    {top.children.some((m) => m.leaves.length > 0) &&
                      ` · 세부 ${top.children.reduce((sum, m) => sum + m.leaves.length, 0)}개`}
                  </span>
                  <button
                    type="button"
                    className="btn btn_sm btn_outline_primary"
                    onClick={(e) => {
                      e.preventDefault(); // 버튼을 눌러도 접힘 상태는 그대로
                      handlePublishGenerated(top);
                    }}
                    disabled={publishing}
                  >
                    공개
                  </button>
                </summary>

                {top.children.length === 0 && top.answer && (
                  <p className="chatmenu_generated_answer">{top.answer}</p>
                )}

                {top.children.map((mid) => (
                  <div key={mid.no} className="chatmenu_generated_mid">
                    <div className="chatmenu_generated_mid_label">
                      <span className="chatmenu_step_badge">STEP2</span>
                      <span className="chatmenu_generated_mid_name">{mid.label}</span>
                      {mid.filename && <span className="chatmenu_generated_file">{mid.filename}</span>}
                    </div>

                    <div className="chatmenu_generated_leaves">
                      {mid.leaves.length === 0 && (
                        <div className="chatmenu_generated_leaf is_wide">
                          <span className="chatmenu_generated_leaf_label">답변</span>
                          <textarea
                            className="form_textarea"
                            aria-label={`${mid.label} 답변`}
                            value={mid.answer ?? ''}
                            onChange={(e) => updateGeneratedMidAnswer(top.no, mid.no, e.target.value)}
                          />
                        </div>
                      )}

                      {mid.leaves.map((leaf, leafIdx) => (
                        <div key={leaf.no} className="chatmenu_generated_leaf">
                          <span className="chatmenu_generated_leaf_label">STEP3</span>
                          <input
                            type="text"
                            className="form_input"
                            aria-label="세부 메뉴 이름"
                            value={leaf.label}
                            onChange={(e) => updateGeneratedLeafText(top.no, mid.no, leafIdx, 'label', cutToBytes(e.target.value))}
                          />
                          <LabelCounter value={leaf.label} />
                          <textarea
                            className="form_textarea"
                            aria-label="세부 메뉴 답변"
                            value={leaf.answer}
                            onChange={(e) => updateGeneratedLeafText(top.no, mid.no, leafIdx, 'answer', e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </details>
            ))}
          </div>
        )}
        </div>
      </div>
      </div>

      <div hidden={tab !== 'menu'}>
      {/* AI 작업 중에는 메뉴를 고칠 수 없음 — 흐려진 이유를 알려 줌 */}
      {generating && (
        <div className="chatmenu_server_down chatmenu_tab_notice" role="status">
          <span>{jobTitle} 진행 중에는 메뉴를 추가·수정·삭제할 수 없습니다. 끝나면 다시 사용할 수 있습니다.</span>
          <button type="button" className="btn btn_xsm btn_ghost" onClick={() => changeTab('ai')}>
            진행 상황 보기
          </button>
        </div>
      )}
      {/* 검토할 추천 결과가 있으면 알려 줌 */}
      {!generating && aiResultCount > 0 && (
        <div className="chatmenu_tab_hint" role="status">
          <span>검토할 AI 추천 결과가 {aiResultCount}개 있습니다. 공개해야 사용자 화면에 나옵니다.</span>
          <button type="button" className="btn btn_xsm btn_outline_primary" onClick={() => changeTab('ai')}>
            AI 추천 탭에서 보기
          </button>
        </div>
      )}
      {/* ===================== 기존 트리 관리 ===================== */}
      {loading ? (
        <p className="b_title">불러오는 중...</p>
      ) : (
        <div className={`flow_wrap ${lockClass}`} inert={generating}>
          <div className="flow_tree_panel">
            <div className="chatmenu_section_head">
              <div>
                <h3 className="chatmenu_section_title">메뉴 구성</h3>
                <p className="chatmenu_section_desc">메뉴를 누르면 다음 단계가 옆에 열리고, 오른쪽에서 답변 확인·수정을 할 수 있습니다.</p>
              </div>
            </div>
            <div className="flow_columns">
              {[0, 1, 2].map((i) => {
                const col = columns[i];
                // 이 칸에 메뉴를 추가할 때의 상위 메뉴 — 1단계는 없음, 2·3단계는 앞 칸에서 고른 메뉴
                const parent = i === 0 ? null : selectedPath[i - 1] ?? null;
                const canAdd = i === 0 || parent !== null;
                return (
                  <div key={i} className={`flow_column${col ? '' : ' is_idle'}`}>
                    <div className="flow_column_title">
                      <span>STEP{i + 1}</span>
                      <span className="flow_column_sub">
                        {i === 0 ? '최상위 메뉴' : parent ? parent.label : '하위 메뉴'}
                      </span>
                      {col && <span className="flow_column_count">{col.nodes.length}</span>}
                    </div>
                    <div className="flow_column_list">
                      {!col ? (
                        <div className="flow_empty">
                          {parent ? '하위 메뉴가 없습니다.' : `STEP${i} 메뉴를 선택하면 표시됩니다.`}
                        </div>
                      ) : col.nodes.length === 0 ? (
                        <div className="flow_empty">등록된 메뉴가 없습니다.</div>
                      ) : (
                        col.nodes.map((n) => (
                          <button
                            key={n.no}
                            type="button"
                            className={`flow_node ${selectedPath[i]?.no === n.no ? 'active' : ''}${n.useyn === 'N' ? ' is_hidden' : ''}`}
                            onClick={() => handleSelectAt(i, n)}
                          >
                            <span className="flow_node_label">{n.label}</span>
                            {n.aiyn === 'Y' && <span className="badge info">AI</span>}
                            {n.useyn === 'N' && <span className="flow_node_state">비공개</span>}
                            {n.children.length > 0 && <span className="flow_node_arrow">›</span>}
                          </button>
                        ))
                      )}
                    </div>
                    {canAdd && (
                      <button type="button" className="flow_add_btn" onClick={() => openCreateModal(parent)}>
                        + {i === 0 ? '최상위 메뉴' : '하위 메뉴'} 추가
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flow_bottom">
            <div className="flow_detail_panel">
              <div className="flow_detail_header">
                <span className="flow_detail_label">선택된 메뉴 상세</span>
              </div>

              {lastSelected ? (
                <>
                  <div className="flow_detail_row">
                    <span className="chatmenu_step_badge">STEP{lastSelected.step}</span>
                    <span className="flow_detail_title">{lastSelected.label}</span>
                    {lastSelected.aiyn === 'Y' && <span className="badge info">AI생성</span>}
                    {lastSelected.useyn === 'N' && <span className="flow_node_state">비공개</span>}
                  </div>

                  <span className="flow_detail_caption">답변</span>
                  <div className="flow_detail_answer">{lastSelected.answer ?? '서비스 준비 중 입니다.'}</div>

                  <div className="flow_detail_actions">
                    <button type="button" className="btn btn_sm btn_outline_primary" onClick={() => openEditModal(lastSelected)}>
                      수정
                    </button>
                    {lastSelected.step < 3 && (
                      <button type="button" className="btn btn_sm btn_ghost" onClick={() => openCreateModal(lastSelected)}>
                        하위 추가
                      </button>
                    )}
                    <button type="button" className="btn btn_sm btn_ghost" onClick={() => toggleUseyn(lastSelected)}>
                      {lastSelected.useyn === 'Y' ? '비공개로 전환' : '공개로 전환'}
                    </button>
                    <button type="button" className="btn btn_sm btn_danger_outline flow_detail_delete" onClick={() => setDeleteTarget(lastSelected)}>
                      삭제
                    </button>
                  </div>
                </>
              ) : (
                <div className="flow_empty">옵션에서 메뉴를 선택해주세요.</div>
              )}
            </div>

            {/* 사용자 화면 미리보기 */}
            <div className="flow_preview_panel">
              <div className="flow_detail_header">
                <span className="flow_detail_label">사용자 화면 미리보기</span>
                <button
                  type="button"
                  className="flow_preview_refresh_btn"
                  onClick={handlePreviewRefresh}
                  aria-label="미리보기 새로고침"
                >
                  ↻ 새로고침
                </button>
              </div>

              <div className="flow_preview_frame">
                <ChatBotPreview ref={previewRef} flatMenuList={flatList} selectedPath={selectedPath} />
              </div>
            </div>
          </div>

        </div>
      )}
      </div>

      {/* 등록/수정 모달 */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        titleId="chatMenuFormTitle"
        title={editTarget ? '메뉴 수정' : '메뉴 등록'}
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={closeForm}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" disabled={submitting} onClick={submitForm}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </>
        }
      >
        <div>
          {form.pno != null && (
            <p className="cell_sub" style={{ marginBottom: 12 }}>
              상위 메뉴 번호: {form.pno} (STEP{form.step})
            </p>
          )}
          {form.pno == null && !editTarget && (
            <p className="cell_sub" style={{ marginBottom: 12 }}>
              최상위(STEP1) 메뉴로 등록됩니다.
            </p>
          )}

          {errors.step && <div className="form_hint error" style={{ marginBottom: 12 }}>{errors.step}</div>}

          <div className="form_group">
            <label className="form_label" htmlFor="cm_label">
              선택지 텍스트<span className="req">*</span>
            </label>
            <div className="form_control">
              <input
                id="cm_label"
                name="label"
                type="text"
                className={`form_input ${errors.label ? 'is_error' : ''}`}
                value={form.label}
                onChange={onChange}
              />
              <LabelCounter value={form.label} />
              {errors.label && <div className="form_hint error">{errors.label}</div>}
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="cm_answer">
              답변 (클릭 시 노출, 최상위는 생략 가능)
            </label>
            <div className="form_control">
              <textarea
                id="cm_answer"
                name="answer"
                className={`form_textarea ${errors.answer ? 'is_error' : ''}`}
                style={{ minHeight: 120 }}
                value={form.answer ?? ''}
                onChange={onChange}
              />
              {errors.answer && <div className="form_hint error">{errors.answer}</div>}
            </div>
          </div>

          <div className="form_group">
            <label className="form_label" htmlFor="cm_vseq">
              노출 순서
            </label>
            <div className="form_control">
              <input
                id="cm_vseq"
                name="vseq"
                type="number"
                className="form_input"
                style={{ maxWidth: 120 }}
                value={form.vseq}
                onChange={onChange}
              />
            </div>
          </div>

          <div className="form_group">
            <div className="form_label">사용 여부</div>
            <div className="form_control">
              <div className="form_check">
                <input
                  type="checkbox"
                  id="cm_useyn"
                  checked={form.useyn === 'Y'}
                  onChange={(e) => setForm((prev) => ({ ...prev, useyn: e.target.checked ? 'Y' : 'N' }))}
                />
                <label htmlFor="cm_useyn" className="b_title">
                  사용함 (해제 시 챗봇 목록에서 숨김)
                </label>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 삭제 모달 — 기존 ConfirmDeleteModal 재사용 */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={submitDelete}
        targetLabel={deleteTarget?.label}
        title="메뉴를 삭제하시겠습니까?"
        description="하위 선택지(STEP2, STEP3)까지 모두 함께 삭제됩니다."
        requirePassword={false}
        loading={deleting}
      />

      {/* 문서 삭제 모달 */}
      <ConfirmDeleteModal
        open={docDeleteTarget !== null}
        onClose={() => setDocDeleteTarget(null)}
        onConfirm={submitDocDelete}
        targetLabel={docDeleteTarget?.filename}
        title="문서를 삭제하시겠습니까?"
        description="이 문서로 AI가 생성한 옵션메뉴도 함께 삭제됩니다. 다른 문서로 만든 메뉴는 유지됩니다."
        requirePassword={false}
        loading={docDeleting}
      />

      {/* 문서 일괄삭제 모달 */}
      <ConfirmDeleteModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={submitBulkDocDelete}
        targetLabel={`선택한 문서 ${checkedDocNos.length}개`}
        title="선택한 문서를 삭제하시겠습니까?"
        description="각 문서로 AI가 생성한 옵션메뉴도 함께 삭제됩니다."
        requirePassword={false}
        loading={docDeleting}
      />

      {/* 하위 메뉴 추천 결과 안내 — 만들지 못한 문서 / 자리가 없어 넣지 않은 섹션 */}
      <Modal
        open={resultNotice !== null}
        onClose={() => setResultNotice(null)}
        titleId="chatMenuResultNoticeTitle"
        title="하위 메뉴 추천 결과"
        footer={
          <button type="button" className="btn btn_md btn_primary" onClick={() => setResultNotice(null)}>
            확인
          </button>
        }
      >
        {resultNotice && (
          <div className="chatmenu_notice">
            {resultNotice.skipped.length > 0 && (
              <section className="chatmenu_notice_block is_error">
                <h4>메뉴를 만들지 못한 문서 <span>{resultNotice.skipped.length}개</span></h4>
                <p>아래 문서는 하위 메뉴를 만들지 못해 기존 메뉴를 그대로 유지했습니다.</p>
                <ul>
                  {resultNotice.skipped.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </section>
            )}
            {resultNotice.dropped.length > 0 && (
              <section className="chatmenu_notice_block">
                <h4>메뉴에 넣지 않은 섹션 <span>{resultNotice.dropped.length}개</span></h4>
                <p>최상위 메뉴 하나에 하위 메뉴는 최대 5개라, 중요도가 낮은 섹션은 넣지 않았습니다.</p>
                <ul>
                  {resultNotice.dropped.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <p className="chatmenu_notice_tip">필요하면 최상위 메뉴를 나누거나 메뉴 구성에서 직접 추가해 주세요.</p>
              </section>
            )}
          </div>
        )}
      </Modal>

      {/* 매뉴얼 전체 다시 생성 확인 */}
      <Modal
        open={regenConfirmOpen}
        onClose={() => setRegenConfirmOpen(false)}
        titleId="chatMenuRegenTitle"
        title="하위 메뉴를 다시 추천받으시겠습니까?"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={() => setRegenConfirmOpen(false)}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={handleRegenerateAll}>
              다시 추천
            </button>
          </>
        }
      >
        <div className="chatmenu_replace_plan">
          <p>첨부된 매뉴얼 {docs.length}개로 AI가 만든 하위 메뉴를 모두 다시 만듭니다.</p>
          <p className="cell_sub">
            회원 등급 같은 내부 정보 제외, 긴 제목 요약 등 바뀐 규칙이 기존 AI 메뉴에도 적용됩니다.
            관리자가 직접 만든 메뉴는 그대로 유지됩니다.
          </p>
          <p className="form_hint chatmenu_hint_info">
            다시 만든 메뉴는 비공개로 저장되므로, 생성이 끝나면 [일괄 공개]로 다시 공개해야 사용자 화면에 보입니다.
          </p>
        </div>
      </Modal>

      {/* 최상위 메뉴 교체 확인 */}
      <Modal
        open={replaceConfirmOpen}
        onClose={() => setReplaceConfirmOpen(false)}
        titleId="chatMenuReplaceTitle"
        title="최상위 메뉴를 교체하시겠습니까?"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={() => setReplaceConfirmOpen(false)}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" disabled={registering} onClick={handleRegisterSuggestions}>
              {registering ? '교체 중...' : '교체'}
            </button>
          </>
        }
      >
        <div className="chatmenu_replace_plan">
          {replacePlan.kept.length > 0 && <p>유지: {replacePlan.kept.join(', ')}</p>}
          {replacePlan.added.length > 0 && <p>추가: {replacePlan.added.join(', ')}</p>}
          {replacePlan.removed.length > 0 && (
            <p className="form_hint error">삭제: {replacePlan.removed.join(', ')} — 하위메뉴까지 모두 삭제됩니다.</p>
          )}
          <p className="cell_sub">교체 후 매뉴얼 전체가 [하위 메뉴 AI 추천] 대상이 되어, 새 메뉴 구성에 맞게 다시 분류됩니다.</p>
        </div>
      </Modal>

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}