import { useEffect, useRef, useState, type JSX } from 'react';
import {
  UNSATISFY_REASONS,
  formatMessageDate,
  formatMessageTime,
  isSameDate,
  type ChatBubble,
  type ChatStage,
  type EndFlowStep,
} from './ChatBot';
import type { ChatMenuTypes } from '../../ts/ChatMenu';
import { axiosInstance } from '../../../utils/Tool';

/* ---------------------------------------------------------------------
   챗봇 대화방 — 실제 상담 진행 화면 (ChatBotWidget에서 분리됨)

   TODO(백엔드 연동 지점):
   - 세션 생성 API (handleSelectRoot, handleAiConsult 최초 진입)
   - 기존 세션 상세(대화로그) 불러오기 (sessionId 있을 때)
   - AI 응답 API (handleSendText)
   - 세션 종료 API (handleSatisfy, finishUnsatisfyFlow)
   - QA 자동등록(요약) API (관리자 연결 확정 시)

   현재 시각(now())은 더미 데이터입니다 — 실제 시각이 아니라 호출할 때마다
   1분씩 증가하는 고정 값이며, 실제 API 연동 시 서버 응답의 CHAT_LOG.CDATE로
   교체해야 합니다.
--------------------------------------------------------------------- */

const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

// 더미 시각 — 실제 현재 시각 대신, 호출할 때마다 1분씩 늘어나는 고정 값
let dummyMinuteOffset = 0;
const now = () => {
  const base = new Date('2026-09-14T09:00:00');
  base.setMinutes(base.getMinutes() + dummyMinuteOffset);
  dummyMinuteOffset += 1;
  return base.toISOString();
};

interface ChatRoomProps {
  onClose: () => void;
  onBackToList: () => void;
  sessionId: string | null; // null이면 새 채팅
  mode?: 'floating' | 'preview';
}

