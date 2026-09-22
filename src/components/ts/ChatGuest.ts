const GNO_KEY = 'allimio_chat_gno';

/**
 * 비회원 식별용 UUID를 localStorage에서 가져오거나, 없으면 새로 발급합니다.
 * 같은 브라우저로 재접속하면 같은 gno가 재사용됩니다.
 */
export const getOrCreateGno = (): string => {
  const existing = localStorage.getItem(GNO_KEY);
  if (existing) return existing;

  const gno = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(GNO_KEY, gno);
  return gno;
};