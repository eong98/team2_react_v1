import { useState } from 'react';
import Modal from '../../../ui/Modal';

const CAMS = [
  { store: '본점', name: 'CAM 03 · 입구', mac: 'B8:27:EB:11:22:33', rep: '-', repTone: 'badge_neutral', status: '연결됨', statusTone: 'badge_success', date: '2026-02-14' },
  { store: '본점', name: 'CAM 05 · 열람실 A', mac: 'B8:27:EB:44:55:66', rep: '대표', repTone: 'badge_success', status: '스트림 끊김', statusTone: 'badge_danger', date: '2026-02-14' },
  { store: '2호점', name: 'CAM 01 · 카운터', mac: 'B8:27:EB:77:88:99', rep: '대표', repTone: 'badge_success', status: '연결됨', statusTone: 'badge_success', date: '2026-03-02' },
];

export default function CctvView() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="view active">
      <div className="view_head">
        <div>
          <h1>CCTV 등록/관리</h1>
          <p>매장별 CCTV 채널을 등록하고 스트림 상태를 관리합니다. (CCTV 테이블 기준: sno·mac·cname·represent·state)</p>
        </div>
        <button className="btn btn_md btn_primary" onClick={() => setModalOpen(true)}>
          + CCTV 등록
        </button>
      </div>
      <div className="table_wrap">
        <table className="table">
          <thead>
            <tr>
              <th>매장(sno)</th>
              <th>CCTV명(cname)</th>
              <th>MAC주소</th>
              <th>대표CCTV</th>
              <th>상태(state)</th>
              <th>등록일</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {CAMS.map((c) => (
              <tr key={c.mac}>
                <td>{c.store}</td>
                <td className="mono">{c.name}</td>
                <td className="mono">{c.mac}</td>
                <td>
                  <span className={`badge ${c.repTone}`}>{c.rep}</span>
                </td>
                <td>
                  <span className={`badge ${c.statusTone}`}>{c.status}</span>
                </td>
                <td className="mono">{c.date}</td>
                <td className="actions">
                  <button className="btn btn_sm btn_ghost" onClick={() => setModalOpen(true)}>
                    수정
                  </button>
                  <button className="btn btn_sm btn_danger_outline">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        titleId="camModalTitle"
        title="CCTV 등록"
        footer={
          <>
            <button className="btn btn_md btn_ghost" onClick={() => setModalOpen(false)}>
              취소
            </button>
            <button className="btn btn_md btn_primary" onClick={() => setModalOpen(false)}>
              저장
            </button>
          </>
        }
      >
        <div className="form_group">
          <label className="form_label" htmlFor="store-cctv-fld-8">
            소속 매장(sno)<span className="req">*</span>
          </label>
          <select id="store-cctv-fld-8" className="form_select">
            <option>본점 · 스터디카페 A</option>
            <option>2호점 · 무인카페 B</option>
          </select>
        </div>
        <div className="grid_2">
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-9">
              CCTV명(cname)<span className="req">*</span>
            </label>
            <input id="store-cctv-fld-9" className="form_input" placeholder="예: CAM 06 · 창가" />
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-10">
              MAC 주소<span className="req">*</span>
            </label>
            <input id="store-cctv-fld-10" className="form_input mono" placeholder="B8:27:EB:00:00:00" />
          </div>
        </div>
        <div className="grid_2">
          <div className="form_group">
            <span className="form_label" id="cctv-represent-label">
              대표 CCTV(represent)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10 }} role="group" aria-labelledby="cctv-represent-label">
              <input type="checkbox" id="repCam" />
              <label htmlFor="repCam" className="form_hint" style={{ margin: 0 }}>
                이 매장의 메인 화면으로 노출
              </label>
            </div>
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-12">
              상태(state)
            </label>
            <select id="store-cctv-fld-12" className="form_select">
              <option>연결됨</option>
              <option>점검중</option>
              <option>스트림 끊김</option>
            </select>
          </div>
        </div>
      </Modal>
    </section>
  );
}
