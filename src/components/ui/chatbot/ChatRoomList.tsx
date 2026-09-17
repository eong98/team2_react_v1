import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { getOrCreateGno } from '../../ts/ChatGuest';
import type { ChatSessionSummary } from '../../ts/ChatBot';

interface ChatRoomListProps {
  onClose: () => void;
  onEnterRoom: (sessionId: string | null) => void;
}

export default function ChatRoomList({ onClose, onEnterRoom }: ChatRoomListProps) {
  const { no: mno } = GlobalStoreSession();
  const [rooms, setRooms] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = mno ? { mno } : { gno: getOrCreateGno() };

    axiosInstance
      .get<ChatSessionSummary[]>('/chat_session/list', { params })
      .then((res) => setRooms(res.data))
      .catch((err) => {
        console.error('채팅방 목록 조회 실패:', err);
        setRooms([]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeLabel = (cmode: 0 | 1 | 2) => (cmode === 2 ? '종료' : '진행중');

  // 진행중(cmode !== 2)인 방이 있는지 확인
  const activeRoom = rooms.find((r) => r.cmode !== 2);

  const handleNewChatClick = () => {
    if (activeRoom) {
      // 진행중인 방이 있으면 새로 시작하지 않고 그 방으로 이동
      onEnterRoom(activeRoom.no);
    } else {
      onEnterRoom(null);
    }
  };


  return (
    <>
      <div className="chatbot_header">
        <div className="chatbot_header_title">
          {/* <span className="chatbot_status_dot" /> */}
          <span>챗봇상담</span>
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
                key={room.no}
                type="button"
                className="chatbot_room_item"
                onClick={() => onEnterRoom(room.no)}
              >
                <div className="chatbot_room_item_top">
                  <span className="chatbot_room_item_title">{room.title}</span>
                  <span className={`badge ${room.cmode === 2 ? 'neutral' : 'success'}`}>{modeLabel(room.cmode)}</span>
                </div>
                <div className="chatbot_room_item_time">{room.udate}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chatbot_fixed_actions">
        {activeRoom ? (
          <button type="button" className="chat_ai_entry_btn" onClick={handleNewChatClick} style={{ width: '100%' }}>
            진행 중인 상담 이어가기
          </button>
        ) : (
          <button type="button" className="chat_ai_entry_btn" onClick={handleNewChatClick} style={{ width: '100%' }}>
            + 새 상담 시작하기
          </button>
        )}
      </div>
    </>
  );
}