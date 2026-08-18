import { useEffect, useState } from 'react';
import { axiosInstance, download, getAttachUrl } from '../../../utils/Tool';
import { formatFileSize, type AttachType } from '../../ts/Attach';

interface AttachViewerProps {
  /** 게시글 PK 번호 */
  bno: number;
  /** 다운로드 목록만 노출 (기본 true) */
  onlyList?: boolean;
}

/** 파일명에서 확장자만 뽑아 대문자로 (예: 'photo.jpg' -> 'JPG') */
function getExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toUpperCase();
}

/**
 * 저장된 첨부파일 조회 전용 컴포넌트 (업로드/삭제 기능 없음 — 그건 AttachUploader.tsx).
 * 상세페이지에서 이렇게 씁니다:
 *
 * 사용예시 1. 콘텐츠에 이미지를 뿌리고 하단에 다운로드 목록만 노출하는 경우
 * 
 * - 콘텐츠 영역
 *  {attach
      .filter((a) => a.type === 0)
      .map((a) => (
        <div className='img_area' key={a.no}>
          <img src={getAttachUrl(a.purl, a.sname)} alt={a.name} />
        </div>
    ))}
 * 
 * - 다운로드 목록 영역
 * {notice.fileyn === 'Y' && <AttachViewer bno={notice.no} />}
 * 
 * 사용예시 2. 콘텐츠에 이미지를 노출하지 않고 
 *             하단에 이미지 썸네일 + 다운로드 목록을 같이 노출하는 경우
 * 
 * {qa.fileyn === 'Y' && <AttachViewer bno={qa.no} onlyList={false} />}
 * 
 */
export default function AttachViewer({ bno, onlyList = true }: AttachViewerProps) {
  const [list, setList] = useState<AttachType[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<AttachType | null>(null);

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get<AttachType[]>(`/attach/list/${bno}`)
      .then((res) => setList(res.data))
      .catch((err) => console.error('첨부파일 목록 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [bno]);

  // ESC로 라이트박스 닫기
  useEffect(() => {
    if (!lightboxImg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImg(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxImg]);

  const images = list.filter((a) => a.type === 0);
  const files = list.filter((a) => a.type === 1);

  /**
   * 단건 다운로드. Download.java는 dir(Tool.getServerDir로 변환되는 루트 폴더명) +
   * filename(서버에 실제 저장된 파일명, 하위 경로 포함 가능)을 합쳐서 실물 파일을 찾고,
   * downname은 다운로드 대화상자에 보여줄 이름으로만 씁니다.
   */
  const downloadOne = (a: AttachType) =>
    download('attach', '', `${a.tname}/${a.type === 0 ? 'images' : 'files'}/${a.sname}`, a.name);

  /** 전체(일괄) 다운로드 — 브라우저가 여러 다운로드를 한꺼번에 막는 걸 피하려고 살짝 간격을 둡니다. */
  const downloadAll = async () => {
    for (const a of list) {
      downloadOne(a);
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  if (loading) {
    return <p className="cell_sub">첨부파일을 불러오는 중...</p>;
  }

  if (list.length === 0) {
    return null;
  }

  return (
    <div className="attach_viewer">
      <div className="attach_section_head">
        <span className="cell_sub">
          전체 <em className="b_num">{list.length}</em> 개
        </span>
        {list.length > 1 && (
          <button type="button" className="btn btn_xsm btn_ghost" onClick={downloadAll}>
            전체 다운로드
          </button>
        )}
      </div>

      {/* 이미지 영역 */}
      {!onlyList && images.length > 0 && (
        <div className="img_thumb_grid">
          {images.map((a) => (
            <div className="img_thumb_card" key={a.no}>
              <button
                type="button"
                className="img_thumb_preview"
                onClick={() => setLightboxImg(a)}
                aria-label={`${a.name} 원본 크게보기`}
              >
                <img src={getAttachUrl(a.purl + '/thumbs', a.thumb)} alt={a.name} />
              </button>
              <div className="img_thumb_meta">
                <span className="img_thumb_name" title={a.name}>
                  {a.name}
                </span>
                <div className="img_thumb_meta_row">
                  <span className="attach_size">
                    {formatFileSize(a.fsize)} · {getExt(a.name)}
                  </span>
                  <button
                    type="button"
                    className="attach_btn download"
                    aria-label={`${a.name} 다운로드`}
                    onClick={() => downloadOne(a)}
                  />
                </div>
                <span className="attach_info">{a.cdate}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 첨부파일(일반 문서) 영역 */}
      <div className="attach_list">
        <ul>
          {files.length > 0 && files.map((a) => (
            <li className="attach_item" key={a.no}>
              <div className="icon_row" aria-hidden="true">
                <div className="icon file">
                  <span className="hidden">첨부파일</span>
                </div>
              </div>
              <span className="attach_name">{a.name}</span>
              <span className="attach_size">{formatFileSize(a.fsize)}</span>
              <span className="attach_info">
                {getExt(a.name)} · {a.cdate}
              </span>
              <button
                type="button"
                className="attach_btn download"
                aria-label={`${a.name} 다운로드`}
                onClick={() => downloadOne(a)}
              />
            </li>
          ))}

          {onlyList && images.length > 0 && images.map((a) => (
            <li className="attach_item" key={a.no}>
              <div className="icon_row" aria-hidden="true">
                <div className="icon img">
                  <span className="hidden">이미지 파일</span>
                </div>
              </div>
              <span className="attach_name">{a.name}</span>
              <span className="attach_size">{formatFileSize(a.fsize)}</span>
              <span className="attach_info">
                {getExt(a.name)} · {a.cdate}
              </span>
              <button
                type="button"
                className="attach_btn download"
                aria-label={`${a.name} 다운로드`}
                onClick={() => downloadOne(a)}
              />
            </li>
          ))}
        </ul>
      </div>
      
      

      {/* 원본 이미지 크게보기 레이어 */}
      {lightboxImg && (
        <div className="img_lightbox_bg" onClick={() => setLightboxImg(null)}>
          <button
            type="button"
            className="img_lightbox_close"
            onClick={() => setLightboxImg(null)}
            aria-label="크게보기 닫기"
          >
            ✕
          </button>
          <img
            className="img_lightbox_img"
            src={getAttachUrl(lightboxImg.purl, lightboxImg.sname)}
            alt={lightboxImg.name}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="img_lightbox_info">
            {lightboxImg.name} · {formatFileSize(lightboxImg.fsize)}
          </div>
        </div>
      )}
    </div>
  );
}