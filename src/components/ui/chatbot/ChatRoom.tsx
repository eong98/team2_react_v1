import React, { useEffect, useRef, useState, type JSX } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import {
  UNSATISFY_REASONS,
  formatMessageDate,
  formatMessageTime,
  isSameDate,
  type ChatBubble,
  type ChatStage,
  type EndFlowStep,
  type ChatSessionResponse,
  type ChatLogEntry,
  type ChatActionResult,
  type ChatStepRequest,
  getMessage,
  SYSTEM_MESSAGES,
} from '../../ts/ChatBot';
import type { ChatMenuTypes } from '../../ts/ChatMenu';
import { getOrCreateGno } from '../../ts/ChatGuest';

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
  mode?: 'floating' | 'preview';
}

export default function ChatRoom({ onClose, onBackToList, sessionId, mode = 'floating' }: ChatRoomProps) {
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
  const [endFlow, setEndFlow] = useState<EndFlowStep>(null);

  const [sessionEnded, setSessionEnded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  /** 백엔드 액션 응답의 logs를 화면 말풍선으로 변환해서 이어붙임 */
  const appendLogs = (logs: ChatLogEntry[], lastNeedsAdmin?: boolean) => {
    const newBubbles: ChatBubble[] = logs.map((log, idx) => ({
      id: String(log.no),
      sender: log.sender,
      content: log.content,
      mtype: log.mtype,
      createdAt: log.cdate,
      needsAdmin: lastNeedsAdmin && idx === logs.length - 1 ? true : undefined,
    }));
    setBubbles((prev) => [...prev, ...newBubbles]);
    scrollToBottom();
  };

  // /** 화면에만 구분선을 표시 (CHAT_LOG 저장 없음, 순수 화면 표시용) */
  // const appendDivider = (content: string) => {
  //   setBubbles((prev) => [
  //     ...prev,
  //     { id: `divider-${Date.now()}`, sender: 2, content, kind: 'divide', createdAt: new Date().toISOString() },
  //   ]);
  //   scrollToBottom();
    
  // };

  /** 종료/만족도/사유/메모/관리자연결 6가지를 전부 처리하는 통합 액션 호출.
   *  systemMessage는 SYSTEM_MESSAGES에서 code로 찾은 텍스트를 그대로 실어 보냄. */
  const callStep = async (payload:ChatStepRequest): Promise<ChatActionResult | null> => {
    if (!sessionIdRef.current) return null;
    try {
      const res = await axiosInstance.put<ChatActionResult>(`/chat_session/${sessionIdRef.current}/step`, payload);
      appendLogs(res.data.logs, res.data.needsAdmin);
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
        .then((res) => restoreFromSession(res.data))
        .catch((err) => console.error('세션 조회 실패:', err));
    } else {
      loadRootMenus();
      setBubbles([{ id: `intro`, sender: 2, content: '안녕하세요! 무엇을 도와드릴까요?', createdAt: new Date().toISOString() }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  /** 기존 세션 데이터를 화면 상태로 복원. CHAT_LOG 전체를 불러와서 bubbles를 채웁니다. */
  const restoreFromSession = async (session: ChatSessionResponse) => {
    sessionIdRef.current = session.no;
    setConsultStarted(session.cmode !== 2);
    setSessionEnded(session.cmode === 2);

    try {
      const logRes = await axiosInstance.get<ChatLogEntry[]>(`/chat_log/session/${session.no}`);
      const restoredBubbles: ChatBubble[] = logRes.data.map((log) => ({
        id: String(log.no),
        sender: log.sender,
        content: log.content,
        mtype: log.mtype,
        createdAt: log.cdate,
      }));
      setBubbles(restoredBubbles); // 서버 로그를 있는 그대로 복원 — 여기서 임의로 인트로를 더 안 붙임
    } catch (err) {
      console.error('대화 로그 조회 실패:', err);
    }

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
      // 인트로 문구는 CHAT_LOG에 이미 저장돼 있다면 restoredBubbles에 포함되어 있음 —
      // 여기서 또 붙이지 않음 (중복 방지)
    }
    scrollToBottom();
  };

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
    extra?: { startAi?: string },
  ): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const greeting = getMessage(SYSTEM_MESSAGES, 5); // '안녕하세요! 무엇을 도와드릴까요?' — 항상 기본으로 들어감

    const res = await axiosInstance.post<ChatActionResult>(
      '/chat_session',
      { mno: mno || null, 
        gno: mno ? null : getOrCreateGno(), 
        channel: 10, 
        cmode, 
        cno 
      },
      { params: { greeting } }, // greeting은 항상 포함
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
        const endAi = wasAi ? getMessage(SYSTEM_MESSAGES, 8) : null; // '여기까지가 AI 상담입니다' (없으면 null)
        const actionRes = await axiosInstance.put<ChatActionResult>(`/chat_session/${sessionIdRef.current}/back-intro`,
          null,
          { params: { ...(endAi ? { endAi } : {}), greeting } },
        );
        appendLogs(actionRes.data.logs);
      } catch (err) {
        console.error('처음으로 전환 실패:', err);
      }
    } else {
      scrollToBottom();
    }
  };

  // ── AI 상담 진입 ──
  const handleAiConsult = async () => {
    setConsultStarted(true);
    setStage('AI');
    setEndFlow(null);
    setSessionEnded(false);
    console.log(sessionIdRef.current)

    try {
      const startAi = getMessage(SYSTEM_MESSAGES, 7);
      const greeting = getMessage(SYSTEM_MESSAGES, 9);
      if (sessionIdRef.current) {
        const actionRes = await axiosInstance.put<ChatActionResult>(
          `/chat_session/${sessionIdRef.current}/ai-start`,
          null,
          { params: { startAi, greeting } },
        );
        appendLogs(actionRes.data.logs);
      } else {
        await ensureSession(1, null); // greeting은 ensureSession 내부에서 자동으로 붙음
        
        const actionRes = await axiosInstance.put<ChatActionResult>(
          `/chat_session/${sessionIdRef.current}/ai-start`,
          null,
          { params: { startAi, greeting } },
        );
        appendLogs(actionRes.data.logs);
      }
    } catch (err) {
      console.error('AI 상담 전환 실패:', err);
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
    setAiLoading(true);

    try {
      const actionRes = await axiosInstance.post<ChatActionResult>(`/chat_session/${sessionIdRef.current}/ai-chat`, {
        message: userMsg,
      });
      appendLogs(actionRes.data.logs, actionRes.data.needsAdmin);
    } catch (err) {
      console.error('AI 응답 실패:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleEscalateToAdmin = async (e: React.MouseEvent) => {
    const result = await callStep({ action: 4, label: e.currentTarget.textContent, systemMessage: getMessage(SYSTEM_MESSAGES, 3)});
    if (result) setEndFlow('ASK_ESCALATE_CONFIRM');
  };

  const handleEscalateConfirm = async (e: React.MouseEvent, goQa: boolean) => {
    const result = await callStep({ action: 5, goQa, label: e.currentTarget.textContent });
     if (!result) return;

    setEndFlow(null);

    if (result.sessionEnded) {
      setSessionEnded(true);
      setConsultStarted(false);
    }
    // TODO: confirmed === true면 QA 등록화면 진입 연동
  };

  const handleEnd = async (e: React.MouseEvent) => {
    const result = await callStep({ action: 0, label: e.currentTarget.textContent, systemMessage: getMessage(SYSTEM_MESSAGES, 0) });
    if (result) setEndFlow('ASK_SATISFY');
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
  const inputEnabled = !sessionEnded && ((stage === 'AI' && endFlow === null) || endFlow === 'ASK_UNSATISFY_MEMO');

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

      console.log(b)
      if ((SYSTEM_MESSAGES[7].label.includes(b.content) || SYSTEM_MESSAGES[8].label.includes(b.content)) && b.mtype === 5) {
        elements.push(
          <div key={b.id} className="chat_divider_line">
            <span>{b.content}</span>
          </div>,
        );
        return;
      }

      const senderLabel = b.sender === 1 ? 'AI' : b.sender === 2 ? '상담봇' : null;

      elements.push(
        <div key={b.id} className={`chat_bubble_row ${b.sender === 0 ? 'user' : 'system'}`}>
          {senderLabel && <span className="chat_sender_label">{senderLabel}</span>}
          <div className="chat_bubble_wrap">
            <div className={`chat_bubble ${b.sender === 0 ? 'user' : b.sender === 1 ? 'ai' : 'system'}`}>{b.content}</div>
            <span className="chat_bubble_time">{formatMessageTime(b.createdAt)}</span>
          </div>
          {b.needsAdmin && !sessionEnded && endFlow === null && (
            <button type="button" className="chat_admin_btn" onClick={handleEscalateToAdmin}>
              관리자에게 문의하기
            </button>
          )}
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

        {stage === 'AI' && aiLoading && <div className="chat_loading">답변을 생성하는 중...</div>}

        {sessionEnded && (
          <div className="chat_ended_notice">상담이 종료되었습니다. 다시 상담을 원하시면 채팅창을 새로 열어주세요.</div>
        )}

        <div ref={bottomRef} />
      </div>

      {!sessionEnded && endFlow === null && consultStarted && (
        <div className="chatbot_fixed_actions">
          {stage !== 'INTRO' && (
            <button type="button" className="chat_option_btn" onClick={handleOtherQuestion}>
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
            <button type="button" className="chat_option_btn chat_option_end" onClick={handleEnd}>
              상담 종료
            </button>
          )}
        </div>
      )}

      {mode === 'floating' && (
        <div className="chatbot_input_row">
          <input
            type="text"
            className="chatbot_input"
            placeholder={
              sessionEnded
                ? '상담이 종료되었습니다'
                : endFlow === 'ASK_UNSATISFY_MEMO'
                  ? '아쉬웠던 점을 입력해주세요'
                  : stage !== 'AI'
                    ? '옵션을 선택해주세요'
                    : '메시지를 입력하세요'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleSendText_Enter}
            disabled={!inputEnabled}
          />
          <button type="button" className="chatbot_send_btn" onClick={handleSendText} disabled={!inputEnabled}>
            전송
          </button>
        </div>
      )}
    </>
  );
}