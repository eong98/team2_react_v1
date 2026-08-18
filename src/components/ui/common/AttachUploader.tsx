import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { axiosInstance, download } from '../../../utils/Tool';
import { formatFileSize, type AttachType } from '../../ts/Attach';

interface AttachUploaderProps {
  /** 
   * Attach.ts 에 저장한 ATTACH_BOARD_LABEL 
   * 테이블/폴더명에 맞는 번호로 입력 
   * ATTACH_BOARD_LABEL[1].table
  */
  tname: string;
  /**
   * 게시글 PK 번호. 수정 화면처럼 이미 저장된 글이면 실제 bno를 넘기세요 — 그러면 기존 첨부파일
   * 목록을 바로 불러옵니다. 신규 작성 화면처럼 아직 글이 저장 전(bno가 없음)이면 undefined로 두세요.
   *
   * ⚠️ 파일 선택/삭제는 수정·신규 모드 상관없이 전부 로컬에만 "예정" 상태로 담아둘 뿐,
   * 실제 서버 반영(업로드/삭제)은 안 합니다. 폼 저장 버튼을 눌러서
   * ref.current.commit(bno)를 호출해야 그때 한 번에 실제로 반영됩니다.
   */
  bno?: number;
  /** 최대 첨부 개수 (기본 5) */
  maxCount?: number;
  /** 파일 1개당 최대 용량 (byte, 기본 10MB) — 넘는 파일은 선택에서 제외되고 에러 문구가 뜹니다 */
  maxSize?: number;
  disabled?: boolean;
  description?: string;

  /** 
   * 디자인 타입 (선텍)
   * - 클릭/드래그형 : drag (기본) 
   * - 버튼형 : button
   */
  dtype?: string;
  /** 첨부파일 개수(기존 - 삭제예정 + 업로드예정)가 바뀔 때마다 실시간으로 호출됩니다. fileyn 같은 상위 폼 상태를 실시간으로 맞출 때 씁니다. */
  onCountChange?: (count: number) => void;
}

export interface AttachUploaderHandle {
  /**
   * 폼 저장 시점에 호출 — 그동안 로컬에 담아둔 "업로드 예정 파일"과 "삭제 예정 파일"을
   * 한 번에 실제 서버에 반영합니다 (삭제 먼저, 업로드 나중).
   * 신규 작성이면 방금 생성된 bno를 인자로 넘기세요. 수정 화면이면 인자 없이 불러도
   * props로 받은 bno를 그대로 씁니다.
   */
  commit: (bno?: number) => Promise<void>;
  /** 아직 서버에 반영 안 된(업로드 예정 또는 삭제 예정) 변경사항이 있는지 여부 */
  hasPendingChanges: () => boolean;
}

/**
 * 첨부파일 업로더. Attach.java/AttachCont.java의 /attach/list, /attach/create, /attach/delete와 연동됩니다.
 * 파일 선택/삭제는 전부 로컬에만 쌓아두고, commit()을 호출해야 실제 서버에 반영됩니다.
 *
 * 사용 예:
 *   const attachRef = useRef<AttachUploaderHandle>(null);
 *   
    <AttachUploader 
        ref={attachRef} 
        tname={ATTACH_BOARD_LABEL[1].table} 
        bno={isEdit ? Number(no) : undefined}
        description='사업자등록증 · PDF, JPG (최대 10MB)'
        onCountChange={(count) => setInput((prev) => ({ ...prev, fileyn: count > 0 ? 'Y' : 'N' }))}
    />
 *
 *   const handleSave = async () => {
 *     ...
 *     if (isEdit) {
 *      await axiosInstance.put(`/notice/${no}`, payload);
 * 
 *      // 업로드용 소스 시작
 *      if (attachRef.current?.hasPendingChanges()) {
 *        try {
            await attachRef.current.commit();
          } catch (attachErr) {
            console.error('첨부파일 반영 실패 (글은 정상 저장됨):', attachErr);
          }
        }
      } else {
        const res = await axiosInstance.post<number>('/notice', payload);
        const newNo = res.data;

        if (newNo && attachRef.current?.hasPendingChanges()) {
          try {
            await attachRef.current.commit(Number(newNo));
          } catch (attachErr) {
            console.error('첨부파일 반영 실패 (글은 정상 저장됨):', attachErr);
          }
        }
 *     }
 *     ...
 *   };
 */
