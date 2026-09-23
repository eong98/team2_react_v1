import React, { useEffect, useRef, useState, type JSX } from 'react';
import { axiosInstance, set_focus } from '../../../utils/Tool';
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
import { useNavigate } from 'react-router-dom';
import AlertModal from '../common/AlertModal';

/* ---------------------------------------------------------------------
   챗봇 대화방

   저장은 전부 백엔드 액션 API가 처리합니다. 프론트는 "이 액션을
   하고 싶다"는 요청만 보내고, 응답으로 온 logs를 그대로 화면
   말풍선으로 그리기만 합니다(appendLogs).

   시스템 안내 문구는 SYSTEM_MESSAGES({code,label})에서 code로 label을
   찾아 그 텍스트를 그대로 서버에 실어 보냅니다(UNSATISFY_REASONS와
   동일한 방식). 백엔드는 별도 문구 매핑 없이 받은 텍스트를 그대로
   CHAT_LOG에 저장합니다.

   구분선(DIVIDER_TEXT)은 서버에 전혀 보내지 않고, 프론트가 화면에만
   표시합니다.

   종료/만족도/사유선택/사유입력/관리자연결요청/관리자연결확인 6가지는
   전부 PUT /chat_session/{no}/step 하나로 통합되어 있고, callStep()이
   그 호출을 담당합니다. (action 필드로 구분)

   옵션선택/AI전환/처음으로/AI채팅은 로그 저장 외에 세션 상태
   변경(모드/위치)이나 조회가 섞여있어 각각 별도 엔드포인트를 씁니다.

   남은 TODO:
   - AI 응답(RAG/LLM)은 백엔드 aiChat()이 아직 목업 응답을 씀
   - QA 자동등록(요약) API (관리자 연결 확정 시)
--------------------------------------------------------------------- */

interface ChatRoomProps {
  onClose: () => void;
  onBackToList: () => void;
  sessionId: string | null;
  refreshSignal: { sno: string; ts: number } | null; // 추가
  onStartAiResponding: (sno: string) => void; // 추가
  onAiRespondingDone: () => void;             // 추가
}

