import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { getOrCreateGno } from '../../ts/ChatGuest';
import { formatMessageDate, formatRelativeTime, type ChatSessionSummary } from '../../ts/ChatBot';
import { summarizeChat } from './ChatApi';
import { useNavigate } from 'react-router-dom';

interface ChatRoomListProps {
  onClose: () => void;
  onEnterRoom: (sessionId: string | null) => void;
  refreshSignal: { sno: string; ts: number } | null; // 추가
  aiRespondingSno: string | null; // 추가
}

export default function ChatRoomList({ onClose, onEnterRoom, refreshSignal, aiRespondingSno }: ChatRoomListProps) {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();
  const [rooms, setRooms] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);


  const loadRooms = () => {
    const params = mno ? { mno } : { gno: getOrCreateGno() };
    axiosInstance
      .get<ChatSessionSummary[]>('/chat_session/list', { params })
      .then((res) => setRooms(res.data))
      .catch((err) => {
        console.error('채팅방 목록 조회 실패:', err);
        setRooms([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // 실시간 알림이 오면 목록을 다시 조회해서, udate/안읽음 표시가 최신으로 반영되게 함
  useEffect(() => {
    if (!refreshSignal) return;
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);
  
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

  const hasUnread = (room: ChatSessionSummary): boolean => {
    if (!room.readat) return true; // 한 번도 안 읽었으면 안읽음
    return new Date(room.udate) > new Date(room.readat);
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
              <div key={room.no} className="chatbot_room_item" onClick={() => onEnterRoom(room.no)} role="button" tabIndex={0}>
                <div className="chatbot_room_item_top">
                  <span className="chatbot_room_item_title">
                    {room.stitle}
                    {hasUnread(room) && <span className="chatbot_unread_dot" />}
                    {aiRespondingSno === room.no && (
                      <span className="chatbot_typing_icon" title="AI가 답변을 작성 중입니다">
                        💬
                      </span>
                    )}
                  </span>
                  <span className={`badge ${room.cmode === 2 ? 'neutral' : 'success'}`}>{modeLabel(room.cmode)}</span>
                </div>
                <div className="chatbot_room_item_time">
                  <span>{formatMessageDate(room.udate)}</span>
                  <span>{formatRelativeTime(room.udate)}</span>
                </div>

              </div>
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