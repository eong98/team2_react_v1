import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { getOrCreateGno } from '../../ts/ChatGuest';
import { formatMessageDate, formatRelativeTime, type ChatSessionSummary } from '../../ts/ChatBot';

/** ChatRoomList 컴포넌트의 Props 타입 정의 */
interface ChatRoomListProps {
  onClose: () => void; // 챗봇 위젯 전체 닫기 콜백
  onEnterRoom: (sessionId: string | null) => void; // 특정 방으로 진입하거나 새 방(null)을 생성하도록 부모에게 요청하는 콜백
  refreshSignal: { sno: string; ts: number } | null; // 부모(웹소켓)로부터 전달받는 실시간 신호 (새 메시지 도착 등)
  aiRespondingSno: string | null; // 현재 AI가 답변을 작성 중인 세션 ID (타이핑 아이콘 표시용)
}

export default function ChatRoomList({ onClose, onEnterRoom, refreshSignal, aiRespondingSno }: ChatRoomListProps) {
  const { no: mno } = GlobalStoreSession(); // 로그인한 사용자 ID (회원번호)
  const [rooms, setRooms] = useState<ChatSessionSummary[]>([]); // 조회된 채팅방 목록
  const [loading, setLoading] = useState(true); // 데이터 로딩 상태

  // ---------------------------------------------------------------------------
  // 1. 백엔드로부터 채팅방 목록 조회 (Fetch API)
  // ---------------------------------------------------------------------------
  const loadRooms = () => {
    // 회원(mno) 정보가 존재하면 mno, 없을 경우 비회원 식별자(gno) 적용
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

  // 컴포넌트 최초 마운트 시 채팅방 목록 로드
  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // 2. 실시간 이벤트 수신에 따른 목록 자동 갱신 (Auto Refresh)
  // ---------------------------------------------------------------------------
  // 웹소켓 등으로 새로운 메시지가 도착하면 목록을 즉시 다시 조회하여
  // 최신 업데이트 날짜(udate) 및 안 읽음(N) 뱃지를 최신 상태로 재반영합니다.
  useEffect(() => {
    if (!refreshSignal) return;
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);
  
  // ---------------------------------------------------------------------------
  // 3. 유틸리티 및 헬퍼 함수
  // ---------------------------------------------------------------------------
  /** 상담 세션 상태 라벨 변환 (cmode === 2 : 종료, 그 외 : 진행중) */
  const modeLabel = (cmode: 0 | 1 | 2) => (cmode === 2 ? '종료' : '진행중');

  /** 현재 목록 중 '진행중(종료되지 않은)' 상태의 방이 존재하는지 검사 */
  const activeRoom = rooms.find((r) => r.cmode !== 2);

  /** 하단 버튼 클릭 시 처리 (진행중인 방이 있으면 그 방으로, 없으면 새 방 생성) */
  const handleNewChatClick = () => {
    if (activeRoom) {
      // 진행중인 방이 이미 있다면 새로 생성하지 않고 해당 방으로 이동
      onEnterRoom(activeRoom.no);
    } else {
      // 진행중인 방이 없을 때는 null을 넘겨 새 세션을 생성하도록 유도
      onEnterRoom(null);
    }
  };

  /** 개별 채팅방의 안 읽은 메시지 존재 여부 판단 */
  const hasUnread = (room: ChatSessionSummary): boolean => {
    if (!room.readat) return true; // 마지막으로 읽은 시각(readat)이 없으면 안 읽음 처리
    // 최신 업데이트 시각(udate)이 읽은 시각(readat)보다 이후인 경우 안 읽음 처리
    return new Date(room.udate) > new Date(room.readat);
  };

  // ---------------------------------------------------------------------------
  // 4. UI 렌더링
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* 챗봇 헤더 영역 */}
      <div className="chatbot_header">
        <div className="chatbot_header_title">
          <span>챗봇상담</span>
        </div>
        <button type="button" className="chatbot_close_btn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      {/* 챗봇 바디 영역 (상담 목록) */}
      <div className="chatbot_body">
        {loading ? (
          /* 1. 로딩 상태 */
          <div className="chat_loading">불러오는 중...</div>
        ) : rooms.length === 0 ? (
          /* 2. 상담 이력이 없을 때 */
          <div className="chat_ended_notice">이전 상담 내역이 없습니다.</div>
        ) : (
          /* 3. 상담 목록 리스트 */
          <div className="chatbot_room_list">
            {rooms.map((room) => (
              <div 
                key={room.no} 
                className="chatbot_room_item" 
                onClick={() => onEnterRoom(room.no)} 
                role="button" 
                tabIndex={0}
              >
                {/* 방 아이템 상단 (제목, 안읽음 뱃지, AI 작성중 아이콘, 상태 뱃지) */}
                <div className="chatbot_room_item_top">
                  <span className="chatbot_room_item_title">
                    {room.stitle}
                    {/* 안 읽은 메시지가 있을 때 N 뱃지 표시 */}
                    {hasUnread(room) && <span className="chatbot_room_unread_badge">N</span>}
                    {/* 해당 방이 현재 AI가 답변을 생성 중인 상태라면 말풍선 타이핑 아이콘 표시 */}
                    {aiRespondingSno === room.no && (
                      <span className="chatbot_typing_icon" title="AI가 답변을 작성 중입니다">
                        💬
                      </span>
                    )}
                  </span>
                  {/* 진행중/종료 상태 뱃지 */}
                  <span className={`badge ${room.cmode === 2 ? 'neutral' : 'success'}`}>
                    {modeLabel(room.cmode)}
                  </span>
                </div>

                {/* 방 아이템 하단 (업데이트 날짜 및 상대 시간) */}
                <div className="chatbot_room_item_time">
                  <span>{formatMessageDate(room.udate)}</span>
                  <span>{formatRelativeTime(room.udate)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 챗봇 하단 고정 액션 버튼 */}
      <div className="chatbot_fixed_actions">
        {activeRoom ? (
          /* 진행 중인 세션이 존재하는 경우 */
          <button type="button" className="chat_ai_entry_btn" onClick={handleNewChatClick} style={{ width: '100%' }}>
            진행 중인 상담 이어가기
          </button>
        ) : (
          /* 모든 세션이 종료되었거나 이력이 없는 경우 */
          <button type="button" className="chat_ai_entry_btn" onClick={handleNewChatClick} style={{ width: '100%' }}>
            + 새 상담 시작하기
          </button>
        )}
      </div>
    </>
  );
}