import { useEffect, useRef, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { getOrCreateGno } from '../../ts/ChatGuest';
import type { ChatSessionResponse, ChatSessionSummary } from '../../ts/ChatBot';
import ChatRoomList from './ChatRoomList';
import ChatRoom from './ChatRoom';
import { FASTAPI_BASE_URL } from './ChatApi';

// 챗봇 위젯 내부 화면 상태 타입 ('LIST': 대화목록, 'ROOM': 개별 채팅방)
type ChatView = 'LIST' | 'ROOM';

export default function ChatBotWidget() {
  // ---------------------------------------------------------------------------
  // 1. 상태(State) 및 사용자 식별 정보 관리
  // ---------------------------------------------------------------------------
  const { no: mno } = GlobalStoreSession(); // 로그인한 회원의 회원번호 (없으면 null/undefined)
  const [open, setOpen] = useState(false); // 플로팅 버튼(FAB)을 통한 위젯 열림/닫힘 상태
  const [visible, setVisible] = useState(false); // DOM 상에서 위젯 마운트/언마운트 여부 (트랜지션용)
  const [animating, setAnimating] = useState(false); // CSS 슬라이드 애니메이션 제어용 클래스 flag
  const [view, setView] = useState<ChatView>('LIST'); // 현재 보여줄 뷰 화면
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null); // 현재 선택된 채팅방 세션 ID (sno)
  const [hasUnread, setHasUnread] = useState(false); // 안 읽은 메시지 존재 여부 (FAB 뱃지용)

  // 실시간으로 수신된 마지막 메시지 정보 (하위 컴포넌트에 리프레시 신호 전달용)
  const [lastMessageSno, setLastMessageSno] = useState<{ sno: string; ts: number } | null>(null);

  // 현재 AI가 응답 작성 중(endflow = 6)인 세션 번호
  const [aiRespondingSno, setAiRespondingSno] = useState<string | null>(null);
  // AI 응답 완료 여부를 확인하는 폴링 타이머 (WebSocket이 놓쳤을 때의 안전장치)
  const aiPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // 2. 실시간 웹소켓(WebSocket) 연결 설정
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 회원일 경우 mno, 비회원일 경우 localstorage 기반 gno 생성/조회하여 파라미터 구성
    const params = mno ? `mno=${mno}` : `gno=${getOrCreateGno()}`;
    const wsBaseUrl = FASTAPI_BASE_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBaseUrl}/api/chatbot/ws?${params}`);

    // 웹소켓 메시지 수신 처리
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        setHasUnread(true); // 안읽은 메시지 뱃지 표시
        setLastMessageSno({ sno: data.sno, ts: Date.now() }); // 타임스탬프와 함께 하위 컴포넌트에 알림
        stopAiPolling(); // 폴링 중이었다면 정리
        setAiRespondingSno((prev) => (prev === data.sno ? null : prev)); // AI 답변 완료 알림 수신 시 로딩 상태 해제
      }
    };

    // 웹소켓 연결 에러 처리
    ws.onerror = (err) => {
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.CLOSING) {
        return;
      }
      console.error('챗봇 WebSocket 연결 실패:', err);
    };

    // 언마운트/사용자 변경 시 웹소켓 안전하게 닫기 (Cleanup)
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      }
    };
    // 로그인/로그아웃으로 mno가 바뀌면 이전 사용자 식별자로 연결된 소켓을 닫고 새로 연결
    // (안 그러면 로그인 후에도 비회원(gno) 채널로만 알림을 받아 실시간 갱신이 안 됨)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno]);

  // ---------------------------------------------------------------------------
  // 2-1. AI 응답 완료 폴링 (WebSocket 알림을 놓쳤을 때의 안전장치)
  // ---------------------------------------------------------------------------
  // WebSocket 하나만 믿으면, 연결이 잠깐 끊기거나 탭이 백그라운드로 가서
  // 메시지를 못 받은 경우 aiRespondingSno가 영원히 안 풀릴 수 있습니다.
  // 그래서 AI 응답 대기가 시작되면 2초마다 세션 상태를 직접 확인해서,
  // ENDFLOW가 6(응답중)이 아니게 되면 로딩을 해제합니다.
  const pollForAiResponse = (sno: string) => {
    if (aiPollIntervalRef.current) {
      clearInterval(aiPollIntervalRef.current);
    }

    aiPollIntervalRef.current = setInterval(async () => {
      try {
        const res = await axiosInstance.get<ChatSessionResponse>(`/chat_session/${sno}`);
        if (res.data.endflow !== 6) {
          clearInterval(aiPollIntervalRef.current!);
          aiPollIntervalRef.current = null;
          setAiRespondingSno((prev) => (prev === sno ? null : prev));
          // ChatRoom은 자체 폴링이 없으므로, 완료 감지를 refreshSignal로도 알려서
          // 열려있는 채팅방이 최신 로그로 갱신되게 한다 (WebSocket과 동일한 경로).
          setLastMessageSno({ sno, ts: Date.now() });
        }
      } catch (err) {
        console.error('AI 응답 상태 조회 실패:', err);
      }
    }, 2000);
  };

  const stopAiPolling = () => {
    if (aiPollIntervalRef.current) {
      clearInterval(aiPollIntervalRef.current);
      aiPollIntervalRef.current = null;
    }
  };

  // 컴포넌트가 사라질 때 폴링도 정리
  useEffect(() => {
    return () => stopAiPolling();
  }, []);

  // ---------------------------------------------------------------------------
  // 3. 위젯 열림/닫힘 UI 애니메이션 트랜지션 처리
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      setVisible(true); // DOM 마운트
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setAnimating(true));
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    } else {
      setAnimating(false); // closing 애니메이션 실행
      const timer = setTimeout(() => setVisible(false), 220);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ---------------------------------------------------------------------------
  // 4. 안 읽은 메시지 확인 (Unread Check)
  // ---------------------------------------------------------------------------
  const checkUnread = () => {
    const params = mno ? { mno } : { gno: getOrCreateGno() };
    axiosInstance
      .get<ChatSessionSummary[]>('/chat_session/list', { params })
      .then((res) => {
        const unread = res.data.some((room) => !room.readat || new Date(room.udate) > new Date(room.readat));
        setHasUnread(unread);
      })
      .catch(() => setHasUnread(false));
  };

  useEffect(() => {
    checkUnread(); // 초기 안 읽음 상태 확인 (로그인/로그아웃 시 다시 확인)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno]);

  // ---------------------------------------------------------------------------
  // 5. 위젯 열기/닫기 및 세션 진입 로직
  // ---------------------------------------------------------------------------
  const handleClose = () => {
    setOpen(false);
    checkUnread();
  };

  const openMostRecentOrNew = () => {
    const params = mno ? { mno } : { gno: getOrCreateGno() };
    axiosInstance
      .get<ChatSessionSummary[]>('/chat_session/list', { params })
      .then((listRes) => {
        // 진행 중(cmode != 2)인 방만 이어서 열고, 모두 종료됐으면 새 상담(null)으로 시작
        const target = listRes.data.find((room) => room.cmode !== 2) ?? null;
        setActiveSessionId(target ? target.no : null);
        setView('ROOM');

        // 가장 최근 세션이 마침 AI 응답 생성 중(endflow=6)이면, 로딩 표시/폴링도 복원
        if (target && target.endflow === 6) {
          setAiRespondingSno(target.no);
          pollForAiResponse(target.no);
        }
      })
      .catch(() => {
        setActiveSessionId(null);
        setView('ROOM');
      });
  };

  const handleOpen = () => {
    setOpen(true);

    const params = mno ? { mno } : { gno: getOrCreateGno() };
    axiosInstance
      .get<ChatSessionResponse>('/chat_session/active', { params })
      .then((res) => {
        if (res.data) {
          setActiveSessionId(res.data.no);
          setView('ROOM');

          // 세션 재진입 시 아직 AI가 답변 생성 중인 상태(endflow = 6)라면 로딩 상태 복원 + 폴링 재개
          if (res.data.endflow === 6) {
            setAiRespondingSno(res.data.no);
            pollForAiResponse(res.data.no);
          } else {
            stopAiPolling();
            setAiRespondingSno(null);
          }
        } else {
          openMostRecentOrNew();
        }
      })
      .catch(() => openMostRecentOrNew());
  };

  const handleEnterRoom = (sessionId: string | null) => {
    setActiveSessionId(sessionId);
    setView('ROOM');
  };

  const handleBackToList = () => {
    setView('LIST');
    setActiveSessionId(null);
    checkUnread();
  };

  // ---------------------------------------------------------------------------
  // 6. AI 답변 상태 핸들러 (WebSocket 방식으로 전달)
  // ---------------------------------------------------------------------------
  /** ChatRoom 컴포넌트에서 질문/인사 요청 시작 시 호출 */
  const handleStartAiResponding = (sno: string) => {
    setAiRespondingSno(sno);
    pollForAiResponse(sno); // WebSocket이 놓쳐도 폴링으로 반드시 해제되도록
  };

  /** AI 응답 완료 시 호출 (본인 탭에서 직접 요청을 보낸 경우, 응답이 오는 즉시 호출됨) */
  const handleAiRespondingDone = () => {
    stopAiPolling();
    setAiRespondingSno(null);
  };

  // ---------------------------------------------------------------------------
  // 7. UI 렌더링
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* 화면 우측 하단 플로팅 버튼 (FAB) */}
      <button
        type="button"
        className="chatbot_fab"
        onClick={open ? handleClose : handleOpen}
        aria-label={open ? '상담 챗봇 닫기' : '상담 챗봇 열기'}
      >
        {open ? '✕' : '💬'}
        {!open && hasUnread && <span className="chatbot_fab_unread_badge">N</span>}
      </button>

      {/* 챗봇 위젯 모달 및 오버레이 */}
      {visible && (
        <>
          <div className={`chatbot_overlay ${animating ? 'open' : 'closing'}`} onClick={handleClose} />

          <div className={`chatbot_widget ${animating ? 'open' : 'closing'}`}>
            {view === 'LIST' ? (
              <ChatRoomList
                onClose={handleClose}
                onEnterRoom={handleEnterRoom}
                refreshSignal={lastMessageSno}
                aiRespondingSno={aiRespondingSno}
              />
            ) : (
              <ChatRoom
                onClose={handleClose}
                onBackToList={handleBackToList}
                sessionId={activeSessionId}
                refreshSignal={lastMessageSno}
                onStartAiResponding={handleStartAiResponding}
                onAiRespondingDone={handleAiRespondingDone}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}