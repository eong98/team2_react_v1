import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { axiosInstance, set_focus } from '../../../../utils/Tool';
import { AlertModal, ConfirmDeleteModal, Modal, PageHeader } from '../../../../components/ui';
import type { ChatMenuRequest, ChatMenuTypes } from '../../../../components/ts/ChatMenu';
import {
  uploadManualDoc,
  updateManualDoc,
  getManualDocs,
  deleteManualDoc,
  deleteManualDocs,
  isGenerateAvailable,
  startGenerateMenu,
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
      {[...value].length}자 · {bytes} / {LABEL_MAX_BYTES} byte (한글 최대 약 33자)
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
  const suggesting = generating && jobKind === 'suggest';
  const jobTitle = jobKind === 'suggest' ? '최상위 메뉴 추천' : 'AI 옵션생성';
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
      .catch((err) => console.error('첨부문서 목록 조회 실패:', err))
      .finally(() => setDocsLoading(false));
  };

  const loadGenerateAvailable = () => {
    isGenerateAvailable()
      .then((available) => setGenerateAvailable(available))
      .catch((err) => console.error('AI생성 가능여부 조회 실패:', err));
  };

  /** 생성 결과 반영 — 벡터화 실패가 있으면 미리보기 대신 재시도 안내 */
  const applyGenerateResult = (result: GenerateMenuResult, showAlert: boolean) => {
    const skipped = result.skippedDocs ?? [];
    const dropped = result.droppedSections ?? [];
    if (showAlert && (skipped.length > 0 || dropped.length > 0)) {
      const lines: string[] = [];
      if (skipped.length > 0) lines.push(`다음 문서는 옵션을 만들지 못해 기존 메뉴를 유지했습니다: ${skipped.join(', ')}`);
      if (dropped.length > 0) {
        // 오류가 아니라 제한에 따른 정리 결과 → 안내로 표시
        lines.push(
          `최상위 메뉴 하나에 하위메뉴는 최대 5개라, 중요도가 낮은 다음 섹션은 메뉴에 넣지 않았습니다.`,
          ...dropped.map((d) => `· ${d}`),
          '필요하면 최상위 메뉴를 나누거나 직접 추가해주세요.',
        );
      }
      setAlert({ message: lines.join('\n'), variant: skipped.length > 0 ? 'error' : 'info' });
    }
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
        const title = kind === 'suggest' ? '최상위 메뉴 추천' : 'AI 옵션생성';
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
      .catch((err) => console.error('AI 옵션생성 상태 조회 실패:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 진행 중이면 1초마다 서버 상태 폴링
  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => {
      getGenerateMenuStatus()
        .then((st) => applyJobStatus(st))
        .catch((err) => console.error('AI 옵션생성 상태 조회 실패:', err));
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating]);

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

  // 관리자가 등록한 최상위 메뉴 — [AI 옵션생성]은 매뉴얼 섹션을 이 메뉴들 아래로 분류한다
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
      lines.push('이제 [AI 옵션생성]을 실행하면 매뉴얼이 새 메뉴 구성에 맞게 다시 분류됩니다.');
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
   * .md만 받고, 한 개씩 순서대로 올린다(같은 파일명 교체 처리가 겹치지 않게). 벡터화는 [AI 옵션생성] 때 수행.
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

  const handleGenerate = async () => {
    if (!generateAvailable || generating) return;

    resultHandled.current = false;
    setGeneratedTree(null);
    setVectorizeFailedDocs([]);
    setServerPercent(0);
    setDisplayPercent(0);
    setElapsedSec(0);
    setProgressLogs([{ key: 'request', message: 'AI 옵션생성 요청 중...', state: 'running' }]);
    setJobKind('generate');
    setJobStatus('running');
    try {
      // 서버가 백그라운드로 시작하고 즉시 응답 → 이후 진행은 폴링으로 받음
      applyJobStatus(await startGenerateMenu());
    } catch (err) {
      console.error('AI 옵션생성 시작 실패:', err);
      setJobStatus('idle');
      setProgressLogs([]);
      setAlert({ message: 'AI 옵션생성을 시작하지 못했습니다.', variant: 'error' });
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
        setAlert({ message: '벡터화가 완료되었습니다. 생성된 옵션을 확인해주세요.', variant: 'success' });
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

  return (
    <section className="view active">
      <div className={lockClass} inert={generating}>
        <PageHeader
          title="챗봇 옵션 메뉴 관리"
          description="옵션형 상담 선택지 트리를 관리합니다 (최대 3단계)"
          createLabel="+ 직접 추가"
          onCreate={() => openCreateModal(null)}
        />
      </div>

      {/* ===================== 옵션형 메뉴 자동생성 ===================== */}
      <div className="chatmenu_generate_section">
        <div className="flow_detail_header">
          <span className="flow_detail_label">옵션형 메뉴 자동생성</span>
        </div>

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
            className="btn btn_sm btn_ghost"
            onClick={handleSuggest}
            disabled={generating || docs.length === 0}
          >
            {suggesting ? '최상위 메뉴 추천 중...' : '최상위 메뉴 AI 추천'}
          </button>
          <button
            type="button"
            className="btn btn_sm btn_primary"
            onClick={handleGenerate}
            disabled={!generateAvailable || generating || adminRoots.length === 0}
          >
            {generating && jobKind === 'generate' ? 'AI 옵션생성 중...' : docs.length > 0 && !generateAvailable ? '매뉴얼 수정' : 'AI 옵션생성'}
          </button>
          <span className="cell_sub">
            {adminRoots.length === 0
              ? '최상위 메뉴를 먼저 등록해야 AI 옵션생성을 할 수 있습니다 (AI 추천 가능)'
              : `최상위 메뉴 ${adminRoots.length}/${MAX_TOP_MENUS}개 · 매뉴얼 섹션은 이 메뉴들 아래로 분류됩니다`}
          </span>
        </div>


        {generating && (
          <div className="form_hint chatmenu_lock_notice">
            {jobTitle} 중에는 매뉴얼 첨부·수정·삭제, 옵션 메뉴 추가·수정·삭제·공개를 할 수 없습니다.
          </div>
        )}

        {/* AI 옵션생성 진행률 — 완료된 단계는 취소선, 진행 중 단계는 강조 */}
        {(generating || progressLogs.length > 0) && (
          <div className="chatmenu_progress" aria-live="polite">
            <div className="chatmenu_progress_head">
              <span>
                {generating ? `${jobTitle} 진행 중` : jobStatus === 'error' ? `${jobTitle} 실패` : `${jobTitle} 완료`}
              </span>
              <span>
                {Math.floor(displayPercent)}% · {generating ? `${formatElapsed(elapsedSec)} 경과` : `소요 ${formatElapsed(elapsedSec)}`}
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
            <div className="chatmenu_suggest_head">
              <span className="flow_detail_label">최상위 메뉴 추천</span>
              <span className="cell_sub">
                선택 {checkedSuggestions.length} / 최대 {MAX_TOP_MENUS}개 · 매뉴얼 섹션 {suggestInfo.totalSections}개 /
                들어갈 자리 {checkedSuggestions.length * 5}칸
              </span>
            </div>
            <p className="cell_sub">
              누를 때마다 새로 추천합니다. 등록하면 최상위 메뉴 전체가 선택한 메뉴로 교체됩니다
              {suggestInfo.existing.length > 0 && ` (현재: ${suggestInfo.existing.join(', ')})`}.
            </p>
            {checkedSuggestions.length * 5 < suggestInfo.totalSections && (
              <div className="form_hint chatmenu_hint_info">
                안내: 메뉴 하나에 하위메뉴가 최대 5개라, 이대로면 중요도가 낮은 섹션 일부는 메뉴에 들어가지 않습니다.
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
                          className="form_input"
                          value={sg.label}
                          onChange={(e) => updateSuggestion(i, { label: cutToBytes(e.target.value) })}
                        />
                        <LabelCounter value={sg.label} />
                        <input
                          type="text"
                          className="form_input"
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
              <button type="button" className="btn btn_sm btn_ghost" onClick={() => setSuggestInfo(null)}>
                닫기
              </button>
              <button
                type="button"
                className="btn btn_sm btn_primary"
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
                <span className="cell_sub">{doc.cdate}</span>
                {doc.updateYn === 'N' && <span className="badge warn">미반영</span>}
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
              옵션 생성은 완료되었으나 벡터화가 실패하였습니다. 아래 문서의 벡터화를 다시 시도한 뒤 생성된 옵션을 확인해주세요.
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

        {/* 생성 결과 미리보기 (label/answer 직접 수정 가능) */}
        {visibleGenerated.length > 0 && (
          <div className="chatmenu_generated_preview">
            <div className="chatmenu_generated_preview_head">
              <p className="b_title">
                생성된 옵션을 검토한 뒤, [공개] 버튼을 눌러야 사용자 화면에 노출됩니다. 누르지 않으면 비공개 상태로 유지됩니다.
              </p>
              <button
                type="button"
                className="btn btn_sm btn_primary"
                onClick={handlePublishAllGenerated}
                disabled={publishing}
              >
                {publishing ? '공개 중...' : `일괄 공개 (${visibleGenerated.length})`}
              </button>
            </div>
            {visibleGenerated.map((top) => (
              <div key={top.no} className="chatmenu_generated_top">
                <div className="chatmenu_generated_top_header">
                  <span className="chatmenu_step_badge">STEP1</span>
                  <span className="flow_detail_title">{top.label}</span>
                  <button
                    type="button"
                    className="btn btn_xsm btn_primary"
                    onClick={() => handlePublishGenerated(top)}
                    disabled={publishing}
                  >
                    공개
                  </button>
                </div>

                {top.children.length === 0 && top.answer && (
                  <p className="cell_sub" style={{ marginLeft: 8, whiteSpace: 'pre-wrap' }}>
                    {top.answer}
                  </p>
                )}

                {top.children.map((mid) => (
                  <div key={mid.no} className="chatmenu_generated_mid">
                    <div className="chatmenu_generated_mid_label">
                      <span className="chatmenu_step_badge">STEP2</span> {mid.label}
                      {mid.filename && <span className="cell_sub">· {mid.filename}</span>}
                    </div>

                    {mid.leaves.length === 0 && (
                      <div className="chatmenu_generated_leaf">
                        <textarea
                          className="form_textarea"
                          style={{ minHeight: 60 }}
                          value={mid.answer ?? ''}
                          onChange={(e) => updateGeneratedMidAnswer(top.no, mid.no, e.target.value)}
                        />
                      </div>
                    )}

                    {mid.leaves.map((leaf, leafIdx) => (
                      <div key={leaf.no} className="chatmenu_generated_leaf">
                        <input
                          type="text"
                          className="form_input"
                          value={leaf.label}
                          onChange={(e) => updateGeneratedLeafText(top.no, mid.no, leafIdx, 'label', cutToBytes(e.target.value))}
                        />
                        <LabelCounter value={leaf.label} />
                        <textarea
                          className="form_textarea"
                          style={{ minHeight: 60 }}
                          value={leaf.answer}
                          onChange={(e) => updateGeneratedLeafText(top.no, mid.no, leafIdx, 'answer', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ===================== 기존 트리 관리 ===================== */}
      {loading ? (
        <p className="b_title">불러오는 중...</p>
      ) : (
        <div className={`flow_wrap ${lockClass}`} inert={generating}>
          <div className="flow_columns">
            {columns.map((col, i) => (
              <div key={i} className="flow_column">
                <div className="flow_column_title">STEP{i + 1}</div>
                {col.nodes.length === 0 ? (
                  <div className="flow_empty">등록된 메뉴가 없습니다.</div>
                ) : (
                  col.nodes.map((n) => (
                    <button
                      key={n.no}
                      type="button"
                      className={`flow_node ${selectedPath[i]?.no === n.no ? 'active' : ''}`}
                      onClick={() => handleSelectAt(i, n)}
                    >
                      <span className="flow_node_label">{n.label}</span>
                      {n.aiyn === 'Y' && <span className="badge info">AI</span>}
                      {n.useyn === 'N' && <span className="cell_sub">(비공개)</span>}
                      {n.children.length > 0 && <span className="flow_node_arrow">›</span>}
                    </button>
                  ))
                )}
              </div>
            ))}
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
                    {lastSelected.useyn === 'N' && <span className="cell_sub">(비공개)</span>}
                  </div>

                  <div className="flow_detail_answer">{lastSelected.answer ?? '서비스 준비 중 입니다.'}</div>

                  <div className="flow_detail_actions">
                    {lastSelected.step < 3 && (
                      <button type="button" className="btn btn_xsm btn_ghost" onClick={() => openCreateModal(lastSelected)}>
                        하위추가
                      </button>
                    )}
                    <button type="button" className="btn btn_xsm btn_ghost" onClick={() => openEditModal(lastSelected)}>
                      수정
                    </button>
                    <button type="button" className="btn btn_xsm btn_ghost" onClick={() => toggleUseyn(lastSelected)}>
                      {lastSelected.useyn === 'Y' ? '비공개로 전환' : '공개로 전환'}
                    </button>
                    <button type="button" className="btn btn_xsm btn_danger_outline" onClick={() => setDeleteTarget(lastSelected)}>
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
          <p className="cell_sub">교체 후 매뉴얼 전체가 [AI 옵션생성] 대상이 되어, 새 메뉴 구성에 맞게 다시 분류됩니다.</p>
        </div>
      </Modal>

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}