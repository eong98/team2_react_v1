import { useEffect, useState } from 'react';

interface ChatRoomSummary {
  sessionId: string;
  title: string;
  lastMessage: string;
  mode: 0 | 1 | 2; // 0 진행중 1 AI상담중 2 종료
  updatedAt: string;
}

interface ChatRoomListProps {
  onClose: () => void;
  onEnterRoom: (sessionId: string | null) => void;
}

export default function ChatRoomList({ onClose, onEnterRoom }: ChatRoomListProps) {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 백엔드 완성 후 실제 연동
    // axiosInstance.get<ChatRoomSummary[]>('/chat_session/list', { params: { mno, gno } })
    //   .then((res) => setRooms(res.data))
    //   .finally(() => setLoading(false));
    setLoading(false); // 목업: 백엔드 없어서 빈 목록으로 시작
  }, []);

  return (
    <>
      <div className="chatbot_header">
        <div className="chatbot_header_title">
          <span className="chatbot_status_dot" />
          <span>allimio 상담봇</span>
        </div>
        <button type="button" className="chatbot_close_btn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      <div className="chatbot_body">
        {loading ? (
          <div className="chat_loading">불러오는 중...</div>
        ) : rooms.length === 0 ? (
          <div className="chat_ended_notice">이전 상담 내역이 없습니다.</div>
        ) : (
          <div className="chatbot_room_list">
            {rooms.map((room) => (
              <button
                key={room.sessionId}
                type="button"
                className="chatbot_room_item"
                onClick={() => onEnterRoom(room.sessionId)}
              >
                <div className="chatbot_room_item_top">
                  <span className="chatbot_room_item_title">{room.title}</span>
                  <span className={`badge ${room.mode === 2 ? 'neutral' : 'success'}`}>
                    {room.mode === 2 ? '종료' : '진행중'}
                  </span>
                </div>
                <div className="chatbot_room_item_preview">{room.lastMessage}</div>
                <div className="chatbot_room_item_time">{room.updatedAt}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chatbot_fixed_actions">
        <button type="button" className="chat_ai_entry_btn" onClick={() => onEnterRoom(null)} style={{ width: '100%' }}>
          + 새 상담 시작하기
        </button>
      </div>
    </>
  );
}