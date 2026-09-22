import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { getOrCreateGno } from '../../ts/ChatGuest';
import type { ChatSessionResponse, ChatSessionSummary } from '../../ts/ChatBot';
import ChatRoomList from './ChatRoomList';
import ChatRoom from './ChatRoom';

type ChatView = 'LIST' | 'ROOM';

export default function ChatBotWidget() {
  const { no: mno } = GlobalStoreSession();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [view, setView] = useState<ChatView>('LIST');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);

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


  /** 챗봇을 열 때, 진행 중인 세션이 있으면 그 채팅방으로 바로 이어서 열고,
   *  없으면 목록 화면부터 보여줍니다. */
  const handleOpen = () => {
    setOpen(true);

    const params = mno ? { mno } : { gno: getOrCreateGno() };
    axiosInstance
      .get<ChatSessionResponse>('/chat_session/active', { params })
      .then((res) => {
        if (res.data) {
          setActiveSessionId(res.data.no);
          setView('ROOM');
        } else {
          setView('LIST');
        }
      })
      .catch(() => {
        // 204(진행중 세션 없음) 등은 여기로도 떨어질 수 있음 — 목록으로
        setView('LIST');
      });
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
              <ChatRoomList onClose={handleClose} onEnterRoom={handleEnterRoom} />
            ) : (
              <ChatRoom onClose={handleClose} onBackToList={handleBackToList} sessionId={activeSessionId} />
            )}
          </div>
        </>
      )}
    </>
  );

}