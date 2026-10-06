/* ---------------------------------------------------------------------
   같은 브라우저의 여러 탭·창 사이 챗봇 상담 동기화.

   같은 회원(mno) / 같은 브라우저(gno)로 챗봇을 여러 탭에서 열면 같은 상담방을 함께 쓰는데,
   실시간 알림(웹소켓)은 AI 답변 도착 때만 와서 메뉴 선택·상담 종료 같은 동작이 다른 탭에
   반영되지 않았습니다. 상담 상태를 바꾼 탭이 BroadcastChannel로 알리면 다른 탭이 새로 불러옵니다.
   (서버를 거치지 않는 브라우저 기능 — 다른 기기는 ChatRoom의 포커스 갱신으로 처리)

   보내는 쪽과 받는 쪽이 같은 채널 객체를 쓰므로, 자기 탭이 보낸 알림은 자기에게 오지 않습니다.
--------------------------------------------------------------------- */

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('allimio_chat_sync') : null;

/** 상담 상태가 바뀌었음을 다른 탭에 알림 */
export const notifyChatChanged = (sno: string): void => {
  try {
    channel?.postMessage({ sno });
  } catch {
    // 알림 실패는 무시 (다른 탭은 포커스 갱신으로 따라옴)
  }
};

/** 다른 탭의 상담 변경 알림 구독 → 구독 해제 함수 반환 (useEffect cleanup에 그대로 사용) */
export const onChatChanged = (callback: (sno: string) => void): (() => void) => {
  if (!channel) return () => {};
  const handler = (e: MessageEvent<{ sno?: string }>) => {
    if (e.data?.sno) callback(e.data.sno);
  };
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
};
