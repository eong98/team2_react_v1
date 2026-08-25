import { useEffect, useState, type ChangeEvent } from 'react';
import { AlertModal, ConfirmDeleteModal, Modal, PageHeader } from '../../../components/ui';
import { axiosInstance, set_focus } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { NATION_OPTIONS } from '../../../components/ts/nation';
import { isAdminGrade, type MyManagerInfo, type MyMemberInfo } from '../../../components/ts/MyPage';

interface DaumPostcodeResult {
  zonecode: string; // 우편번호
  roadAddress: string; // 도로명 주소
  jibunAddress: string; // 지번 주소
  userSelectedType: 'R' | 'J'; // 사용자가 선택한 주소 타입
}

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void;
      }) => { open: () => void };
    };
  }
}

export default function MyPage() {
  const { no, grade, setMname } = GlobalStoreSession();
  const isAdmin = isAdminGrade(grade);

  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [memberInfo, setMemberInfo] = useState<MyMemberInfo | null>(null);
  const [managerInfo, setManagerInfo] = useState<MyManagerInfo | null>(null);
  const [input, setInput] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [formAlert, setFormAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  // 프로필 이미지 (회원 전용)
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [deleteImageOpen, setDeleteImageOpen] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);

  // 비밀번호 변경 모달 - 현재/새/새확인 비밀번호를 한 모달에서 처리
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwErrors, setPwErrors] = useState<{ current?: string; newPassword?: string; confirm?: string }>({});
  const [pwSaving, setPwSaving] = useState(false);

  const loadInfo = () => {
    if (!no) return;
    setLoading(true);
    const endpoint = isAdmin ? `/v1/dbms/find/${no}` : `/v1/user/find/${no}`;
    axiosInstance
      .get(endpoint)
      .then((res) => {
        if (isAdmin) {
          setManagerInfo(res.data);
          setInput({ mname: res.data.mname ?? '', email: res.data.email ?? '', phone: res.data.phone ?? '' });
        } else {
          setMemberInfo(res.data);
          setInput({
            mname: res.data.mname ?? '',
            email: res.data.email ?? '',
            phone: res.data.phone ?? '',
            zipcode: res.data.zipcode ?? '',
            addr: res.data.addr ?? '',
            addrDetail: res.data.addrDetail ?? '',
            nation: res.data.nation ?? '대한민국',
          });
        }
      })
      .catch((err) => {
        console.error('내 정보 조회 실패:', err);
        setFormAlert({ message: '내 정보를 불러오지 못했습니다.', variant: 'error' });
      })
      .finally(() => setLoading(false));
  };

  const loadProfileImage = () => {
    if (isAdmin || !no) return;
    setProfileImageLoading(true);
    axiosInstance
      .get(`/profile/img/${no}`)
      .then((res) => {
        const storeFilename = res.data?.storeFilename;
        if (!storeFilename) {
          setProfileImageUrl('');
          return;
        }
        return axiosInstance
          .get('/download', {
            params: { dir: 'profile', filename: storeFilename, downname: storeFilename },
            responseType: 'blob',
          })
          .then((imgRes) => setProfileImageUrl(URL.createObjectURL(new Blob([imgRes.data]))));
      })
      .catch(() => setProfileImageUrl(''))
      .finally(() => setProfileImageLoading(false));
  };

  useEffect(() => {
    loadInfo();
    loadProfileImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [no]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id: fieldId, value } = e.target;
    setInput((prev) => ({ ...prev, [fieldId]: value }));
    if (fieldId in errors) setErrors((prev) => ({ ...prev, [fieldId]: undefined }));
  };

  const openPostcode = () => {
    if (!window.daum?.Postcode) {
      alert('우편번호 검색 스크립트를 불러오지 못했습니다.\n잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const fullAddress = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        setInput((prev) => ({ ...prev, zipcode: data.zonecode, addr: fullAddress }));
        setErrors((prev) => ({ ...prev, zipcode: undefined, addr: undefined }));
        set_focus('addrDetail');
      },
    }).open();
  };

  const REQUIRED_FIELDS_USER = [
    { field: 'mname', label: '이름', id: 'mname' },
    { field: 'email', label: '이메일', id: 'email' },
    { field: 'phone', label: '연락처', id: 'phone' },
    { field: 'zipcode', label: '우편번호', id: 'zipcode' },
    { field: 'addr', label: '기본주소', id: 'addr' },
  ];
  const REQUIRED_FIELDS_ADMIN = [
    { field: 'mname', label: '이름', id: 'mname' },
    { field: 'email', label: '이메일', id: 'email' },
    { field: 'phone', label: '연락처', id: 'phone' },
  ];

  const validate = () => {
    const fields = isAdmin ? REQUIRED_FIELDS_ADMIN : REQUIRED_FIELDS_USER;
    for (const { field, label, id: fieldId } of fields) {
      if (!String(input[field] ?? '').trim()) {
        setErrors({ [field]: `${label}을(를) 입력해주세요.` });
        set_focus(fieldId);
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving || !no) return;
    setSaving(true);
    try {
      if (isAdmin) {
        await axiosInstance.put(`/v1/dbms/update/self/${no}`, {
          mname: input.mname,
          email: input.email,
          phone: input.phone,
        });
      } else {
        await axiosInstance.put(`/v1/user/update/self/${no}`, {
          mname: input.mname,
          email: input.email,
          phone: input.phone,
          zipcode: input.zipcode,
          addr: input.addr,
          addrDetail: input.addrDetail,
          nation: input.nation,
        });
      }
      setMname(input.mname);
      setFormAlert({
        message: '내 정보가 수정되었습니다.',
        variant: 'success',
        onConfirm: () => {
          setEditMode(false);
          loadInfo();
        },
      });
    } catch (err) {
      console.error('내 정보 수정 실패:', err);
      setFormAlert({ message: '수정 중 오류가 발생했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setErrors({});
    loadInfo();
    setEditMode(false);
  };

  // ---- 비밀번호 변경 ----
  const openPwModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPwErrors({});
    setPwModalOpen(true);
    setTimeout(() => set_focus('currentPasswordInput'), 50); // 1회용 포커스 이동
  };

  // 현재 비밀번호 확인 + 새 비밀번호 변경을 모달 안에서 한 번에 처리합니다.
  const submitPasswordChange = async () => {
    const nextErrors: typeof pwErrors = {};

    if (!currentPassword.trim()) {
      nextErrors.current = '현재 비밀번호를 입력해주세요.';
    }
    if (newPassword.length < 8) {
      nextErrors.newPassword = '비밀번호는 8자 이상이어야 합니다.';
    }
    if (newPassword !== confirmNewPassword) {
      nextErrors.confirm = '비밀번호 확인이 일치하지 않습니다.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setPwErrors(nextErrors);
      if (nextErrors.current) set_focus('currentPasswordInput');
      else if (nextErrors.newPassword) set_focus('newPasswordInput');
      else if (nextErrors.confirm) set_focus('confirmNewPasswordInput');
      return;
    }

    setPwSaving(true);
    try {
      const endpoint = isAdmin ? '/v1/dbms/update/password' : '/v1/user/update/password';
      const id = isAdmin ? managerInfo?.id : memberInfo?.id;
      const res = await axiosInstance.post(endpoint, {id: id, password: currentPassword,newPassword: newPassword });

      if (res.data === true) {
        setPwModalOpen(false);
        setFormAlert({ message: '비밀번호 변경에 성공하였습니다.', variant: 'success' });
      } else {
        setPwErrors({ current: '비밀번호가 일치하지 않습니다.' });
        set_focus('currentPasswordInput');
      }
    } catch (err) {
      console.error('비밀번호 변경 실패:', err);
      setPwErrors({ current: '비밀번호 변경 중 오류가 발생했습니다.' });
    } finally {
      setPwSaving(false);
    }
  };

  // ---- 프로필 이미지 ----
  const onFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (file) uploadProfileImage(file);
  };

  const uploadProfileImage = async (file: File) => {
    if (!no) return;
    const formData = new FormData();
    formData.append('file1MF', file);
    formData.append('memberno', String(no));
    try {
      const res = await axiosInstance.post('/profile/img/update', formData);
      if (res.data === 1) {
        setFormAlert({ message: '프로필 이미지가 설정되었습니다.', variant: 'success' });
        loadProfileImage();
      } else {
        setFormAlert({ message: '지원하지 않는 파일 형식이거나 저장에 실패했습니다.', variant: 'error' });
      }
    } catch (err) {
      console.error('프로필 이미지 설정 실패:', err);
      setFormAlert({ message: '프로필 이미지 설정 중 오류가 발생했습니다.', variant: 'error' });
    }
  };

  const handleDeleteImage = async () => {
    if (!no) return;
    setDeletingImage(true);
    try {
      const res = await axiosInstance.post('/profile/img/delete', null, { params: { memberno: no } });
      if (res.data === 1) {
        setProfileImageUrl('');
        setFormAlert({ message: '프로필 이미지가 삭제되었습니다.', variant: 'success' });
      } else {
        setFormAlert({ message: '삭제할 이미지가 없습니다.', variant: 'error' });
      }
    } catch (err) {
      console.error('프로필 이미지 삭제 실패:', err);
      setFormAlert({ message: '프로필 이미지 삭제 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setDeletingImage(false);
      setDeleteImageOpen(false);
    }
  };

  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="마이페이지" description="내 정보를 불러오는 중입니다." />
      </section>
    );
  }

  const info = isAdmin ? managerInfo : memberInfo;

  return (
    <section className="view active">
      <PageHeader
        title="마이페이지"
        description={isAdmin ? '관리자 계정 정보를 확인하고 수정합니다.' : '회원 정보를 확인하고 수정합니다.'}
        actions={
          !editMode ? (
            <button type="button" className="btn btn_md btn_primary" onClick={() => setEditMode(true)}>
              정보 수정
            </button>
          ) : undefined
        }
      />

      {/* 프로필 이미지 - 회원 전용 */}
      {!isAdmin && (
        <div className="card card_pad_lg" style={{ marginBottom: 20 }}>
          <div className="form_group" style={{ marginBottom: 0 }}>
            <label className="form_label">프로필 이미지</label>
            <div className="form_control" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--green-500)',
                  flexShrink: 0,
                }}
              >
                {profileImageLoading ? (
                  <span style={{ fontSize: 11 }}>...</span>
                ) : profileImageUrl ? (
                  <img src={profileImageUrl} alt="프로필 이미지" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (info?.mname ?? '').slice(0, 1)
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <label className="btn btn_sm btn_outline_primary" style={{ cursor: 'pointer' }}>
                  프로필 이미지 설정
                  <input type="file" accept="image/*" onChange={onFileSelect} style={{ display: 'none' }} />
                </label>
                <button
                  type="button"
                  className="btn btn_sm btn_danger_outline"
                  onClick={() => setDeleteImageOpen(true)}
                  disabled={!profileImageUrl}
                >
                  프로필 이미지 삭제
                </button>
              </div>
            </div>
            <div className="form_hint">JPG, PNG 등 이미지 파일만 업로드할 수 있습니다.</div>
          </div>
        </div>
      )}

      <div className="card card_pad_lg form_page">
        <div className="form_group">
          <label className="form_label" htmlFor="loginid">아이디</label>
          <div className="form_control">
            <input id="loginid" className="form_input" value={info?.id ?? ''} disabled style={{ maxWidth: 240 }} />
          </div>
        </div>

        <div className="form_group">
          <label className="form_label" htmlFor="mname">
            이름{editMode && <span className="req">*</span>}
          </label>
          <div className="form_control">
            {editMode ? (
              <>
                <input
                  id="mname"
                  className={`form_input ${errors.mname ? 'is_error' : ''}`}
                  value={input.mname ?? ''}
                  onChange={onChange}
                  style={{ maxWidth: 240 }}
                />
                {errors.mname && <div className="form_hint error">{errors.mname}</div>}
              </>
            ) : (
              <span className="b_title lg">{info?.mname}</span>
            )}
          </div>
        </div>

        <div className="form_group">
          <label className="form_label" htmlFor="email">
            이메일{editMode && <span className="req">*</span>}
          </label>
          <div className="form_control">
            {editMode ? (
              <>
                <input
                  id="email"
                  type="email"
                  className={`form_input ${errors.email ? 'is_error' : ''}`}
                  value={input.email ?? ''}
                  onChange={onChange}
                />
                {errors.email && <div className="form_hint error">{errors.email}</div>}
              </>
            ) : (
              <span className="b_title lg">{info?.email}</span>
            )}
          </div>
        </div>

        <div className="form_group">
          <label className="form_label" htmlFor="phone">
            연락처{editMode && <span className="req">*</span>}
          </label>
          <div className="form_control">
            {editMode ? (
              <>
                <input
                  id="phone"
                  className={`form_input ${errors.phone ? 'is_error' : ''}`}
                  value={input.phone ?? ''}
                  onChange={onChange}
                  style={{ maxWidth: 240 }}
                />
                {errors.phone && <div className="form_hint error">{errors.phone}</div>}
              </>
            ) : (
              <span className="b_title lg">{info?.phone || '-'}</span>
            )}
          </div>
        </div>

        {!isAdmin && (
          <>
            <div className="form_group">
              <label className="form_label" htmlFor="zipcode">
                우편번호{editMode && <span className="req">*</span>}
              </label>
              <div className="form_control">
                {editMode ? (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        id="zipcode"
                        className="form_input"
                        value={input.zipcode ?? ''}
                        readOnly
                        onClick={openPostcode}
                        style={{ maxWidth: 160, cursor: 'pointer' }}
                      />
                      <button type="button" className="btn btn_sm btn_outline_primary" onClick={openPostcode}>
                        우편번호 검색
                      </button>
                    </div>
                    {errors.zipcode && <div className="form_hint error">{errors.zipcode}</div>}
                  </>
                ) : (
                  <span className="b_title lg">{memberInfo?.zipcode || '-'}</span>
                )}
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor="addr">
                기본주소{editMode && <span className="req">*</span>}
              </label>
              <div className="form_control">
                {editMode ? (
                  <>
                    <input
                      id="addr"
                      className="form_input"
                      value={input.addr ?? ''}
                      readOnly
                      onClick={openPostcode}
                      style={{ cursor: 'pointer' }}
                    />
                    {errors.addr && <div className="form_hint error">{errors.addr}</div>}
                  </>
                ) : (
                  <span className="b_title lg">{memberInfo?.addr || '-'}</span>
                )}
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor="addrDetail">상세주소</label>
              <div className="form_control">
                {editMode ? (
                  <input id="addrDetail" className="form_input" value={input.addrDetail ?? ''} onChange={onChange} />
                ) : (
                  <span className="b_title lg">{memberInfo?.addrDetail || '-'}</span>
                )}
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor="nation">국적</label>
              <div className="form_control">
                {editMode ? (
                  <select id="nation" className="form_select" value={input.nation ?? '대한민국'} onChange={onChange} style={{ maxWidth: 200 }}>
                    {NATION_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                ) : (
                  <span className="b_title lg">{memberInfo?.nation || '-'}</span>
                )}
              </div>
            </div>
          </>
        )}

        <div className="form_group">
          <label className="form_label">비밀번호</label>
          <div className="form_control">
            <button type="button" className="btn btn_sm btn_outline_primary" onClick={openPwModal}>
              비밀번호 변경
            </button>
          </div>
        </div>

        {editMode && (
          <div className="form_page_footer">
            <button type="button" className="btn btn_md btn_ghost" onClick={cancelEdit} disabled={saving}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>

      {/* 비밀번호 변경 모달 - 현재/새/새확인 비밀번호를 한 번에 입력받아 처리 */}
      <Modal
        open={pwModalOpen}
        onClose={() => setPwModalOpen(false)}
        titleId="pwChangeModalTitle"
        title="비밀번호 변경"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={() => setPwModalOpen(false)} disabled={pwSaving}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={submitPasswordChange} disabled={pwSaving}>
              {pwSaving ? '변경 중...' : '변경'}
            </button>
          </>
        }
      >
        <div className="form_group" style={{ marginTop: 8 }}>
          <label className="form_label" htmlFor="currentPasswordInput">
            현재 비밀번호<span className="req">*</span>
          </label>
          <div className="form_control">
            <input
              id="currentPasswordInput"
              type="password"
              className={`form_input ${pwErrors.current ? 'is_error' : ''}`}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setPwErrors((prev) => ({ ...prev, current: undefined }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') set_focus('newPasswordInput');
              }}
            />
            {pwErrors.current && <div className="form_hint error">{pwErrors.current}</div>}
          </div>
        </div>

        <div className="form_group">
          <label className="form_label" htmlFor="newPasswordInput">
            새 비밀번호<span className="req">*</span>
          </label>
          <div className="form_control">
            <input
              id="newPasswordInput"
              type="password"
              className={`form_input ${pwErrors.newPassword ? 'is_error' : ''}`}
              placeholder="8자 이상 입력하세요"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPwErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') set_focus('confirmNewPasswordInput');
              }}
            />
            {pwErrors.newPassword && <div className="form_hint error">{pwErrors.newPassword}</div>}
          </div>
        </div>

        <div className="form_group">
          <label className="form_label" htmlFor="confirmNewPasswordInput">
            새 비밀번호 확인<span className="req">*</span>
          </label>
          <div className="form_control">
            <input
              id="confirmNewPasswordInput"
              type="password"
              className={`form_input ${pwErrors.confirm ? 'is_error' : ''}`}
              placeholder="새 비밀번호를 다시 입력하세요"
              value={confirmNewPassword}
              onChange={(e) => {
                setConfirmNewPassword(e.target.value);
                setPwErrors((prev) => ({ ...prev, confirm: undefined }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPasswordChange();
              }}
            />
            {pwErrors.confirm && <div className="form_hint error">{pwErrors.confirm}</div>}
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={deleteImageOpen}
        onClose={() => setDeleteImageOpen(false)}
        onConfirm={handleDeleteImage}
        loading={deletingImage}
        title="프로필 이미지를 삭제하시겠습니까?"
        description="삭제 후에는 기본 아이콘으로 표시됩니다."
      />

      <AlertModal
        open={formAlert !== null}
        onClose={() => setFormAlert(null)}
        onConfirm={formAlert?.onConfirm}
        message={formAlert?.message ?? ''}
        variant={formAlert?.variant}
      />
    </section>
  );
}