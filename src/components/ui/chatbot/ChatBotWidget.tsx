import { useEffect, useRef, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { getOrCreateGno } from '../../ts/ChatGuest';
import type { ChatSessionResponse, ChatSessionSummary } from '../../ts/ChatBot';
import ChatRoomList from './ChatRoomList';
import ChatRoom from './ChatRoom';
import { FASTAPI_BASE_URL } from './ChatApi';

type ChatView = 'LIST' | 'ROOM';

export default function ChatBotWidget() {
  const { no: mno } = GlobalStoreSession();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [view, setView] = useState<ChatView>('LIST');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);

  const [lastMessageSno, setLastMessageSno] = useState<{ sno: string; ts: number } | null>(null);

  useEffect(() => {
    const params = mno ? `mno=${mno}` : `gno=${getOrCreateGno()}`;
    const wsBaseUrl = FASTAPI_BASE_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBaseUrl}/api/chatbot/ws?${params}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        setHasUnread(true);
        setLastMessageSno({ sno: data.sno, ts: Date.now() });
      }
    };

    ws.onerror = (err) => {
      console.error('챗봇 WebSocket 연결 실패:', err);
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setAnimating(true));
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 220);
      return () => clearTimeout(timer);
    }
  }, [open]);

  /** FAB 버튼이 닫혀있을 때도 안읽음 여부를 미리 확인 */
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
    checkUnread(); // 위젯이 처음 뜰 때 한 번 확인
  }, []);


  const handleClose = () => {
    setOpen(false);
    checkUnread(); // 채팅방 닫을 때(=읽었을 수 있으니) 다시 확인
  };


  /** 대화방이 있으면 가장 최근 방을, 없으면 새 대화방(sessionId=null)을 엽니다. */
  const openMostRecentOrNew = () => {
    const params = mno ? { mno } : { gno: getOrCreateGno() };
    axiosInstance
      .get<ChatSessionSummary[]>('/chat_session/list', { params })
      .then((listRes) => {
        setActiveSessionId(listRes.data.length > 0 ? listRes.data[0].no : null);
        setView('ROOM');
      })
      .catch(() => {
        setActiveSessionId(null);
        setView('ROOM');
      });
  };

  /** 챗봇을 열 때: 진행중인 세션이 있으면 그 방으로, 없으면 가장 최근 방(또는 대화방이 아예 없으면 새 대화방)으로 엽니다. */
  const handleOpen = () => {
    setOpen(true);

    const params = mno ? { mno } : { gno: getOrCreateGno() };
    axiosInstance
      .get<ChatSessionResponse>('/chat_session/active', { params })
      .then((res) => {
        if (res.data) {
          setActiveSessionId(res.data.no);
          setView('ROOM');
          // if (res.data.endflow === 5) {
            // setSummarizing(true);
            // pollForSummaryResult(res.data.no);
          if (res.data.endflow === 6) {
            setAiRespondingSno(res.data.no);
            pollForAiResponse(res.data.no);
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
    checkUnread(); // 목록으로 돌아올 때도 갱신
  };

  const [aiRespondingSno, setAiRespondingSno] = useState<string | null>(null);
  const aiPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollForAiResponse = (sno: string) => {
    if (aiPollIntervalRef.current) clearInterval(aiPollIntervalRef.current);

    aiPollIntervalRef.current = setInterval(async () => {
      try {
        const res = await axiosInstance.get<ChatSessionResponse>(`/chat_session/${sno}`);
        if (res.data.endflow !== 6) {
          clearInterval(aiPollIntervalRef.current!);
          aiPollIntervalRef.current = null;
          setAiRespondingSno(null);
        }
      } catch (err) {
        console.error('AI 응답 상태 조회 실패:', err);
      }
    }, 2000);
  };

  /** ChatRoom이 질문 보낼 때 호출 — "지금 이 세션이 응답 대기 중"이라고 부모에게 알림 */
  const handleStartAiResponding = (sno: string) => {
    setAiRespondingSno(sno);
    pollForAiResponse(sno);
  };

  const handleAiRespondingDone = () => {
    if (aiPollIntervalRef.current) {
      clearInterval(aiPollIntervalRef.current);
      aiPollIntervalRef.current = null;
    }
    setAiRespondingSno(null);
  };

  useEffect(() => {
    return () => {
      if (aiPollIntervalRef.current) clearInterval(aiPollIntervalRef.current);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="chatbot_fab"
        onClick={open ? handleClose : handleOpen}
        aria-label={open ? '상담 챗봇 닫기' : '상담 챗봇 열기'}
      >
        {open ? '✕' : '💬'}
        {!open && hasUnread && <span className="chatbot_fab_unread_dot" />}
      </button>

      {visible && (
        <>
          <div className={`chatbot_overlay ${animating ? 'open' : 'closing'}`} onClick={handleClose} />

          <div className={`chatbot_widget ${animating ? 'open' : 'closing'}`}>
            {view === 'LIST' ? (
              <ChatRoomList 
                onClose={handleClose} 
                onEnterRoom={handleEnterRoom} 
                refreshSignal={lastMessageSno} // 추가
                aiRespondingSno={aiRespondingSno} // 추가
              />
            ) : (
              <ChatRoom 
                onClose={handleClose} 
                onBackToList={handleBackToList} 
                sessionId={activeSessionId}
                refreshSignal={lastMessageSno} // 추가
                onStartAiResponding={handleStartAiResponding} // 추가
                onAiRespondingDone={handleAiRespondingDone}   // 추가

              />
            )}
          </div>
        </>
      )}
    </>
  );

}
















//   const [summarizing, setSummarizing] = useState(false);
//   const handleRewriteInquiry = async (e: React.MouseEvent, room: ChatSessionSummary) => {
//   e.stopPropagation(); // 목록 항목 클릭(채팅방 진입)과 겹치지 않게
  
//   setSummarizing(true); // 로딩 시작
//   try {
//     const summary = await summarizeChat(room.no); // 대화 로그 기반 재요약
//     const checkUrl = mno ? 'user' : 'board';
//     onClose();
//     navigate(`/${checkUrl}/qa/new`, { state: { title: summary.title, content: summary.content, type: summary.type } });
//   } catch (err) {
//     console.error('재요약 실패:', err);
//     setSummarizing(false); // 실패 시 로딩 해제
//   }
// };

//       {summarizing && (
//         <div className="chatbot_summarizing_overlay">
//           <div className="chatbot_summarizing_spinner" />
//           <span>AI가 상담 내용을 요약하고 있습니다...</span>
//         </div>
//       )}
//                 {room.cmode === 2 && (
//                   <button type="button" className="chatbot_rewrite_btn" onClick={(e) => handleRewriteInquiry(e, room)}>
//                     📝 이 대화로 문의 다시 작성하기
//                   </button>
//                 )}