import { useEffect, useState } from 'react';
import ChatRoomList from './ChatRoomList';
import ChatRoom from './ChatRoom';

type ChatView = 'LIST' | 'ROOM';

interface ChatBotWidgetProps {
  mode?: 'floating' | 'preview'; // 기본값 floating(기존 FAB 동작), preview는 관리자 미리보기용
}

export default function ChatBotWidget({ mode = 'floating' }: ChatBotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [view, setView] = useState<ChatView>('LIST');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null); // 목록에서 선택한 채팅방

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

  useEffect(() => {
  if (mode === 'preview') {
    setOpen(true);
    setVisible(true);
    setAnimating(true); // 애니메이션 없이 항상 열린 상태로 고정
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mode]);

  const handleClose = () => setOpen(false);
  const handleOpen = () => setOpen(true);

  // 목록에서 "새 채팅 시작" 또는 기존 채팅방 클릭
  const handleEnterRoom = (sessionId: string | null) => {
    setActiveSessionId(sessionId); // null이면 새 채팅
    setView('ROOM');
  };

  // 채팅방에서 "목록으로" 버튼
  const handleBackToList = () => {
    setView('LIST');
    setActiveSessionId(null);
  };


  if (mode === 'floating') {
    return (
      <>
        <button
          type="button"
          className="chatbot_fab"
          onClick={open ? handleClose : handleOpen}
          aria-label={open ? '상담 챗봇 닫기' : '상담 챗봇 열기'}
        >
          {open ? '✕' : '💬'}
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

  return (
    <div className="chatbot_widget chatbot_widget_preview">
      <ChatRoom onClose={handleClose} onBackToList={handleBackToList} sessionId={activeSessionId} mode='preview' />
    </div>
  )

}