const AttachUploader = forwardRef<AttachUploaderHandle, AttachUploaderProps>(function AttachUploader(
  { tname, bno, maxCount = 5, maxSize = 10 * 1024 * 1024, disabled = false, description = '첨부파일 · PDF, JPG 등 (최대 10MB)', dtype = 'drag', onCountChange  },
  ref,
) {
  const [list, setList] = useState<AttachType[]>([]);
  /** 업로드 예정(아직 서버에 없는) 로컬 파일들 */
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  /** 삭제 예정(아직 서버에서 안 지워진) 기존 첨부파일 번호들 */
  const [pendingDeleteNos, setPendingDeleteNos] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = bno !== undefined && bno !== null;

  /** 이미 저장된 글이면 기존 첨부파일 목록을 불러옴 (조회만 — 업로드/삭제는 여기서 안 함) */
  const loadList = () => {
    if (!isEditMode) return;
    setLoading(true);
    setPendingDeleteNos(new Set()); // 다른 글로 bno가 바뀌는 경우를 대비해 초기화
    axiosInstance
      .get<AttachType[]>(`/attach/list/${bno}`)
      .then((res) => setList(res.data))
      .catch((err) => console.error('첨부파일 목록 조회 실패:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bno]);

  // 삭제 예정인 것들은 개수에서 빼고, 새로 추가할 것들은 더해서 "실제 저장될 개수" 기준으로 카운트
  const totalCount = list.length - pendingDeleteNos.size + pendingFiles.length;

  // 첨부파일 개수가 바뀔 때마다(파일 추가/제거, 삭제예정 토글, 목록 최초 로드 등) 부모에게 실시간으로 알림
  useEffect(() => {
    onCountChange?.(totalCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount]);

  /** 실제 서버 업로드 (POST /attach/create, multipart/form-data) */
  const uploadFiles = async (targetBno: number, files: File[]): Promise<AttachType[]> => {
    if (files.length === 0) return [];

    const formData = new FormData();
    formData.append('tname', tname);
    formData.append('bno', String(targetBno));
    files.forEach((f) => formData.append('files', f));

    const res = await axiosInstance.post<AttachType[]>('/attach/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  };

  /** 파일 선택 — 서버로 안 보내고 로컬 "업로드 예정" 목록에만 담아둠 (수정/신규 공통) */
  const onFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

 
    // 용량 초과 파일은 걸러내고, 나머지 정상 파일들은 그대로 담습니다.
    const tooLarge = files.filter((f) => f.size > maxSize);
    const validFiles = files.filter((f) => f.size <= maxSize);
 
    if (totalCount + validFiles.length > maxCount) {
      setError(`최대 ${maxCount}개까지 첨부할 수 있습니다.`);
      return;
    }
    
 
    if (tooLarge.length > 0) {
      setError(
        `${tooLarge.map((f) => f.name).join(', ')} — 파일당 최대 ${formatFileSize(maxSize)}까지 첨부할 수 있습니다.`,
      );
    } else {
      setError(null);
    }
 
    if (validFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** 기존 첨부파일 삭제 클릭 — 서버로 안 보내고 "삭제 예정" 표시만 토글 */
  const toggleDelete = (attach: AttachType) => {
    setPendingDeleteNos((prev) => {
      const next = new Set(prev);
      if (next.has(attach.no)) next.delete(attach.no); // 다시 누르면 삭제 예정 취소(복구)
      else next.add(attach.no);
      return next;
    });
  };

  /** 아직 서버에 안 올라간 로컬 대기 파일 제거 (이건 애초에 서버에 없어서 바로 지워도 됨) */
  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useImperativeHandle(ref, () => ({
    commit: async (bnoArg?: number) => {
      const targetBno = bnoArg ?? bno;
      if (targetBno == null) {
        throw new Error('AttachUploader.commit(): bno가 없어 첨부파일을 저장할 수 없습니다.');
      }
      if (pendingFiles.length === 0 && pendingDeleteNos.size === 0) return;

      setUploading(true);
      try {
        // 1) 삭제 예정인 것부터 실제로 삭제
        for (const no of pendingDeleteNos) {
          await axiosInstance.delete(`/attach/delete/${no}`);
        }
        // 2) 새로 추가할 파일 업로드
        await uploadFiles(targetBno, pendingFiles);

        setPendingDeleteNos(new Set());
        setPendingFiles([]);
      } finally {
        setUploading(false);
      }
    },
    hasPendingChanges: () => pendingFiles.length > 0 || pendingDeleteNos.size > 0,
  }));

  return (
    <div className="form_group">
      <label className="form_label" htmlFor='files'>
        첨부파일<span className="req" title="필수 입력 요소">*</span>
      </label>
      
      <div className="form_control">
        <div className="attach_upload">
          {/* 파일 첨부영역 */}
          <div className='attach_uploader'>
            {dtype === 'drag' ? (
              <label className="file_drop">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="files"
                  name="fileyn"
                  multiple
                  disabled={disabled || uploading || totalCount >= maxCount}
                  onChange={(e) => onFilesSelected(e.target.files)}
                  className='sr_only_input'
                />
                <span className="file_upload" aria-hidden="true"></span>
                <span className="b_title">클릭하거나 파일을 끌어다 놓으세요</span>
                <span className="b_title sm">{description}</span>
              </label>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="files"
                  name="fileyn"
                  multiple
                  disabled={disabled || uploading || totalCount >= maxCount}
                  onChange={(e) => onFilesSelected(e.target.files)}
                  className='sr_only_input'
                />
                <label
                  htmlFor="files"
                  className={`btn btn_sm btn_ghost${disabled || uploading || totalCount >= maxCount ? ' btn_disabled' : ''}`}
                >
                  + 파일 선택
                </label>
              </>
            )}
          </div>

          {error && <div className="form_hint error">{error}</div>}
          {uploading && <div className="form_hint">저장 중...</div>}

          {/* 첨부파일 목록 영역 */}
          {loading ? (
            <p className="cell_sub">
              불러오는 중...
            </p>
          ) : (
            <div className="attach_list">
              <span className="cell_sub">
                <em className='b_num'>{totalCount}</em> / {maxCount} 개 첨부됨
              </span>
              
              <ul>
                {/* 기존에 저장돼 있던 첨부파일 */}
                {list.map((a) => {
                  const markedForDelete = pendingDeleteNos.has(a.no);
                  return (
                    <li className={`attach_item${markedForDelete ? ' to_delete' : ''}`} key={a.no}>
                      <div className='icon_row' aria-hidden="true">
                        {a.type === 0 ? (
                          <div className='icon img'>
                            <span className='hidden'>이미지 파일 포함</span>
                          </div>
                        ) : (
                          <div className='icon file'>
                            <span className='hidden'>첨부파일 포함</span>
                          </div>
                        )}
                      </div>
                      <span className="attach_name">{a.name}</span>
                      <span className="attach_size">{formatFileSize(a.fsize)}</span>
                      <span className="attach_info">{markedForDelete ? '삭제 예정' : a.cdate}</span>
                      <button
                        type="button"
                        className={markedForDelete ? 'attach_btn undo' : 'attach_btn del'}
                        disabled={disabled}
                        onClick={() => toggleDelete(a)}
                      >
                        <span className='hidden'>{markedForDelete ? `${a.name} 삭제 취소` : `${a.name} 삭제`}</span>
                      </button>
                    </li>
                  );
                })}

                {/* 새로 담아둔(아직 서버에 없는) 파일 — 저장 눌러야 실제로 업로드됨 */}
                {pendingFiles.map((f, i) => {
                  const isImg = f.type.includes('image');

                  return (
                  <li className={`attach_item ${isEditMode ? 'new' : 'pending'}`} key={`pending-${i}-${f.name}`}>
                    <div className='icon_row' aria-hidden="true">
                      {isImg ? (
                        <div className='icon img'>
                          <span className='hidden'>이미지 파일 포함</span>
                        </div>
                      ) : (
                        <div className='icon file'>
                          <span className='hidden'>첨부파일 포함</span>
                        </div>
                      )}
                    </div>

                    <span className="attach_name">{f.name}</span>
                    <span className="attach_size">{formatFileSize(f.size)}</span>
                    <span className="attach_info">저장 대기</span>
                    <button
                      type="button"
                      className="attach_btn del"
                      disabled={disabled}
                      onClick={() => removePending(i)}
                    >
                      <span className='hidden'>{`${f.name} 제거`}</span>
                    </button>
                  </li>
                )
                })}

                {totalCount === 0 && <li className="attach_item attach_empty">첨부된 파일이 없습니다.</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
    
  );
});

export default AttachUploader;