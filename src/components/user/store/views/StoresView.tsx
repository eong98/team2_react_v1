import { useState } from 'react';
import Modal from '../../../ui/Modal';

const STORES = [
  { name: '본점 · 스터디카페 A', addr: '서울 강남구 (06123)', tel: '02-1234-5678', cams: '6대', status: '이용중', tone: 'badge_success', date: '2026-02-14' },
  { name: '2호점 · 무인카페 B', addr: '서울 마포구 (04039)', tel: '02-2345-6789', cams: '4대', status: '이용중', tone: 'badge_success', date: '2026-03-02' },
  { name: '3호점 · 스터디카페 C', addr: '경기 성남시 (13529)', tel: '031-345-6789', cams: '8대', status: '결제 만료 예정', tone: 'badge_warning', date: '2026-04-19' },
  { name: '4호점 · 무인카페 D', addr: '인천 부평구 (21365)', tel: '032-456-7890', cams: '4대', status: '구독 해지', tone: 'badge_neutral', date: '2026-05-27' },
];

export default function StoresView() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="view active">
      <div className="view_head">
        <div>
          <h1>매장 등록/관리</h1>
          <p>운영 중인 매장 정보를 등록하고 관리합니다. (SHOP 테이블 기준: no·mno·sname·zip·address·address2·tel·comment·cdate·udate)</p>
        </div>
        <button className="btn btn_md btn_primary" onClick={() => setModalOpen(true)}>
          + 매장 등록
        </button>
      </div>
      <div className="table_wrap">
        <table className="table">
          <thead>
            <tr>
              <th>매장명</th>
              <th>주소</th>
              <th>연락처</th>
              <th>CCTV</th>
              <th>구독 상태</th>
              <th>등록일</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {STORES.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{s.addr}</td>
                <td className="mono">{s.tel}</td>
                <td className="mono">{s.cams}</td>
                <td>
                  <span className={`badge ${s.tone}`}>{s.status}</span>
                </td>
                <td className="mono">{s.date}</td>
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
        titleId="storeModalTitle"
        title="매장 등록"
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
          <label className="form_label" htmlFor="store-cctv-fld-1">
            소유 회원(mno)<span className="req">*</span>
          </label>
          <select id="store-cctv-fld-1" className="form_select">
            <option>hong@allimio.kr (홍길동)</option>
            <option>lee@allimio.kr (이은혜)</option>
          </select>
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="store-cctv-fld-2">
            매장명(sname)<span className="req">*</span>
          </label>
          <input id="store-cctv-fld-2" className="form_input" placeholder="예: 본점 · 스터디카페 A" />
        </div>
        <div className="grid_2">
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-3">
              우편번호(zip)<span className="req">*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="store-cctv-fld-3" className="form_input" placeholder="06123" />
              <button className="btn btn_md btn_ghost">검색</button>
            </div>
          </div>
          <div className="form_group">
            <label className="form_label" htmlFor="store-cctv-fld-4">
              연락처(tel)
            </label>
            <input id="store-cctv-fld-4" className="form_input" placeholder="02-000-0000" />
          </div>
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="store-cctv-fld-5">
            주소(address)<span className="req">*</span>
          </label>
          <input id="store-cctv-fld-5" className="form_input" placeholder="도로명 주소" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="store-cctv-fld-6">
            상세주소(address2)
          </label>
          <input id="store-cctv-fld-6" className="form_input" placeholder="건물명, 층수 등" />
        </div>
        <div className="form_group">
          <label className="form_label" htmlFor="store-cctv-fld-7">
            매장 설명(comment)
          </label>
          <textarea id="store-cctv-fld-7" className="form_textarea" style={{ minHeight: 70 }} placeholder="영업시간, 특이사항 등" />
        </div>
      </Modal>
    </section>
  );
}