export default function ChatRoom({ onClose, onBackToList, sessionId, mode = 'floating' }: ChatRoomProps) {
  const [stage, setStage] = useState<ChatStage>('INTRO');
  const [consultStarted, setConsultStarted] = useState(false);
  const [endThanksMessage, setEndThanksMessage] = useState<string | null>(null);

  // 화면1: 최상위 선택지
  const [rootMenus, setRootMenus] = useState<ChatMenuTypes[]>([]);
  const [loadingRoot, setLoadingRoot] = useState(false);

  // 화면2: 옵션 진행
  const [rootTitle, setRootTitle] = useState('');
  const [currentOptions, setCurrentOptions] = useState<ChatMenuTypes[]>([]);
  const [optionLoading, setOptionLoading] = useState(false);

  // 대화 로그 (화면1/2/3 공통 사용)
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [endFlow, setEndFlow] = useState<EndFlowStep>(null);

  const [sessionEnded, setSessionEnded] = useState(false);
  const [unsatisfyReason, setUnsatisfyReason] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      // TODO: 기존 채팅방 진입 — 세션 상세(대화로그) 불러와서 bubbles/stage 복원
      // axiosInstance.get(`/chat_session/${sessionId}`).then((res) => { ... });
    } else {
      loadRootMenus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bubbles]);

  // ── 화면1: 최상위 선택지 로드 (세션 없이 순수 조회) ──
  const loadRootMenus = () => {
    setLoadingRoot(true);
    axiosInstance
      .get<ChatMenuTypes[]>('/chat_menu/root')
      .then((res) => setRootMenus(res.data))
      .catch((err) => console.error('선택지 조회 실패:', err))
      .finally(() => setLoadingRoot(false));
  };

  // ── 화면1 → 화면2: 최상위 옵션 클릭 (여기서 상담 시작 = 세션 생성) ──
  const handleSelectRoot = async (menu: ChatMenuTypes) => {
    setOptionLoading(true);
    try {
      setConsultStarted(true);
      // TODO: 세션 생성 API 연동
      setRootTitle(menu.label);
      setStage('OPTION');

      setBubbles((prev) => [...prev, { id: makeId(), sender: 0, content: menu.label, createdAt: now() }]);

      const detailRes = await axiosInstance.get<ChatMenuTypes>(`/chat_menu/${menu.no}`);
      if (detailRes.data.answer) {
        setBubbles((prev) => [
          ...prev,
          { id: makeId(), sender: 2, content: detailRes.data.answer as string, createdAt: now() },
        ]);
      }

      if (detailRes.data.hasChildren) {
        const childrenRes = await axiosInstance.get<ChatMenuTypes[]>(`/chat_menu/${menu.no}/children`);
        setCurrentOptions(childrenRes.data);
      } else {
        setCurrentOptions([]);
      }
    } catch (err) {
      console.error('메뉴 선택 실패:', err);
    } finally {
      setOptionLoading(false);
    }
  };

  // ── 화면2: 하위 옵션 클릭 ──
  const handleSelectChild = async (menu: ChatMenuTypes) => {
    setOptionLoading(true);
    try {
      setBubbles((prev) => [...prev, { id: makeId(), sender: 0, content: menu.label, createdAt: now() }]);

      const detailRes = await axiosInstance.get<ChatMenuTypes>(`/chat_menu/${menu.no}`);
      if (detailRes.data.answer) {
        setBubbles((prev) => [
          ...prev,
          { id: makeId(), sender: 2, content: detailRes.data.answer as string, createdAt: now() },
        ]);
      }

      if (detailRes.data.hasChildren) {
        const childrenRes = await axiosInstance.get<ChatMenuTypes[]>(`/chat_menu/${menu.no}/children`);
        setCurrentOptions(childrenRes.data);
      } else {
        setCurrentOptions([]);
      }
    } catch (err) {
      console.error('메뉴 선택 실패:', err);
    } finally {
      setOptionLoading(false);
    }
  };

  // ── 화면1로 처음부터 다시 (기존 대화 내용은 유지) ──
  const handleOtherQuestion = () => {
    setStage('INTRO');
    setRootTitle('');
    setCurrentOptions([]);
    setEndFlow(null);
    setEndThanksMessage(null);
    setSessionEnded(false);
    if (rootMenus.length === 0) loadRootMenus();
  };

  // ── AI 상담 진입 (구분선 삽입 후 대화 이어감) ──
  const handleAiConsult = async () => {
    setConsultStarted(true);
    setStage('AI');
    setEndFlow(null);
    setSessionEnded(false);
    setBubbles((prev) => [
      ...prev,
      { id: makeId(), kind: 'divider', sender: 2, content: '여기부터 AI 상담입니다', createdAt: now() },
    ]);
  };

  // ── AI 상담: 메시지 전송 (불만족 "기타" 사유 입력도 여기서 같이 처리) ──
  const handleSendText = async () => {
    if (sessionEnded || !inputValue.trim()) return;

    if (endFlow === 'ASK_UNSATISFY_MEMO') {
      const memo = inputValue;
      if (stage === 'AI') {
        setBubbles((prev) => [...prev, { id: makeId(), sender: 0, content: memo, createdAt: now() }]);
      }
      setInputValue('');
      finishUnsatisfyFlow(9, memo);
      return;
    }

    const userMsg = inputValue;
    setBubbles((prev) => [...prev, { id: makeId(), sender: 0, content: userMsg, createdAt: now() }]);
    setInputValue('');
    setAiLoading(true);

    try {
      // TODO: 실제 RAG/LLM 응답 API 연동
      await new Promise((r) => setTimeout(r, 400));
      const answer = '죄송합니다, 정확한 답변을 찾지 못했습니다.';
      const needsAdmin = true;

      setBubbles((prev) => [...prev, { id: makeId(), sender: 1, content: answer, needsAdmin, createdAt: now() }]);
    } catch (err) {
      console.error('AI 응답 실패:', err);
      setBubbles((prev) => [...prev, { id: makeId(), sender: 2, content: '응답을 불러오지 못했습니다.', createdAt: now() }]);
    } finally {
      setAiLoading(false);
    }
  };

  // ── AI 응답에 붙은 "관리자에게 문의하기" 클릭 ──
  const handleEscalateToAdmin = () => {
    setBubbles((prev) => [
      ...prev,
      {
        id: makeId(),
        sender: 2,
        content: '관리자에게 문의를 남기시겠어요? 문의를 남기면 현재 상담이 종료되며, 답변은 등록하신 이메일로 안내드립니다.',
        createdAt: now(),
      },
    ]);
    setEndFlow('ASK_ESCALATE_CONFIRM');
    // TODO: 확인 시 대화로그 기반 AI요약 API 호출 → QA 등록화면 진입
  };

  const handleEscalateConfirm = (confirmed: boolean) => {
    if (confirmed) {
      setBubbles((prev) => [...prev, { id: makeId(), sender: 0, content: '네, 문의를 남길게요', createdAt: now() }]);
      // TODO: 대화로그 기반 AI 요약 API 호출 → QA 등록화면(제목/내용/이메일/비밀번호) 진입
      setEndFlow(null);
    } else {
      setBubbles((prev) => [...prev, { id: makeId(), sender: 0, content: '아니요', createdAt: now() }]);
      setEndFlow(null);
    }
  };

  // ── 상담 종료 버튼 (모든 stage 공통, AI만 bubbles에 기록) ──
  const handleEnd = () => {
    if (stage === 'AI') {
      setBubbles((prev) => [...prev, { id: makeId(), sender: 2, content: '상담이 만족스러우셨나요?', createdAt: now() }]);
    }
    setEndFlow('ASK_SATISFY');
  };

  // ── 만족도 응답 ──
  const handleSatisfy = (value: 0 | 1) => {
    if (stage === 'AI') {
      setBubbles((prev) => [
        ...prev,
        { id: makeId(), sender: 0, content: value === 1 ? '만족해요' : '불만족스러워요', createdAt: now() },
      ]);
    }

    if (value === 1) {
      if (stage === 'AI') {
        setBubbles((prev) => [
          ...prev,
          { id: makeId(), sender: 2, content: '소중한 의견 감사합니다. 상담을 종료합니다.', createdAt: now() },
        ]);
      } else {
        setEndThanksMessage('소중한 의견 감사합니다. 상담을 종료합니다.');
      }
      setEndFlow(null);
      setSessionEnded(true);
      setConsultStarted(false);
      // TODO: 세션 종료 API 연동 (CREASON=0, SATISFY=1)
    } else {
      if (stage === 'AI') {
        setBubbles((prev) => [...prev, { id: makeId(), sender: 2, content: '어떤 점이 아쉬우셨나요?', createdAt: now() }]);
      }
      setEndFlow('ASK_UNSATISFY_REASON');
    }
  };

  const handleSelectUnsatisfyReason = (code: number, label: string) => {
    setUnsatisfyReason(code);
    if (stage === 'AI') {
      setBubbles((prev) => [...prev, { id: makeId(), sender: 0, content: label, createdAt: now() }]);
    }

    if (code === 9) {
      if (stage === 'AI') {
        setBubbles((prev) => [
          ...prev,
          { id: makeId(), sender: 2, content: '어떤 점이 아쉬우셨는지 채팅창에 입력해주세요.', createdAt: now() },
        ]);
      }
      setEndFlow('ASK_UNSATISFY_MEMO');
    } else {
      finishUnsatisfyFlow(code, null);
    }
  };

  const finishUnsatisfyFlow = (reasonCode: number, memo: string | null) => {
    if (stage === 'AI') {
      setBubbles((prev) => [
        ...prev,
        { id: makeId(), sender: 2, content: '소중한 의견 감사합니다. 상담을 종료합니다.', createdAt: now() },
      ]);
    } else {
      setEndThanksMessage('소중한 의견 감사합니다. 상담을 종료합니다.');
    }
    setEndFlow(null);
    setSessionEnded(true);
    setConsultStarted(false);
    // TODO: 세션 종료 API 연동 (CREASON=0, SATISFY=0, SREASON=reasonCode, SMEMO=memo)
  };

  const handleSendText_Enter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSendText();
  };

  const headerTitle = stage === 'INTRO' ? 'allimio 상담봇' : stage === 'AI' ? 'AI 상담' : rootTitle;

  const inputEnabled = !sessionEnded && ((stage === 'AI' && endFlow === null) || endFlow === 'ASK_UNSATISFY_MEMO');

  const renderBubbles = () => {
    const elements: JSX.Element[] = [];
    let lastDate: string | null = null;

    bubbles.forEach((b) => {
      // 날짜가 바뀌는 지점에 날짜 구분선 삽입
      if (lastDate === null || !isSameDate(lastDate, b.createdAt)) {
        elements.push(
          <div key={`date-${b.id}`} className="chat_date_divider">
            <span>{formatMessageDate(b.createdAt)}</span>
          </div>,
        );
        lastDate = b.createdAt;
      }

      if (b.kind === 'divider') {
        elements.push(
          <div key={b.id} className="chat_divider_line">
            <span>{b.content}</span>
          </div>,
        );
      } else {
        elements.push(
          <div key={b.id} className={`chat_bubble_row ${b.sender === 0 ? 'user' : 'system'}`}>
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
      }
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
          <span className="chatbot_status_dot" />
          <span>{headerTitle}</span>
        </div>
        <button type="button" className="chatbot_close_btn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      {/* ══════════ 화면1: 최상위 선택 ══════════ */}
      {stage === 'INTRO' && (
        <>
          <div className="chatbot_body">
            <div className="chat_bubble_row system">
              <div className="chat_bubble system">안녕하세요! 무엇을 도와드릴까요?</div>
            </div>

            {renderBubbles()}

            {endFlow === null && !sessionEnded && (
              <div className="chat_options">
                {rootMenus.map((menu) => (
                  <button key={menu.no} type="button" className="chat_option_btn" onClick={() => handleSelectRoot(menu)}>
                    {menu.label}
                  </button>
                ))}
              </div>
            )}

            {!consultStarted && !sessionEnded && endFlow === null && (
              <>
                <div className="chat_ai_divider">
                  <span>또는</span>
                </div>
                <button type="button" className="chat_ai_entry_btn" onClick={handleAiConsult}>
                  ✨ AI에게 바로 물어보기
                </button>
              </>
            )}

            {loadingRoot && <div className="chat_loading">불러오는 중...</div>}

            {endFlow === 'ASK_SATISFY' && (
              <>
                <div className="chat_bubble_row system" style={{ marginTop: 4 }}>
                  <div className="chat_bubble system">상담이 만족스러우셨나요?</div>
                </div>
                <div className="chat_options">
                  <button type="button" className="chat_option_btn" onClick={() => handleSatisfy(1)}>
                    만족해요
                  </button>
                  <button type="button" className="chat_option_btn" onClick={() => handleSatisfy(0)}>
                    불만족스러워요
                  </button>
                </div>
              </>
            )}

            {endFlow === 'ASK_UNSATISFY_REASON' && (
              <>
                <div className="chat_bubble_row system" style={{ marginTop: 4 }}>
                  <div className="chat_bubble system">어떤 점이 아쉬우셨나요?</div>
                </div>
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
              </>
            )}

            {endFlow === 'ASK_UNSATISFY_MEMO' && (
              <div className="chat_bubble_row system" style={{ marginTop: 4 }}>
                <div className="chat_bubble system">채팅창에 아쉬웠던 점을 입력해주세요.</div>
              </div>
            )}

            {endThanksMessage && (
              <div className="chat_bubble_row system" style={{ marginTop: 4 }}>
                <div className="chat_bubble system">{endThanksMessage}</div>
              </div>
            )}

            {sessionEnded && (
              <div className="chat_ended_notice">상담이 종료되었습니다. 다시 상담을 원하시면 채팅창을 새로 열어주세요.</div>
            )}

            <div ref={bottomRef} />
          </div>

          {consultStarted && !sessionEnded && endFlow === null && (
            <div className="chatbot_fixed_actions">
              <button type="button" className="chat_option_btn" onClick={handleAiConsult}>
                AI 상담
              </button>
              <button type="button" className="chat_option_btn chat_option_end" onClick={handleEnd}>
                상담 종료
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════ 화면2: 옵션 진행 (목록형) ══════════ */}
      {stage === 'OPTION' && (
        <>
          <div className="chatbot_body">
            {renderBubbles()}

            {currentOptions.length > 0 && endFlow === null && !sessionEnded && (
              <div className="chat_option_list">
                {currentOptions.map((opt) => (
                  <button key={opt.no} type="button" className="chat_option_list_item" onClick={() => handleSelectChild(opt)}>
                    <span>{opt.label}</span>
                    <span className="chat_option_arrow">›</span>
                  </button>
                ))}
              </div>
            )}

            {optionLoading && <div className="chat_loading">불러오는 중...</div>}

            {endFlow === 'ASK_SATISFY' && (
              <>
                <div className="chat_bubble_row system" style={{ marginTop: 4 }}>
                  <div className="chat_bubble system">상담이 만족스러우셨나요?</div>
                </div>
                <div className="chat_options">
                  <button type="button" className="chat_option_btn" onClick={() => handleSatisfy(1)}>
                    만족해요
                  </button>
                  <button type="button" className="chat_option_btn" onClick={() => handleSatisfy(0)}>
                    불만족스러워요
                  </button>
                </div>
              </>
            )}

            {endFlow === 'ASK_UNSATISFY_REASON' && (
              <>
                <div className="chat_bubble_row system" style={{ marginTop: 4 }}>
                  <div className="chat_bubble system">어떤 점이 아쉬우셨나요?</div>
                </div>
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
              </>
            )}

            {endFlow === 'ASK_UNSATISFY_MEMO' && (
              <div className="chat_bubble_row system" style={{ marginTop: 4 }}>
                <div className="chat_bubble system">채팅창에 아쉬웠던 점을 입력해주세요.</div>
              </div>
            )}

            {endThanksMessage && (
              <div className="chat_bubble_row system" style={{ marginTop: 4 }}>
                <div className="chat_bubble system">{endThanksMessage}</div>
              </div>
            )}

            {sessionEnded && (
              <div className="chat_ended_notice">상담이 종료되었습니다. 다시 상담을 원하시면 채팅창을 새로 열어주세요.</div>
            )}

            <div ref={bottomRef} />
          </div>

          {!sessionEnded && endFlow === null && (
            <div className="chatbot_fixed_actions">
              <button type="button" className="chat_option_btn" onClick={handleOtherQuestion}>
                다른 질문하기
              </button>
              <button type="button" className="chat_option_btn" onClick={handleAiConsult}>
                AI 상담
              </button>
              <button type="button" className="chat_option_btn chat_option_end" onClick={handleEnd}>
                상담 종료
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════ 화면3: AI 상담 ══════════ */}
      {stage === 'AI' && (
        <>
          <div className="chatbot_body">
            {renderBubbles()}

            {endFlow === 'ASK_ESCALATE_CONFIRM' && (
              <div className="chat_options">
                <button type="button" className="chat_option_btn" onClick={() => handleEscalateConfirm(true)}>
                  네
                </button>
                <button type="button" className="chat_option_btn" onClick={() => handleEscalateConfirm(false)}>
                  아니오
                </button>
              </div>
            )}

            {endFlow === 'ASK_SATISFY' && (
              <div className="chat_options">
                <button type="button" className="chat_option_btn" onClick={() => handleSatisfy(1)}>
                  만족해요
                </button>
                <button type="button" className="chat_option_btn" onClick={() => handleSatisfy(0)}>
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

            {aiLoading && <div className="chat_loading">답변을 생성하는 중...</div>}

            {sessionEnded && (
              <div className="chat_ended_notice">상담이 종료되었습니다. 다시 상담을 원하시면 채팅창을 새로 열어주세요.</div>
            )}

            <div ref={bottomRef} />
          </div>

          {!sessionEnded && endFlow === null && (
            <div className="chatbot_fixed_actions">
              <button type="button" className="chat_option_btn" onClick={handleOtherQuestion}>
                처음으로
              </button>
              <button type="button" className="chat_option_btn chat_option_end" onClick={handleEnd}>
                상담 종료
              </button>
            </div>
          )}
        </>
      )}

      {/* ── 입력창: AI상담 진행중이거나, 기타사유 직접입력 단계일 때만 활성화 ── */}
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