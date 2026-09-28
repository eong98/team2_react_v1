import { useEffect, useState } from 'react';
import { AlertModal, Modal } from '../../../components/ui';
import { axiosInstance, copyText } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import type { ShopType, ShopSearchResult } from '../../../components/ts/ShopUser';
import { INVITE_CODE_VALID_MINUTES } from '../../../components/ts/Invite';

interface InviteCreateProps {
  onClose: () => void;
}

/* ---------------------------------------------------------------------
   초대코드 발급 모달 (InviteMain에서 "초대코드 발급하기" 클릭 시)
   1단계: 보유 매장 목록에서 하나 선택 → 발급 API 호출
   2단계: 같은 모달 안에서 발급된 코드 + 복사 버튼 표시

   API
   GET  /shop/search?mno=&grade=&page=0&size=50 → 보유 매장 목록
   POST /invite/create/{sno}                     → 초대코드 문자열
--------------------------------------------------------------------- */
export default function InviteCreate({ onClose }: InviteCreateProps) {
  const { no: mno, grade } = GlobalStoreSession();

  const [shops, setShops] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<number | null>(null); // 발급 중인 sno
  const [issued, setIssued] = useState<{ shop: ShopType; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!mno) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axiosInstance
      .get<ShopSearchResult>('/shop/search', {
        params: { mno, grade, page: 0, size: 50 },
      })
      .then((res) => setShops(res.data.content ?? []))
      .catch((err) => {
        console.error('매장 목록 조회 실패:', err);
        setShops([]);
      })
      .finally(() => setLoading(false));
  }, [mno, grade]);

  const selectShop = async (shop: ShopType) => {
    if (!shop.no || issuing) return;
    setIssuing(shop.no);
    try {
      const res = await axiosInstance.post<string>(`/invite/create/${shop.no}`);
      setIssued({ shop, code: res.data });
      setCopied(false);
    } catch (err) {
      console.error('초대코드 발급 실패:', err);
      setAlert({ message: '초대코드 발급에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setIssuing(null);
    }
  };

  const copyCode = async () => {
    if (!issued) return;
    const ok = await copyText(issued.code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setAlert({ message: '복사에 실패했습니다.\n코드를 직접 선택해서 복사해주세요.', variant: 'error' });
    }
  };

  const footer = issued ? (
    <>
      <button type="button" className="btn btn_md btn_ghost" onClick={onClose}>
        닫기
      </button>
      <button type="button" className="btn btn_md btn_primary" onClick={copyCode}>
        {copied ? '복사됨 ✓' : '코드 복사'}
      </button>
    </>
  ) : (
    <button type="button" className="btn btn_md btn_ghost" onClick={onClose}>
      닫기
    </button>
  );

  return (
    <>
      <Modal
        open
        onClose={onClose}
        titleId="inviteCreateTitle"
        title={issued ? '초대코드 발급 완료' : '초대할 매장 선택'}
        footer={footer}
      >
        {issued ? (
          /* 2단계: 발급 완료 */
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <p className="b_title" style={{ marginBottom: 16 }}>
              <strong>{issued.shop.title}</strong> 매장에 초대할 코드입니다.
              <br />
              아래 코드를 초대할 직원에게 전달해주세요.
            </p>

            <div
              className="mono"
              style={{
                display: 'inline-block',
                padding: '16px 28px',
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 8,
                color: 'var(--primary)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 12,
                userSelect: 'all', // 복사가 안 되는 환경에서도 한 번 클릭으로 전체 선택
              }}
            >
              {issued.code}
            </div>

            <p className="form_hint" style={{ marginTop: 16 }}>
              발급 후 약 {INVITE_CODE_VALID_MINUTES}분간 사용할 수 있습니다.
            </p>
          </div>
        ) : loading ? (
          /* 1단계: 매장 목록 로딩 */
          <p className="b_title" style={{ marginTop: 12 }}>불러오는 중...</p>
        ) : shops.length === 0 ? (
          <p className="b_title" style={{ marginTop: 12 }}>등록된 매장이 없습니다. 먼저 매장을 등록해주세요.</p>
        ) : (
          /* 1단계: 매장 선택 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, maxHeight: 360, overflowY: 'auto' }}>
            {shops.map((s) => (
              <div
                key={s.no}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="sname">{s.title}</div>
                  <div className="saddr" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {s.address}
                    {s.address2 ? ` ${s.address2}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn_sm btn_primary"
                  style={{ flexShrink: 0 }}
                  disabled={issuing !== null}
                  onClick={() => selectShop(s)}
                >
                  {issuing === s.no ? '발급 중...' : '선택'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </>
  );
}