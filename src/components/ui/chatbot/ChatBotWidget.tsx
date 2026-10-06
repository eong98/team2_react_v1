import { useEffect, useRef, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { getOrCreateGno } from '../../ts/ChatGuest';
import type { ChatSessionResponse, ChatSessionSummary } from '../../ts/ChatBot';
import ChatRoomList from './ChatRoomList';
import ChatRoom from './ChatRoom';
import { fastapiWsUrl } from './ChatApi';
import { backoffDelay } from './aiServer';

/** AI 답변 대기 폴링: 기본 간격 / 연속 실패 허용 횟수 / 최대 대기 시간 */
const AI_POLL_INTERVAL_MS = 2000;
const AI_POLL_MAX_FAILS = 8;
const AI_POLL_MAX_WAIT_MS = 3 * 60 * 1000;
/** WebSocket 연결 유지 신호(ping) 간격 */
const WS_PING_INTERVAL_MS = 25000;
/** 서버가 꺼져 있을 때 연속 재연결 시도 횟수 — 넘으면 멈추고, 위젯을 다시 열거나 탭으로 돌아오면 재시도 */
const WS_MAX_RETRIES = 5;

// 챗봇 위젯 내부 화면 상태 타입 ('LIST': 대화목록, 'ROOM': 개별 채팅방)
type ChatView = 'LIST' | 'ROOM';

interface ChatBotWidgetProps {
  /** true면 오른쪽 하단 배치 (관리자·관제 화면) / 기본은 오른쪽 세로 가운데 (메인 화면) */
  corner?: boolean;
}

export default function ChatBotWidget({ corner = false }: ChatBotWidgetProps) {
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
  const aiPollTimerRef = useRef<number | null>(null);
  // AI 서버(FastAPI) 연결 상태 — WebSocket 연결 여부로 판단, 끊기면 AI 기능만 잠시 막음
  const [aiOnline, setAiOnline] = useState(true);

  // ---------------------------------------------------------------------------
  // 2. 실시간 웹소켓(WebSocket) 연결 설정
  // ---------------------------------------------------------------------------
  // WebSocket은 필요할 때만 연결 — 위젯이 열려 있거나, 위젯을 닫았어도 AI 답변을 기다리는 중일 때.
  // 그냥 사이트를 둘러보는 동안에는 연결 시도가 없어서, AI 서버가 꺼져 있어도 콘솔 오류가 쌓이지 않음.
  // (안 읽음 N 표시는 페이지 진입·위젯 닫을 때 checkUnread가 REST로 확인)
  const needSocket = open || aiRespondingSno !== null;

  useEffect(() => {
    if (!needSocket) {
      setAiOnline(true); // 연결 안 하는 동안엔 "끊김" 안내를 띄우지 않음 (다시 열면 연결 결과로 갱신)
      return;
    }
    // 회원일 경우 mno, 비회원일 경우 localstorage 기반 gno 생성/조회하여 파라미터 구성
    const params = mno ? `mno=${mno}` : `gno=${getOrCreateGno()}`;
    const wsUrl = fastapiWsUrl(`/api/chatbot/ws?${params}`); // http→ws, https→wss (프록시면 현재 사이트 기준)

    let ws: WebSocket | null = null;
    let retry = 0; // 연속 재연결 시도 횟수 → 대기 시간 1초, 2초, 4초 … 최대 30초
    let wasOffline = false;
    let reconnectTimer: number | undefined;
    let pingTimer: number | undefined;
    let stopped = false; // 화면을 떠나거나 사용자가 바뀌어 일부러 닫은 경우 → 재연결 안 함

    const scheduleReconnect = () => {
      if (stopped || document.hidden) return; // 탭이 안 보이면 쉬었다가, 다시 보일 때 바로 연결
      if (retry >= WS_MAX_RETRIES) return; // 계속 실패하면 멈춤 → 위젯을 다시 열거나 탭으로 돌아오면 재시도
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(connect, backoffDelay(retry++));
    };

    const connect = () => {
      if (stopped) return;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        retry = 0;
        setAiOnline(true);
        if (wasOffline) {
          // 끊겨 있던 동안 놓친 알림이 있을 수 있으니 목록/열린 방을 한 번 새로고침
          wasOffline = false;
          setLastMessageSno({ sno: '', ts: Date.now() });
        }
        window.clearInterval(pingTimer);
        pingTimer = window.setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send('ping');
        }, WS_PING_INTERVAL_MS);
      };

      // 웹소켓 메시지 수신 처리
      ws.onmessage = (event) => {
        if (event.data === 'pong') return; // 연결 유지 응답
        const data = JSON.parse(event.data);
        if (data.type === 'session_updated') {
          // 상담 종료 후 제목 요약 완료 등 — 목록만 새로고침 (새 메시지가 아니므로 안읽음 표시 안 함)
          setLastMessageSno({ sno: data.sno, ts: Date.now() });
          return;
        }
        if (data.type === 'ai_responding') {
          // 다른 브라우저·기기에서 같은 상담방에 AI 질문을 보냄 → 그 방을 새로 불러와 질문과 "입력 중" 표시
          setLastMessageSno({ sno: data.sno, ts: Date.now() });
          setAiRespondingSno(data.sno);
          return;
        }
        if (data.type === 'new_message') {
          setHasUnread(true); // 안읽은 메시지 뱃지 표시
          setLastMessageSno({ sno: data.sno, ts: Date.now() }); // 타임스탬프와 함께 하위 컴포넌트에 알림
          stopAiPolling(); // 폴링 중이었다면 정리
          setAiRespondingSno((prev) => (prev === data.sno ? null : prev)); // AI 답변 완료 알림 수신 시 로딩 상태 해제
        }
      };

      // 서버가 꺼져 있거나 연결이 끊기면 onerror 다음에 항상 onclose가 옴 → 재연결은 onclose에서만 처리
      // (브라우저가 콘솔에 찍는 "WebSocket connection failed"는 코드로 숨길 수 없어서, 재시도 간격을 늘려 덜 쌓이게 함)
      ws.onerror = () => {};
      ws.onclose = () => {
        window.clearInterval(pingTimer);
        if (stopped) return;
        wasOffline = true;
        setAiOnline(false);
        scheduleReconnect();
      };
    };

    // 탭이 다시 보이면 끊겨 있던 연결을 바로 재시도
    const onVisibilityChange = () => {
      if (!document.hidden && !stopped && (!ws || ws.readyState === WebSocket.CLOSED)) {
        retry = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    connect();

    // 언마운트/사용자 변경 시 정리 — 재연결 예약·ping 타이머 해제 후 소켓 닫기
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearTimeout(reconnectTimer);
      window.clearInterval(pingTimer);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws?.readyState === WebSocket.CONNECTING) {
        const pending = ws;
        pending.onopen = () => pending.close();
      }
    };
    // 로그인/로그아웃으로 mno가 바뀌면 이전 사용자 식별자로 연결된 소켓을 닫고 새로 연결
    // (안 그러면 로그인 후에도 비회원(gno) 채널로만 알림을 받아 실시간 갱신이 안 됨)
    // needSocket이 false가 되면(위젯 닫힘 + 기다리는 답변 없음) 정리 함수가 연결을 끊음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, needSocket]);

  // ---------------------------------------------------------------------------
  // 2-1. AI 응답 완료 폴링 (WebSocket 알림을 놓쳤을 때의 안전장치)
  // ---------------------------------------------------------------------------
  // WebSocket 하나만 믿으면, 연결이 잠깐 끊기거나 탭이 백그라운드로 가서
  // 메시지를 못 받은 경우 aiRespondingSno가 영원히 안 풀릴 수 있습니다.
  // 그래서 AI 응답 대기가 시작되면 2초마다 세션 상태를 직접 확인해서,
  // ENDFLOW가 6(응답중)이 아니게 되면 로딩을 해제합니다.
  // 실패하면 간격을 늘리고(최대 30초), 연속 실패가 많거나 3분이 지나면 멈춰서 오류가 계속 쌓이지 않게 합니다.
  const pollForAiResponse = (sno: string) => {
    stopAiPolling();
    const startedAt = Date.now();
    let fails = 0;

    const giveUp = () => {
      aiPollTimerRef.current = null;
      setAiRespondingSno((prev) => (prev === sno ? null : prev));
    };

    const tick = async () => {
      try {
        const res = await axiosInstance.get<ChatSessionResponse>(`/chat_session/${sno}`);
        fails = 0;
        if (res.data.endflow !== 6) {
          aiPollTimerRef.current = null;
          setAiRespondingSno((prev) => (prev === sno ? null : prev));
          // ChatRoom은 자체 폴링이 없으므로, 완료 감지를 refreshSignal로도 알려서
          // 열려있는 채팅방이 최신 로그로 갱신되게 한다 (WebSocket과 동일한 경로).
          setLastMessageSno({ sno, ts: Date.now() });
          return;
        }
      } catch (err) {
        fails += 1;
        console.warn(`AI 응답 상태 조회 실패 (${fails}/${AI_POLL_MAX_FAILS}):`, err);
        if (fails >= AI_POLL_MAX_FAILS) return giveUp();
      }
      if (Date.now() - startedAt > AI_POLL_MAX_WAIT_MS) return giveUp();
      aiPollTimerRef.current = window.setTimeout(tick, fails ? backoffDelay(fails) : AI_POLL_INTERVAL_MS);
    };

    aiPollTimerRef.current = window.setTimeout(tick, AI_POLL_INTERVAL_MS);
  };

  const stopAiPolling = () => {
    if (aiPollTimerRef.current) {
      window.clearTimeout(aiPollTimerRef.current);
      aiPollTimerRef.current = null;
    }
  };

  // 컴포넌트가 사라질 때 폴링도 정리
  useEffect(() => {
    return () => stopAiPolling();
  }, []);

  // ---------------------------------------------------------------------------
  // 2-2. 위젯이 열려 있는 동안 바깥(페이지) 스크롤 잠금
  // ---------------------------------------------------------------------------
  // 스크롤바가 사라지며 화면이 옆으로 밀리지 않게 스크롤바 폭만큼 오른쪽 여백을 채움.
  // 닫히거나 화면을 떠나면 원래 값으로 복원.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPaddingRight = html.style.paddingRight;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    if (scrollbarWidth > 0) html.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

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
        // 상담 이력이 없으면 서버가 빈 목록([])을 돌려줌 → 안 읽음 없음.
        // 혹시 목록이 아닌 응답이 와도 오류 없이 "안 읽음 없음"으로 처리
        const rooms = Array.isArray(res.data) ? res.data : [];
        const unread = rooms.some((room) => !room.readat || new Date(room.udate) > new Date(room.readat));
        setHasUnread(unread);
      })
      .catch((err) => {
        // 서버가 꺼져 있는 등 확인 실패 — 화면 동작엔 영향 없으니 경고만 남기고 N 표시는 끔
        console.warn('챗봇 안 읽음 확인 실패:', err);
        setHasUnread(false);
      });
  };

  useEffect(() => {
    // 사이트 진입(위젯이 처음 붙을 때)·로그인/로그아웃 시 안 읽음 확인
    // 위젯이 닫혀 있으면 WebSocket을 연결하지 않으므로, N 표시는 이 확인으로만 갱신됨
    checkUnread();
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
        className={`chatbot_fab${open ? ' is_open' : ''}${corner ? ' is_corner' : ''}`}
        onClick={open ? handleClose : handleOpen}
        aria-label={open ? '상담 챗봇 닫기' : '상담 챗봇 열기'}
        title={open ? '상담 닫기' : '알리미에게 물어보기'}
      >
        {open ? (
          // 닫기 (X)
          <svg className="chatbot_fab_icon" viewBox="0 0 24 24" width="24" height="24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          // 챗봇 캐릭터 '알리미' 얼굴 — 안테나 + 둥근 머리 + 눈(깜빡임) + 웃는 입
          <svg className="chatbot_fab_icon" viewBox="0 0 32 32" width="32" height="32" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 4.5v3.5" />
            <circle className="chatbot_fab_antenna" cx="16" cy="3.5" r="1.6" fill="currentColor" stroke="none" />
            <rect x="5" y="8" width="22" height="17" rx="6" />
            <path d="M3 14.5v4M29 14.5v4" />
            <g className="chatbot_fab_eyes" fill="currentColor" stroke="none">
              <circle cx="11.5" cy="15" r="2" />
              <circle cx="20.5" cy="15" r="2" />
            </g>
            <path d="M12.5 20c1 1 2.1 1.4 3.5 1.4s2.5-.4 3.5-1.4" />
          </svg>
        )}
        {!open && hasUnread && <span className="chatbot_fab_unread_badge">N</span>}
      </button>

      {/* 챗봇 위젯 모달 및 오버레이 */}
      {visible && (
        <>
          <div className={`chatbot_overlay ${animating ? 'open' : 'closing'}`} onClick={handleClose} />

          <div className={`chatbot_widget ${animating ? 'open' : 'closing'}${corner ? ' is_corner' : ''}`}>
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
                aiOnline={aiOnline}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}