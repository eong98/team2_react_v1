import { useState } from 'react';
import Modal from '../../../ui/Modal';

const TYPES = [
  { code: 'CODE 01', name: '폭행', level: 'danger', color: 'var(--red-500)' },
  { code: 'CODE 02', name: '기물파손', level: 'danger', color: 'var(--red-500)' },
  { code: 'CODE 03', name: '쓰러짐(응급)', level: 'danger', color: 'var(--red-500)' },
  { code: 'CODE 04', name: '무단침입', level: 'warning', color: 'var(--amber-500)' },
  { code: 'CODE 05', name: '장시간 배회', level: 'warning', color: 'var(--amber-500)' },
];

export default function TypesView() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="view active">
      <div className="view_head">
        <div>
          <h1>이상행동 유형코드 관리</h1>
          <p>감지 유형별 코드, 표시 라벨, 알림 색상을 관리합니다.</p>
        </div>
        <button className="btn btn_md btn_primary" onClick={() => setModalOpen(true)}>
          + 유형 추가
        </button>
      </div>
      <div className="card card_pad_md" style={{ maxWidth: 560 }}>
        {TYPES.map((t, i) => (
          <div className="type_chip" style={i === TYPES.length - 1 ? { marginBottom: 0 } : undefined} key={t.code}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="swatch" style={{ background: t.color }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  {t.code} · {t.level}
                </div>
              </div>
            </div>
            <button className="btn btn_sm btn_ghost" onClick={() => setModalOpen(true)}>
              수정
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        titleId="typeModalTitle"
        title="이상행동 유형 추가"
        footer={
          <>
            <button className="btn btn_md btn_ghost" onClick={() => setModalOpen(false)}>
              취소
            </button>
            <button className="btn btn_md btn_primary" onClick={() => setModalOpen(false)}>
              추가
            </button>
          </>
        }
      >
        <div className="grid_2">
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-13">
              코드<span className="req">*</span>
            </label>
            <input id="store-cctv-fld-13" className="form_input mono" placeholder="예: 06" />
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-14">
              표시 라벨<span className="req">*</span>
            </label>
            <input id="store-cctv-fld-14" className="form_input" placeholder="예: 흡연 감지" />
          </div>
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="store-cctv-fld-15">
            알림 등급
          </label>
          <select id="store-cctv-fld-15" className="form_select">
            <option>danger · 위험</option>
            <option>warning · 주의</option>
            <option>info · 정보</option>
          </select>
        </div>
      </Modal>
    </section>
  );
}