export default function ChatRoom({ onClose, onBackToList, sessionId, refreshSignal, onStartAiResponding, onAiRespondingDone }: ChatRoomProps) {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();

  const sessionIdRef = useRef<string | null>(sessionId);

  const [stage, setStage] = useState<ChatStage>('INTRO');
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

  /* AI 요약 */
  const [summarizing, setSummarizing] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };


  useEffect(() => {
    if (!refreshSignal || !sessionIdRef.current) return;
    if (refreshSignal.sno !== sessionIdRef.current) return; // 다른 세션 알림이면 무시

    // 지금 보고 있는 세션에 새 메시지가 왔다는 신호 → 로그 다시 불러오기
    axiosInstance.get<ChatLogEntry[]>(`/chat_log/session/${sessionIdRef.current}`).then((res) => {
      const restoredBubbles: ChatBubble[] = res.data.map((log) => ({
        id: String(log.no),
        sender: log.sender,
        content: log.content,
        mtype: log.mtype,
        createdAt: log.cdate,
      }));
      setBubbles(restoredBubbles); // 전체를 다시 그림(간단하고 안전한 방식)
      scrollToBottom();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);


  /** 백엔드 액션 응답의 logs를 화면 말풍선으로 변환해서 이어붙임 */
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

  /** 종료/만족도/사유/메모/관리자연결 6가지를 전부 처리하는 통합 액션 호출.
   *  systemMessage는 SYSTEM_MESSAGES에서 code로 찾은 텍스트를 그대로 실어 보냄. */
  const callStep = async (payload:ChatStepRequest): Promise<ChatActionResult | null> => {
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

  useEffect(() => {
    if (sessionId) {
      axiosInstance
        .get<ChatSessionResponse>(`/chat_session/${sessionId}`)
        .then((res) => {
          restoreFromSession(res.data);
          // axiosInstance.put(`/chat_session/${sessionId}/read`).catch((err) => console.error('읽음 처리 실패:', err));
        })
        .catch((err) => console.error('세션 조회 실패:', err));
    } else {
      loadRootMenus();
      setBubbles([{ id: `intro`, sender: 2, content: '안녕하세요! 무엇을 도와드릴까요?', createdAt: new Date().toISOString() }]);
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const aiPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollForAiResponse = (sno: string) => {
    if (aiPollIntervalRef.current) {
      clearInterval(aiPollIntervalRef.current);
    }

    aiPollIntervalRef.current = setInterval(async () => {
      const res = await axiosInstance.get<ChatSessionResponse>(`/chat_session/${sno}`);
      if (res.data.endflow !== 6) {
        clearInterval(aiPollIntervalRef.current!);
        aiPollIntervalRef.current = null;
        setAiLoading(false);

        // 완료됐으니 최신 로그를 다시 불러와서 화면 갱신
        const logRes = await axiosInstance.get<ChatLogEntry[]>(`/chat_log/session/${sno}`);
        const restoredBubbles: ChatBubble[] = logRes.data.map((log) => ({
          id: String(log.no), sender: log.sender, content: log.content, mtype: log.mtype, createdAt: log.cdate,
        }));
        setBubbles(restoredBubbles);
        setEndFlow(numberToEndFlow(res.data.endflow));
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (aiPollIntervalRef.current) {
        clearInterval(aiPollIntervalRef.current);
        aiPollIntervalRef.current = null;
      }
    };
  }, []);

  /** 기존 세션 데이터를 화면 상태로 복원. CHAT_LOG 전체를 불러와서 bubbles를 채웁니다. */
  const restoreFromSession = async (session: ChatSessionResponse) => {
    sessionIdRef.current = session.no;
    setConsultStarted(session.cmode !== 2);
    setSessionEnded(session.cmode === 2);
    setEndFlow(numberToEndFlow(session.endflow));


    try {
      const logRes = await axiosInstance.get<ChatLogEntry[]>(`/chat_log/session/${session.no}`);
      const restoredBubbles: ChatBubble[] = logRes.data.map((log, idx) => ({
        id: String(log.no),
        sender: log.sender,
        content: log.content,
        mtype: log.mtype,
        createdAt: log.cdate,
      }));
      setBubbles(restoredBubbles); // 서버 로그를 있는 그대로 복원 — 여기서 임의로 인트로를 더 안 붙임
      scrollToBottom();
    } catch (err) {
      console.error('대화 로그 조회 실패:', err);
    }

    setEndFlow(numberToEndFlow(session.endflow)); // 텍스트 매칭 없이 바로 복원
    scrollToBottom();

    if (session.cmode === 1) {
      setStage('AI');
    } else if (session.cno) {
      setStage('OPTION');
      const menuRes = await axiosInstance.get<ChatMenuTypes>(`/chat_menu/${session.cno}`);
      if (menuRes.data.hasChildren) {
        const childRes = await axiosInstance.get<ChatMenuTypes[]>(`/chat_menu/${session.cno}/children`);
        setCurrentOptions(childRes.data);
      }
    } else {
      setStage('INTRO');
      setCurrentOptions([]);
      setEndFlow(null);
      if (rootMenus.length === 0) loadRootMenus();
    }

    if (session.endflow === 5) {
      setSummarizing(true);
      pollForSummaryResult(session.no); // 아래 함수, 완료될 때까지 주기적으로 확인
    }

    if (session.endflow === 6) {
      setAiLoading(true);
      onStartAiResponding(session.no); // 부모에게도 알림
      pollForAiResponse(session.no);
    }
    
  };

  /* AI 요약 */
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollForSummaryResult = (sno: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current); // 혹시 이미 돌고 있던 폴링이 있으면 먼저 정리
    }


    pollIntervalRef.current = setInterval(async () => {
      const res = await axiosInstance.get<ChatSessionResponse>(`/chat_session/${sno}`);
      if (res.data.endflow !== 5) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        setSummarizing(false);
        if (res.data.stitle) {
          const checkUrl = mno ? 'user' : 'board';
          onClose();
          navigate(`/${checkUrl}/qa/new`, { state: { title: res.data.stitle, content: '', type: 0 } });
        }
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const loadRootMenus = () => {
    setLoadingRoot(true);
    axiosInstance
      .get<ChatMenuTypes[]>('/chat_menu/root')
      .then((res) => setRootMenus(res.data))
      .catch((err) => console.error('선택지 조회 실패:', err))
      .finally(() => setLoadingRoot(false));
  };

  /** 세션이 없으면 먼저 생성해서 sessionIdRef에 반영 */
  const ensureSession = async (
    cmode: 0 | 1,
    cno: number | null,
    withGreeting: boolean = true, // 인사말 저장 여부 선택 가능하게
  ): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const params: Record<string, string> = {};
    if (withGreeting) {
      params.greeting = getMessage(SYSTEM_MESSAGES, 5);
    }

    const res = await axiosInstance.post<ChatActionResult>(
      '/chat_session',
      { mno: mno || null, 
        gno: mno ? null : getOrCreateGno(), 
        channel: 10, 
        cmode, 
        cno 
      },
      { params }, 
    );

    sessionIdRef.current = res.data.no!;
    setBubbles((prev) => prev.filter((b) => b.id !== 'intro'));
    if (res.data.logs?.length) appendLogs(res.data.logs);

    return sessionIdRef.current;
  };

  // ── 화면1 → 화면2: 최상위 옵션 클릭 ──
  const handleSelectRoot = async (menu: ChatMenuTypes) => {
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

  // ── 화면2: 하위 옵션 클릭 ──
  const handleSelectChild = async (menu: ChatMenuTypes) => {
    if (!sessionIdRef.current) return;
    setOptionLoading(true);
    try {
      const actionRes = await axiosInstance.put<ChatActionResult>(
        `/chat_session/${sessionIdRef.current}/select`,
        { cno: menu.no },
      );
      appendLogs(actionRes.data.logs);
      setCurrentOptions(actionRes.data.nextOptions ?? []);
    } catch (err) {
      console.error('메뉴 선택 실패:', err);
    } finally {
      setOptionLoading(false);
    }
  };

  // ── 화면1로 처음부터 다시 ──
  const handleOtherQuestion = async () => {
    const wasAi = stage === 'AI';

    setStage('INTRO');
    setCurrentOptions([]);
    setEndFlow(null);
    setSessionEnded(false);
    if (rootMenus.length === 0) loadRootMenus();

    const greeting = getMessage(SYSTEM_MESSAGES, 6); // '질문 옵션을 선택해주세요.'

    if (sessionIdRef.current) {
      try {
        if (wasAi) {
          showDividerNow('여기까지가 AI 상담입니다'); // 즉시 그림
          endAiConsultDivider(sessionIdRef.current).catch((err) => console.error('구분선 저장 실패:', err));; // 저장은 기다리지 않고 요청만 보냄 (fire-and-forget)
        }

        const actionRes = await axiosInstance.put<ChatActionResult>(
          `/chat_session/${sessionIdRef.current}/back-intro`,
          null,
          { params: { greeting } }, // endAi 파라미터 제거
        );
        appendLogs(actionRes.data.logs);
      } catch (err) {
        console.error('처음으로 전환 실패:', err);
      }
      
    }
    scrollToBottom();
  };

  /** 화면에만 구분선을 즉시 표시 (백엔드 저장은 별도로 요청만 보내고 기다리지 않음) */
  const showDividerNow = (content: string) => {
    setBubbles((prev) => [
      ...prev,
      { id: `divider-${Date.now()}`, sender: 2, content, mtype: 5, createdAt: new Date().toISOString() },
    ]);
    scrollToBottom();
  };
  
  
  // ── AI 상담 진입 ──
  const handleAiConsult = async () => {
    setConsultStarted(true);
    setStage('AI');
    setEndFlow(null);
    setSessionEnded(false);


    // "AI 상담" 클릭 + 구분선을 즉시(낙관적으로) 화면에 그림
    setBubbles((prev) => [
      ...prev,
      { id: `temp-click-${Date.now()}`, sender: 0, content: 'AI 상담', createdAt: new Date().toISOString() },
    ]);
    showDividerNow('여기부터 AI 상담입니다');
    scrollToBottom();
    setAiLoading(true); // 인사말 생성 중임을 타이핑 점으로 표시

    try {
      if (!sessionIdRef.current) {
        await ensureSession(1, null, false);
      }

      const result = await startAiConsult(sessionIdRef.current!);
      appendLogs(result.logs); // 이제 인사말만 이어서 붙음
      scrollToBottom();
    } catch (err) {
      console.error('AI 상담 전환 실패:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // ── AI 상담: 메시지 전송 ──
  const handleSendText = async () => {
    if (sessionEnded || !inputValue.trim() || !sessionIdRef.current) return;

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

    const userMsg = inputValue;
    setInputValue('');
    setEndFlow(null);

    // 사용자 메시지를 즉시(낙관적으로) 화면에 그림 — AI 응답을 기다리지 않음
    setBubbles((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, sender: 0, content: userMsg, createdAt: new Date().toISOString() },
    ]);
    
    setAiLoading(true);
    scrollToBottom();
    onStartAiResponding(sessionIdRef.current!); // 부모(목록/FAB)에게도 알림


    try {
      const result = await aiChat(sessionIdRef.current, userMsg);
      appendLogs(result.logs); // 이제 AI 답변만 추가됨
      if (result.needsAdmin) {
        setEndFlow('FAIL_AI_ANSWER');
      }
      console.log(result.logs)
    } catch (err) {
      console.error('AI 응답 실패:', err);
    } finally {
      setAiLoading(false);
      scrollToBottom();
      onAiRespondingDone(); // 완료 알림
    }

  };
  
  // 1. 입력창 DOM 요소에 접근하기 위한 ref 생성
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // aiLoading이 false로 바뀌고, disabled가 해제되었을 때 포커스 지정
    if (!aiLoading) {
      inputRef.current?.focus();
    }
  }, [aiLoading]);
  // useEffect(() => {
  //   if (!sessionId && aiLoading) return;

  //   axiosInstance
  //     .get<ChatSessionResponse>(`/chat_session/${sessionId}`)
  //     .then((res) => {
  //       restoreFromSession(res.data);
  //       // axiosInstance.put(`/chat_session/${sessionId}/read`).catch((err) => console.error('읽음 처리 실패:', err));
  //     })
  //     .catch((err) => console.error('세션 조회 실패:', err));

  //     console.log('loading 변화')
    
  // }, [aiLoading]);

  const handleEscalateToAdmin = async (e: React.MouseEvent) => {
    if (sessionIdRef.current && stage === 'AI') {
      showDividerNow('여기까지가 AI 상담입니다');
      endAiConsultDivider(sessionIdRef.current).catch((err) => console.error('구분선 저장 실패:', err));; // fire-and-forget
    }

    const result = await callStep({ action: 4, label: e.currentTarget.textContent, systemMessage: getMessage(SYSTEM_MESSAGES, 3) });
    if (result) setEndFlow('ASK_ESCALATE_CONFIRM');
  };

  const handleEnd = async (e: React.MouseEvent) => {
    if (sessionIdRef.current && stage === 'AI') {
      showDividerNow('여기까지가 AI 상담입니다');
      endAiConsultDivider(sessionIdRef.current).catch((err) => console.error('구분선 저장 실패:', err));; // fire-and-forget
    }

    const result = await callStep({ action: 0, label: e.currentTarget.textContent, systemMessage: getMessage(SYSTEM_MESSAGES, 0) });
    if (result) setEndFlow('ASK_SATISFY');
  };
  
  const handleEscalateConfirm = async (e: React.MouseEvent, goQa: boolean) => {
    const result = await callStep({ action: 5, goQa, label: e.currentTarget.textContent });
     if (!result) return;

      if (goQa && sessionIdRef.current) {
      
        setSummarizing(true); // 로딩 시작
        try {
          const summary = await summarizeChat(sessionIdRef.current);
          // TODO: QA 작성 페이지로 이동하면서 summary.title/content/type을 넘겨서 input 자동 채우기
          const checkURl = mno ? 'user' : 'board';
          onClose(); // 페이지 이동 전에 챗봇 닫기
          navigate(`/${checkURl}/qa/new`, { state: { title: summary.title, content: summary.content, type: summary.type } });
          return;

        } catch (err) {
          console.error('대화 요약 실패:', err);
          setSummarizing(false); // 실패 시 로딩 해제
          setEndFlow(null); // 요약 실패했으면 대화 계속할 수 있게 여기서 풀어줌
          
          setAlert({ message: '현재 AI 요약 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.', variant: 'error' });
        }
      }

    setEndFlow(null); // goQa === false(아니오 선택)일 때만 여기 옴

    if (result.sessionEnded) {
      setSessionEnded(true);
      setConsultStarted(false);
    }
  };


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

  const handleSendText_Enter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSendText();
  };

  const headerTitle = stage === 'AI' ? 'AI 상담' : '알리미오 상담봇';
  const inputEnabled = !sessionEnded && ((stage === 'AI' && endFlow !== 'ASK_ESCALATE_CONFIRM') || endFlow === 'ASK_UNSATISFY_MEMO') && !aiLoading;

  const renderBubbles = () => {
    const elements: JSX.Element[] = [];
    let lastDate: string | null = null;

    bubbles.forEach((b) => {
      if (lastDate === null || !isSameDate(lastDate, b.createdAt)) {
        elements.push(
          <div key={`date-${b.id}`} className="chat_date_divider">
            <span>{formatMessageDate(b.createdAt)}</span>
          </div>,
        );
        lastDate = b.createdAt;
      }

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

      <div className="chatbot_body">
        {renderBubbles()}

        {stage === 'INTRO' && endFlow === null && !sessionEnded && (
          <div className="chat_options">
            {rootMenus.map((menu) => (
              <button key={menu.no} type="button" className="chat_option_btn" onClick={() => handleSelectRoot(menu)}>
                {menu.label}
              </button>
            ))}
          </div>
        )}

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

        {endFlow === 'FAIL_AI_ANSWER' && (
          <button type="button" className="chat_admin_btn" onClick={handleEscalateToAdmin}>
            관리자에게 문의하기
          </button>
        )}

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

        {endFlow === 'ASK_SATISFY' && (
          <div className="chat_options">
            <button type="button" className="chat_option_btn" onClick={(e) => handleSatisfy(e, 1)}>
              만족해요
            </button>
            <button type="button" className="chat_option_btn" onClick={(e) => handleSatisfy(e, 0)}>
              불만족스러워요
            </button>
          </div>
        )}

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

        {sessionEnded && (
          <div className="chat_ended_notice">상담이 종료되었습니다. 다시 상담을 원하시면 채팅창을 새로 열어주세요.</div>
        )}

        <div ref={bottomRef} />
      </div>

      {!sessionEnded && consultStarted && (!endFlow?.includes('SATISFY')) && (
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
      

      <div className="chatbot_input_row">
        <input
          type="text"
          className="chatbot_input"
          id='chatbot_input'
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
          onKeyDown={handleSendText_Enter}
          disabled={!inputEnabled}
          ref={inputRef} // 3. ref 연결
        />
        <button type="button" className="chatbot_send_btn" onClick={handleSendText} disabled={!inputEnabled}>
          전송
        </button>
      </div>

      {summarizing && (
        <div className="chatbot_summarizing_overlay">
          <div className="chatbot_summarizing_spinner" />
          <span>AI가 상담 내용을 요약하고 있습니다...</span>
        </div>
      )}


      
      {/* 안내 알림 모달 */}
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