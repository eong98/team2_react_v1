import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Modal } from '../../../components/ui/index.ts';
import { copyText } from '../../../utils/Tool.ts';
import { getShopSurveyPublicUrl } from '../../../components/ts/ShopSurvey.ts';

/* ---------------------------------------------------------------------
   설문 QR코드 모달

   - 고객 응답 URL(/s/{qrid})을 QR코드로 그려서 보여주고
   - "QR코드 저장" 버튼으로 PNG 파일을 내 컴퓨터에 다운로드합니다.
   - QR 이미지는 DB에 저장하지 않고 QRID로 그때그때 그립니다.

   의존성: npm i qrcode.react
--------------------------------------------------------------------- */

interface ShopSurveyQrModalProps {
  open: boolean;
  onClose: () => void;
  /** 설문 QR 토큰 (SHOP_SURVEY.QRID) */
  qrid: string;
  /** 다운로드 파일명/모달 제목에 쓸 설문 제목 */
  title: string;
  /** 진행중이 아닌 설문이면 안내 문구 노출 */
  isOpen?: boolean;
}

/** 파일명에 쓸 수 없는 문자 제거 */
const toFileName = (title: string) => title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 40) || '설문';

export default function ShopSurveyQrModal({ open, onClose, qrid, title, isOpen = true }: ShopSurveyQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = getShopSurveyPublicUrl(qrid);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${toFileName(title)}_QR.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="shopSurveyQrTitle"
      title="설문 QR코드"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="btn btn_md btn_primary" onClick={handleDownload}>
            QR코드 저장
          </button>
        </>
      }
    >
      <div className="shop_survey_qr">
        <p className="shop_survey_qr_title">{title}</p>

        <div className="shop_survey_qr_box">
          {/* 인쇄용으로 넉넉한 해상도로 그리고, 화면에서는 CSS로 줄여서 보여줌 */}
          <QRCodeCanvas
            ref={canvasRef}
            value={url}
            size={512}
            marginSize={2}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        {!isOpen && (
          <p className="shop_survey_qr_notice">
            진행중인 설문이 아니라서 지금은 고객이 응답할 수 없습니다. 게시(진행중) 후 응답을 받을 수 있어요.
          </p>
        )}

        <div className="shop_survey_qr_url">
          <span className="mono" title={url}>
            {url}
          </span>
          <button type="button" className="btn btn_xsm btn_outline_primary" onClick={() => copyText(url)}>
            주소 복사
          </button>
        </div>
      </div>
    </Modal>
  );
}
