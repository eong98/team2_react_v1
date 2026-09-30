import React, { useEffect, useRef, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import {
  UNSATISFY_REASONS,
  formatMessageDate,
  formatMessageTime,
  isSameDate,
  type ChatBubble,
  type ChatStage,
  type ChatSessionResponse,
  type ChatLogEntry,
  type ChatActionResult,
  type ChatStepRequest,
  getMessage,
  SYSTEM_MESSAGES,
  numberToEndFlow,
} from '../../ts/ChatBot';
import type { ChatMenuTypes } from '../../ts/ChatMenu';
import { getOrCreateGno } from '../../ts/ChatGuest';
import { aiChat, endAiConsultDivider, startAiConsult, summarizeChat } from './ChatApi';
import AlertModal from '../common/AlertModal';

/* ---------------------------------------------------------------------
   ChatRoom Props 정의
--------------------------------------------------------------------- */
interface ChatRoomProps {
  onClose: () => void;
  onBackToList: () => void;
  sessionId: string | null;
  refreshSignal: { sno: string; ts: number } | null; // 외부 신호(알림) 수신용
  onStartAiResponding: (sno: string) => void;        // 목록/FAB 표시용 — "이 세션이 응답 대기 중"임을 부모에게 알림
  onAiRespondingDone: () => void;                    // 목록/FAB 표시용 — 응답 완료를 부모에게 알림
}

export default function ChatRoom({
  onClose,
  onBackToList,
  sessionId,
  refreshSignal,
  onStartAiResponding,
  onAiRespondingDone,
}: ChatRoomProps) {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession(); // 로그인 사용자 회원번호 (비회원이면 null)

  /* ---------------------------------------------------------------------
     Ref 관리
     - sessionIdRef: 비동기 콜백/이벤트 내에서 최신 세션 ID를 안전하게 참조
     - bottomRef: 대화창 자동 최하단 스크롤용
     - inputRef: AI 응답 종료 후 입력창 포커스 제어용
     - intervalRef: 폴링 타이머 인스턴스 저장용 (언마운트 시 cleanup)
  --------------------------------------------------------------------- */
  const sessionIdRef = useRef<string | null>(sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------------------------------------------------------------------
     State 관리
  --------------------------------------------------------------------- */
  const [stage, setStage] = useState<ChatStage>('INTRO'); // INTRO, OPTION, AI 등
  const [consultStarted, setConsultStarted] = useState(false);

  const [rootMenus, setRootMenus] = useState<ChatMenuTypes[]>([]);
  const [loadingRoot, setLoadingRoot] = useState(false);

  const [currentOptions, setCurrentOptions] = useState<ChatMenuTypes[]>([]);
  const [optionLoading, setOptionLoading] = useState(false);

  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [endFlow, setEndFlow] = useState<string | null>(null);

  const [sessionEnded, setSessionEnded] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  /** 화면 최하단 스크롤 헬퍼 */
  const scrollToBottom = () => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  /* ---------------------------------------------------------------------
     [Effect] 실시간 메시지 수신 신호(refreshSignal) 처리
  --------------------------------------------------------------------- */
  useEffect(() => {
    if (!refreshSignal || !sessionIdRef.current) return;
    if (refreshSignal.sno !== sessionIdRef.current) return; // 다른 세션 신호면 무시

    // 현재 열려있는 세션의 로그를 다시 로드하여 최신 상태 동기화
    axiosInstance
      .get<ChatLogEntry[]>(`/chat_log/session/${sessionIdRef.current}`)
      .then((res) => {
        const restoredBubbles: ChatBubble[] = res.data.map((log) => ({
          id: String(log.no),
          sender: log.sender,
          content: log.content,
          mtype: log.mtype,
          createdAt: log.cdate,
        }));
        setBubbles(restoredBubbles);
        scrollToBottom();
      })
      .catch((err) => console.error('실시간 대화 로그 갱신 실패:', err));
  }, [refreshSignal]);

  /* ---------------------------------------------------------------------
     [Effect] AI 응답 완료 시 입력창 자동 포커스
  --------------------------------------------------------------------- */
  useEffect(() => {
    if (!aiLoading) {
      inputRef.current?.focus();
    }
  }, [aiLoading]);

  /* ---------------------------------------------------------------------
     [Effect] 언마운트 시 타이머 Clean-up (메모리 누수 방지)
  --------------------------------------------------------------------- */
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (aiPollIntervalRef.current) clearInterval(aiPollIntervalRef.current);
    };
  }, []);

  /* ---------------------------------------------------------------------
     공통 헬퍼 메서드
  --------------------------------------------------------------------- */
  /** 백엔드 로그 데이터를 말풍선 배열(bubbles)에 추가 */
  const appendLogs = (logs: ChatLogEntry[]) => {
    const newBubbles: ChatBubble[] = logs.map((log) => ({
      id: String(log.no),
      sender: log.sender,
      content: log.content,
      mtype: log.mtype,
      createdAt: log.cdate,
    }));
    setBubbles((prev) => [...prev, ...newBubbles]);
    scrollToBottom();
  };

  /** 화면상에만 표시되는 프론트엔드 전용 구분선 즉시 추가 */
  const showDividerNow = (content: string) => {
    setBubbles((prev) => [
      ...prev,
      { id: `divider-${Date.now()}`, sender: 2, content, mtype: 5, createdAt: new Date().toISOString() },
    ]);
    scrollToBottom();
  };

  /** 통합 단계를 진행하는 공통 step API 호출 */
  const callStep = async (payload: ChatStepRequest): Promise<ChatActionResult | null> => {
    if (!sessionIdRef.current) return null;
    try {
      const res = await axiosInstance.put<ChatActionResult>(`/chat_session/${sessionIdRef.current}/step`, payload);
      appendLogs(res.data.logs);
      return res.data;
    } catch (err) {
      console.error('상담 진행 처리 실패:', err);
      return null;
    }
  };

  /* ---------------------------------------------------------------------
     [Effect] 초기 진입 시 세션 복원 또는 루트 메뉴 조회
  --------------------------------------------------------------------- */
  useEffect(() => {
    if (sessionId) {
      axiosInstance
        .get<ChatSessionResponse>(`/chat_session/${sessionId}`)
        .then((res) => restoreFromSession(res.data))
        .catch((err) => console.error('세션 조회 실패:', err));
    } else {
      loadRootMenus();
      setBubbles([{ id: 'intro', sender: 2, content: '안녕하세요! 무엇을 도와드릴까요?', createdAt: new Date().toISOString() }]);
      scrollToBottom();
    }
  }, [sessionId]);

  /** 최상위 질문 카테고리 메뉴 불러오기 */
  const loadRootMenus = () => {
    setLoadingRoot(true);
    axiosInstance
      .get<ChatMenuTypes[]>('/chat_menu/root')
      .then((res) => setRootMenus(res.data))
      .catch((err) => console.error('선택지 조회 실패:', err))
      .finally(() => setLoadingRoot(false));
  };

  /** 기존 세션 정보 및 로그 복원 */
  const restoreFromSession = async (session: ChatSessionResponse) => {
    sessionIdRef.current = session.no;
    setConsultStarted(session.cmode !== 2);
    setSessionEnded(session.cmode === 2);
    setEndFlow(numberToEndFlow(session.endflow));

    if (session.endflow === 6) {
      // 로딩 표시/화면 갱신은 이 컴포넌트(로컬)가 직접 담당한다.
      // onStartAiResponding은 목록/FAB 표시용으로만 부모에게 알리는 것.
      setAiLoading(true);
      onStartAiResponding(session.no);
      pollForAiResponse(session.no);
    }

    // 세션 모드에 따른 단계 설정
    // ENDFLOW=6(AI 응답 생성 중)이면 CMODE 전환이 아직 안 끝났을 가능성에 대비해
    // (백엔드가 CMODE를 LLM 호출 전에 먼저 바꾸도록 수정했지만, 혹시 모를 타이밍
    // 이슈에 대한 이중 방어) CMODE 값과 무관하게 무조건 AI 단계로 취급한다.
    if (session.cmode === 1 || session.endflow === 6) {
      setStage('AI');

    } else if (session.cno) {
      setStage('OPTION');
      try {
        const menuRes = await axiosInstance.get<ChatMenuTypes>(`/chat_menu/${session.cno}`);
        if (menuRes.data.hasChildren) {
          const childRes = await axiosInstance.get<ChatMenuTypes[]>(`/chat_menu/${session.cno}/children`);
          setCurrentOptions(childRes.data);
        }
      } catch (err) {
        // 관리자가 메뉴를 수정/재생성해서 머물던 메뉴가 없어진 경우 — 처음 선택지로 돌려보냄
        console.error('이전 메뉴 조회 실패(삭제된 메뉴일 수 있음):', err);
        setStage('INTRO');
        setCurrentOptions([]);
        if (rootMenus.length === 0) loadRootMenus();
      }
    } else {
      setStage('INTRO');
      setCurrentOptions([]);
      setEndFlow(null);
      if (rootMenus.length === 0) loadRootMenus();
    }

    // AI 요약 또는 답변 생성 진행 중인 상태인 경우 폴링 시작
    if (session.endflow === 5) {
      setSummarizing(true);
      pollForSummaryResult(session.no);
    }

    try {
      const logRes = await axiosInstance.get<ChatLogEntry[]>(`/chat_log/session/${session.no}`);
      const restoredBubbles: ChatBubble[] = logRes.data.map((log) => ({
        id: String(log.no),
        sender: log.sender,
        content: log.content,
        mtype: log.mtype,
        createdAt: log.cdate,
      }));
      setBubbles(restoredBubbles);
    } catch (err) {
      console.error('대화 로그 조회 실패:', err);
    }

    scrollToBottom();

  };

  /* ---------------------------------------------------------------------
     폴링 로직 (AI 답변 생성 및 대화 요약 상태)
  --------------------------------------------------------------------- */
  /** AI 답변 생성이 완료될 때까지 주기적으로 상태 확인 (재진입 시 로딩/화면 복원용) */
  const pollForAiResponse = (sno: string) => {
    if (aiPollIntervalRef.current) clearInterval(aiPollIntervalRef.current);

    aiPollIntervalRef.current = setInterval(async () => {
      try {
        const res = await axiosInstance.get<ChatSessionResponse>(`/chat_session/${sno}`);
        if (res.data.endflow !== 6) {
          if (aiPollIntervalRef.current) clearInterval(aiPollIntervalRef.current);
          aiPollIntervalRef.current = null;
          setAiLoading(false);
          onAiRespondingDone();

          // 완료됐으니 최신 로그를 다시 불러와서 화면에 답변을 표시
          const logRes = await axiosInstance.get<ChatLogEntry[]>(`/chat_log/session/${sno}`);
          const restoredBubbles: ChatBubble[] = logRes.data.map((log) => ({
            id: String(log.no),
            sender: log.sender,
            content: log.content,
            mtype: log.mtype,
            createdAt: log.cdate,
          }));
          setBubbles(restoredBubbles);
          setEndFlow(numberToEndFlow(res.data.endflow));
          scrollToBottom();
        }
      } catch (err) {
        console.error('AI 폴링 확인 실패:', err);
      }
    }, 2000);
  };

  /** AI 대화 요약이 완료될 때까지 주기적으로 상태 확인 */
  const pollForSummaryResult = (sno: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await axiosInstance.get<ChatSessionResponse>(`/chat_session/${sno}`);
        if (res.data.endflow !== 5) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setSummarizing(false);

          if (res.data.stitle) {
            const checkUrl = mno ? 'user' : 'board';
            onClose();
            navigate(`/${checkUrl}/qa/new`, { state: { title: res.data.stitle, content: '', type: 0 } });
          }
        }
      } catch (err) {
        console.error('요약 결과 폴링 실패:', err);
      }
    }, 2000);
  };

  /* ---------------------------------------------------------------------
     이벤트 핸들러
  --------------------------------------------------------------------- */
  /** 세션이 없으면 생성, 이미 존재하면 ID 반환 */
  const ensureSession = async (cmode: 0 | 1, cno: number | null, withGreeting: boolean = true): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const params: Record<string, string> = {};
    if (withGreeting) {
      params.greeting = getMessage(SYSTEM_MESSAGES, 5);
    }

    const res = await axiosInstance.post<ChatActionResult>(
      '/chat_session',
      { mno: mno || null, gno: mno ? null : getOrCreateGno(), channel: 10, cmode, cno },
      { params },
    );

    sessionIdRef.current = res.data.no!;
    setBubbles((prev) => prev.filter((b) => b.id !== 'intro'));
    if (res.data.logs?.length) appendLogs(res.data.logs);

    return sessionIdRef.current;
  };

  /** 최상위 카테고리 클릭 */
  const handleSelectRoot = async (menu: ChatMenuTypes) => {
    if (optionLoading) return; // 연타 시 세션/로그 중복 생성 방지
    setOptionLoading(true);
    try {
      setConsultStarted(true);
      setStage('OPTION');

      const no = await ensureSession(0, menu.no);
      const actionRes = await axiosInstance.put<ChatActionResult>(`/chat_session/${no}/select`, { cno: menu.no });
      appendLogs(actionRes.data.logs);
      setCurrentOptions(actionRes.data.nextOptions ?? []);
    } catch (err) {
      console.error('메뉴 선택 실패:', err);
    } finally {
      setOptionLoading(false);
    }
  };

  /** 하위 카테고리 클릭 */
  const handleSelectChild = async (menu: ChatMenuTypes) => {
    if (!sessionIdRef.current || optionLoading) return;
    setOptionLoading(true);
    try {
      const actionRes = await axiosInstance.put<ChatActionResult>(`/chat_session/${sessionIdRef.current}/select`, { cno: menu.no });
      appendLogs(actionRes.data.logs);
      setCurrentOptions(actionRes.data.nextOptions ?? []);
    } catch (err) {
      console.error('메뉴 선택 실패:', err);
    } finally {
      setOptionLoading(false);
    }
  };

  /** 처음으로(다른 질문하기) 클릭 */
  const handleOtherQuestion = async () => {
    const wasAi = stage === 'AI';

    setStage('INTRO');
    setCurrentOptions([]);
    setEndFlow(null);
    setSessionEnded(false);
    if (rootMenus.length === 0) loadRootMenus();

    const greeting = getMessage(SYSTEM_MESSAGES, 6);

    if (sessionIdRef.current) {
      try {
        // AI 상담 모드였던 경우, 구분선을 먼저 DB에 확실히 저장한 뒤 다음 안내 로그 생성
        if (wasAi) {
          showDividerNow('여기까지가 AI 상담입니다');
          await endAiConsultDivider(sessionIdRef.current);
        }

        const actionRes = await axiosInstance.put<ChatActionResult>(
          `/chat_session/${sessionIdRef.current}/back-intro`,
          null,
          { params: { greeting } },
        );
        appendLogs(actionRes.data.logs);
      } catch (err) {
        console.error('처음으로 전환 실패:', err);
      }
    }
    scrollToBottom();
  };

  /** AI 상담으로 전환 */
  const handleAiConsult = async () => {
    setConsultStarted(true);
    setStage('AI');
    setEndFlow(null);
    setSessionEnded(false);

    // 사용자 클릭 말풍선 및 구분선 낙관적 UI 업데이트
    setBubbles((prev) => [
      ...prev,
      { id: `temp-click-${Date.now()}`, sender: 0, content: 'AI 상담', createdAt: new Date().toISOString() },
    ]);
    showDividerNow('여기부터 AI 상담입니다');
    scrollToBottom();

    try {
      if (!sessionIdRef.current) {
        await ensureSession(1, null, false);
      }

      setAiLoading(true);
      onStartAiResponding(sessionIdRef.current!);
      const result = await startAiConsult(sessionIdRef.current!);
      appendLogs(result.logs);
      scrollToBottom();
    } catch (err) {
      console.error('AI 상담 전환 실패:', err);
    } finally {
      setAiLoading(false);
      onAiRespondingDone();
    }
  };

  /** 텍스트 메시지 전송 (사용자 메시지 및 불만족 메모 입력) */
  const handleSendText = async () => {
    if (sessionEnded || aiLoading || !inputValue.trim() || !sessionIdRef.current) return;

    // 불만족 사유 메모 입력 단계인 경우
    if (endFlow === 'ASK_UNSATISFY_MEMO') {
      const smemo = inputValue;
      setInputValue('');
      const result = await callStep({ action: 3, smemo, systemMessage: getMessage(SYSTEM_MESSAGES, 2) });
      if (result) {
        setEndFlow(null);
        setSessionEnded(true);
        setConsultStarted(false);
      }
      return;
    }

    // 일반 AI 메시지 전송
    const userMsg = inputValue;
    setInputValue('');
    setEndFlow(null);

    // 낙관적 UI 업데이트 (사용자가 입력한 메시지 화면에 즉시 표시)
    setBubbles((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, sender: 0, content: userMsg, createdAt: new Date().toISOString() },
    ]);

    scrollToBottom();
    setAiLoading(true);
    onStartAiResponding(sessionIdRef.current!);

    try {
      const result = await aiChat(sessionIdRef.current, userMsg);
      appendLogs(result.logs);
      if (result.needsAdmin) {
        setEndFlow('FAIL_AI_ANSWER');
      }
    } catch (err) {
      console.error('AI 응답 실패:', err);
    } finally {
      // 성공/실패 상관없이 항상 로딩을 해제하고 부모(목록/FAB)에도 완료를 알림
      setAiLoading(false);
      onAiRespondingDone();
      scrollToBottom();
    }
  };

  /** 관리자 문의 버튼 클릭 */
  const handleEscalateToAdmin = async (e: React.MouseEvent) => {
    if (!sessionIdRef.current) return;

    // 1. e.currentTarget이 null이 되기 전에 label 문구를 먼저 변수에 저장!
    const labelText = e.currentTarget.textContent;

    try {
      // 1. AI 상담 모드인 경우 '여기까지가 AI 상담입니다' 구분선을 먼저 DB에 확실히 저장
      if (stage === 'AI') {
        showDividerNow('여기까지가 AI 상담입니다');
        // await를 붙여 구분선 API 처리가 완전히 끝날 때까지 기다립니다.
        await endAiConsultDivider(sessionIdRef.current);
      }

      // 2. 구분선 저장이 완류된 후 시스템 안내메시지(예/아니오) 요청 API 실행
      const result = await callStep({
        action: 4,
        label: labelText,
        systemMessage: getMessage(SYSTEM_MESSAGES, 3),
      });

      if (result) setEndFlow('ASK_ESCALATE_CONFIRM');
    } catch (err) {
      console.error('관리자 문의 전환 처리 실패:', err);
    }
  };

  /** 상담 종료 버튼 클릭 */
  const handleEnd = async (e: React.MouseEvent) => {
      if (!sessionIdRef.current) return;
      const labelText = e.currentTarget.textContent;

      try {
        // AI 상담 모드였던 경우, 구분선을 먼저 DB에 확실히 저장한 뒤 만족도 조사 안내 메시지 요청
        if (stage === 'AI') {
          showDividerNow('여기까지가 AI 상담입니다');
          await endAiConsultDivider(sessionIdRef.current);
        }

        const result = await callStep({
          action: 0,
          label: labelText,
          systemMessage: getMessage(SYSTEM_MESSAGES, 0),
        });

        if (result) setEndFlow('ASK_SATISFY');
      } catch (err) {
        console.error('상담 종료 처리 실패:', err);
      }
    };

  /** 관리자 연결 확인(예/아니오) 및 게시판 작성 이동 처리 */
  const handleEscalateConfirm = async (e: React.MouseEvent, goQa: boolean) => {
    const result = await callStep({ action: 5, goQa, label: e.currentTarget.textContent });
    if (!result) return;

    if (goQa && sessionIdRef.current) {
      setSummarizing(true);
      try {
        const summary = await summarizeChat(sessionIdRef.current);
        const checkUrl = mno ? 'user' : 'board';
        onClose();
        navigate(`/${checkUrl}/qa/new`, { state: { title: summary.title, content: summary.content, type: summary.type } });
        return;
      } catch (err) {
        console.error('대화 요약 실패:', err);
        setSummarizing(false);
        setEndFlow(null);
        setAlert({ message: '현재 AI 요약 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.', variant: 'error' });
      }
    }

    setEndFlow(null);

    if (result.sessionEnded) {
      setSessionEnded(true);
      setConsultStarted(false);
    }
  };

  /** 만족도 조사 응답 (만족/불만족) */
  const handleSatisfy = async (e: React.MouseEvent, value: 0 | 1) => {
    const systemMessage = value === 1 ? getMessage(SYSTEM_MESSAGES, 2) : getMessage(SYSTEM_MESSAGES, 1);
    const result = await callStep({ action: 1, satisfy: value, label: e.currentTarget.textContent, systemMessage });
    if (!result) return;

    if (result.sessionEnded) {
      setEndFlow(null);
      setSessionEnded(true);
      setConsultStarted(false);
    } else {
      setEndFlow('ASK_UNSATISFY_REASON');
    }
  };

  /** 불만족 사유 옵션 선택 */
  const handleSelectUnsatisfyReason = async (code: number, label: string) => {
    const systemMessage = code === 9 ? getMessage(SYSTEM_MESSAGES, 4) : getMessage(SYSTEM_MESSAGES, 2);
    const result = await callStep({ action: 2, sreason: code, label, systemMessage });
    if (!result) return;

    if (code === 9) {
      setEndFlow('ASK_UNSATISFY_MEMO');
    } else {
      setEndFlow(null);
      setSessionEnded(true);
      setConsultStarted(false);
    }
  };

  /** 엔터키 입력 처리 */
  const handleSendTextEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    handleSendText();
  };

  /* ---------------------------------------------------------------------
     렌더링 제어
  --------------------------------------------------------------------- */
  const headerTitle = stage === 'AI' ? 'AI 상담' : '알리미오 상담봇';
  // 입력 가능: AI 상담 중(대기 상태 없음/답변 실패 안내) 또는 불만족 사유 직접 입력 단계
  // 만족도·불만족 사유 선택·관리자 연결 확인 중에는 버튼으로만 진행해야 하므로 입력 잠금
  const inputEnabled =
    !sessionEnded &&
    !aiLoading &&
    ((stage === 'AI' && (endFlow === null || endFlow === 'FAIL_AI_ANSWER')) || endFlow === 'ASK_UNSATISFY_MEMO');

  /** 전체 말풍선 및 날짜 구분선 렌더링 */
  const renderBubbles = () => {
    const elements: JSX.Element[] = [];
    let lastDate: string | null = null;

    bubbles.forEach((b) => {
      // 날짜 변경 시 날짜 구분선 출력
      if (lastDate === null || !isSameDate(lastDate, b.createdAt)) {
        elements.push(
          <div key={`date-${b.id}`} className="chat_date_divider">
            <span>{formatMessageDate(b.createdAt)}</span>
          </div>,
        );
        lastDate = b.createdAt;
      }

      // 서버 시스템 메시지 구분선 예외 처리
      if ((SYSTEM_MESSAGES[7].label.includes(b.content) || SYSTEM_MESSAGES[8].label.includes(b.content)) && b.mtype === 5) {
        elements.push(
          <div key={b.id} className="chat_divider_line">
            <span>{b.content}</span>
          </div>,
        );
        return;
      }

      const senderLabel = b.sender === 1 ? '알리미' : b.sender === 2 ? '상담봇' : null;
      elements.push(
        <div key={b.id} className={`chat_bubble_row ${b.sender === 0 ? 'user' : 'system'}`}>
          {senderLabel && <span className="chat_sender_label">{senderLabel}</span>}
          <div className="chat_bubble_wrap">
            <div className={`chat_bubble ${b.sender === 0 ? 'user' : b.sender === 1 ? 'ai' : 'system'}`}>{b.content}</div>
            <span className="chat_bubble_time">{formatMessageTime(b.createdAt)}</span>
          </div>
        </div>,
      );
    });

    return elements;
  };

  return (
    <>
      {/* 챗봇 헤더 영역 */}
      <div className="chatbot_header">
        <button type="button" className="chatbot_list_btn" onClick={onBackToList} aria-label="목록으로">
          ☰
        </button>
        <div className="chatbot_header_title">
          <span className={`chatbot_status_dot ${sessionEnded ? 'ended' : 'active'}`} />
          <span>{headerTitle}</span>
        </div>
        <button type="button" className="chatbot_close_btn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      {/* 챗봇 대화 본문 영역 */}
      <div className="chatbot_body">
        {renderBubbles()}

        {/* INTRO 단계 카테고리 옵션 버튼 */}
        {stage === 'INTRO' && endFlow === null && !sessionEnded && (
          <div className="chat_options">
            {rootMenus.map((menu) => (
              <button key={menu.no} type="button" className="chat_option_btn" onClick={() => handleSelectRoot(menu)}>
                {menu.label}
              </button>
            ))}
          </div>
        )}

        {/* INTRO 단계 AI 바로 시작하기 버튼 */}
        {stage === 'INTRO' && !consultStarted && !sessionEnded && endFlow === null && (
          <>
            <div className="chat_ai_divider">
              <span>또는</span>
            </div>
            <button type="button" className="chat_ai_entry_btn" onClick={handleAiConsult}>
              ✨ AI에게 바로 물어보기
            </button>
          </>
        )}

        {stage === 'INTRO' && loadingRoot && <div className="chat_loading">불러오는 중...</div>}

        {/* OPTION 단계 하위 옵션 목록 */}
        {stage === 'OPTION' && currentOptions.length > 0 && endFlow === null && !sessionEnded && (
          <div className="chat_option_list">
            {currentOptions.map((opt) => (
              <button key={opt.no} type="button" className="chat_option_list_item" onClick={() => handleSelectChild(opt)}>
                <span>{opt.label}</span>
                <span className="chat_option_arrow">›</span>
              </button>
            ))}
          </div>
        )}

        {stage === 'OPTION' && optionLoading && <div className="chat_loading">불러오는 중...</div>}

        {/* AI 답변 실패 시 관리자 문의 버튼 */}
        {endFlow === 'FAIL_AI_ANSWER' && (
          <button type="button" className="chat_admin_btn" onClick={handleEscalateToAdmin}>
            관리자에게 문의하기
          </button>
        )}

        {/* 관리자 이관 확인 단계 */}
        {stage === 'AI' && endFlow === 'ASK_ESCALATE_CONFIRM' && (
          <div className="chat_options">
            <button type="button" className="chat_option_btn" onClick={(e) => handleEscalateConfirm(e, true)}>
              네
            </button>
            <button type="button" className="chat_option_btn" onClick={(e) => handleEscalateConfirm(e, false)}>
              아니오
            </button>
          </div>
        )}

        {/* 만족도 조사 단계 */}
        {endFlow === 'ASK_SATISFY' && (
          <div className="chat_options">
            <button type="button" className="chat_option_btn" onClick={(e) => handleSatisfy(e, 1)}>
              만족해요
            </button>
            <button type="button" className="chat_option_btn" onClick={(e) => handleSatisfy(e, 0)}>
              불만족스럽고 아쉬워요
            </button>
          </div>
        )}

        {/* 불만족 사유 선택 단계 */}
        {endFlow === 'ASK_UNSATISFY_REASON' && (
          <div className="chat_options">
            {UNSATISFY_REASONS.map((r) => (
              <button
                key={r.code}
                type="button"
                className="chat_option_btn"
                onClick={() => handleSelectUnsatisfyReason(r.code, r.label)}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* AI 타이핑 인디케이터 (로딩 중) */}
        {stage === 'AI' && aiLoading && (
          <div className="chat_bubble_row system">
            <span className="chat_sender_label">AI</span>
            <div className="chat_bubble_wrap">
              <div className="chat_bubble ai chat_typing_indicator">
                <span className="chat_typing_dot" />
                <span className="chat_typing_dot" />
                <span className="chat_typing_dot" />
              </div>
            </div>
          </div>
        )}

        {/* 상담 종료 상태 안내 */}
        {sessionEnded && (
          <div className="chat_ended_notice">상담이 종료되었습니다. 다시 상담을 원하시면 채팅창을 새로 열어주세요.</div>
        )}

        {/* 자동 스크롤을 위한 바닥 타겟 요소를 스크롤 영역 가장 하단에 배치 */}
        <div ref={bottomRef} />
      </div>

      {/* 고정 액션 버튼 하단 바 (다른 질문하기, 상담 종료 등) */}
      {!sessionEnded && consultStarted && !endFlow?.includes('SATISFY') && (
        <div className="chatbot_fixed_actions">
          {stage !== 'INTRO' && (
            <button type="button" className="chat_option_btn" disabled={aiLoading} onClick={handleOtherQuestion}>
              다른 질문하기
            </button>
          )}
          {stage === 'INTRO' && consultStarted && (
            <button type="button" className="chat_option_btn" onClick={handleAiConsult}>
              AI 상담
            </button>
          )}
          {stage === 'OPTION' && (
            <button type="button" className="chat_option_btn" onClick={handleAiConsult}>
              AI 상담
            </button>
          )}
          {(consultStarted || stage !== 'INTRO') && (
            <button type="button" className="chat_option_btn chat_option_end" disabled={aiLoading} onClick={handleEnd}>
              상담 종료
            </button>
          )}
        </div>
      )}

      {/* 메시지 입력창 하단 바 */}
      <div className="chatbot_input_row">
        <input
          type="text"
          className="chatbot_input"
          id="chatbot_input"
          placeholder={
            sessionEnded
              ? '상담이 종료되었습니다'
              : endFlow === 'ASK_UNSATISFY_MEMO'
                ? '아쉬웠던 점을 입력해주세요'
                : stage !== 'AI'
                  ? '옵션을 선택해주세요'
                  : aiLoading
                    ? 'AI가 답변을 생성 중 입니다.'
                    : '메시지를 입력하세요'
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleSendTextEnter}
          disabled={!inputEnabled}
          ref={inputRef}
        />
        <button type="button" className="chatbot_send_btn" onClick={handleSendText} disabled={!inputEnabled}>
          전송
        </button>
      </div>

      {/* 요약 생성 중 오버레이 */}
      {summarizing && (
        <div className="chatbot_summarizing_overlay">
          <div className="chatbot_summarizing_spinner" />
          <span>AI가 상담 내용을 요약하고 있습니다...</span>
        </div>
      )}

      {/* 공통 알림 모달 */}
      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </>
  );
}