const GNO_KEY = 'allimio_chat_gno';

/** 이 기간(일) 동안 쓰지 않으면 새로 발급 (Spring ChatSessionService.GUEST_EXPIRE_DAYS와 같은 값) */
const GNO_EXPIRE_DAYS = 30;
const GNO_EXPIRE_MS = GNO_EXPIRE_DAYS * 24 * 60 * 60 * 1000;

interface StoredGno {
  id: string;
  /** 마지막 사용 시각(ms) — 쓸 때마다 갱신, 기한이 지나면 새로 발급 */
  lastUsed: number;
}

/**
 * 추측하기 어려운 UUID(v4) 생성.
 * crypto.randomUUID()는 https·localhost에서만 쓸 수 있어서, http(학원 IP 접속 등)에서는
 * crypto.getRandomValues()로 같은 형식을 직접 만듭니다 (Math.random보다 안전한 난수).
 */
const createUuid = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // 버전 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const readStored = (): StoredGno | null => {
  try {
    const raw = localStorage.getItem(GNO_KEY);
    if (!raw) return null;
    if (raw.startsWith('{')) return JSON.parse(raw) as StoredGno;
    // 예전 형식(값만 저장) — 그대로 이어 쓰고 지금부터 사용 시각을 기록
    return { id: raw, lastUsed: Date.now() };
  } catch {
    return null;
  }
};

/**
 * 비회원 식별값(gno)을 가져오거나, 없거나 기한이 지났으면 새로 발급합니다.
 * - 브라우저(프로필) 기준: 같은 브라우저면 탭·새 창·재시작해도 같은 값
 * - 30일 동안 쓰지 않으면 새로 발급 → 공용 PC에서 오래전 다른 사람의 비회원 상담 기록이 보이지 않게
 * - 이 값을 가진 쪽을 그 비회원으로 보고 상담 기록을 보여주므로(토큰 성격) 추측하기 어려운 UUID로 발급
 */
export const getOrCreateGno = (): string => {
  const now = Date.now();
  const stored = readStored();
  const id = stored && now - stored.lastUsed < GNO_EXPIRE_MS ? stored.id : createUuid();
  try {
    localStorage.setItem(GNO_KEY, JSON.stringify({ id, lastUsed: now } satisfies StoredGno));
  } catch {
    // 저장 불가(시크릿 모드 제한 등) — 이번 화면에서만 사용
  }
  return id;
};
