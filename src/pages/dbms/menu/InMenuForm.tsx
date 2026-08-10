import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/common/PageHeader';
import { enter_chk, axiosInstance } from '../../../utils/Tool.ts';
import type { InMenuType, ParentMenuType } from './InMenu.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   메뉴 작성(/dbms/menu/new) / 수정(/dbms/menu/:no/edit) 페이지.

   InMenuDTO (백엔드, dev.jpa.allimio.inmenu)
   no     long   - PK, 생성 시엔 보내지 않아도 됨(시퀀스 채번)
   fkno   Long   - 상위(대표) 메뉴 NO, 대표 메뉴 자신은 null
   dept   int    - 1: 대표 메뉴, 2: 하위 메뉴
   ord    int    - 정렬 순서
   title  String - 메뉴 제목
   purl   String - 경로
   tname  String - 테이블명
   mname  String - 메뉴(모듈) 설명
   useYn  String - 사용여부 Y/N (기본 Y)
   cdate  String - 서버(InMenuService.save)에서 Tool.getDate()로 채움

   API (InMenuCont, /inmenu)
   POST /inmenu/save          - InMenuDTO(JSON) → 등록
   PUT  /inmenu/update        - InMenuDTO(JSON, no 포함) → 수정
   GET  /inmenu/{pk}          - 단건 조회
   GET  /inmenu/find_by_fkno  - fkno 없이 호출 시 최상위(fkno=null, 대표) 메뉴 목록
   GET  /inmenu/find_by_fkno?fkno=1 - 해당 대표 메뉴의 하위 메뉴 목록

   ※ save/update가 @RequestBody(JSON)이므로 FormData/multipart가 아닌
     JSON으로 전송합니다 (axios에 객체를 그대로 넘기면 자동으로 JSON 전송).

   레이아웃: .form_group > .form_label + .form_control(.form_hint) 패턴
   (NoticeFormView 최신 마크업 톤과 동일 — dbms.css 참고)
--------------------------------------------------------------------- */

const DEPT_TOP = 1;   // 대표 메뉴
const DEPT_SUB = 2;   // 하위 메뉴

export default function InMenuFormView() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();
  const isEdit = Boolean(no);

  // 상위 메뉴(대표 메뉴) 후보 목록: fkno 없이 호출 → 최상위(fkno=null) 메뉴만 조회됨
  const [parentList, setParentList] = useState<ParentMenuType[]>([]);

  useEffect(() => {
    axiosInstance
      .get('/inmenu/find_by_fkno')
      .then(result => result.data)
      .then((data: ParentMenuType[]) => {
        // 방어적으로 dept=1(대표 메뉴)만, 수정 중인 자기 자신은 제외
        setParentList(
          data.filter(m => Number(m.dept) === DEPT_TOP && String(m.no) !== no)
        );
      })
      .catch(err => console.error(err));
  }, [no]);

  // 상태 객체 사용
  const [input, setInput] = useState<InMenuType>({
    dept: DEPT_TOP,
    ord: 0,
    useYn: 'Y',
  });

  // 수정모드일 때 기존 데이터 조회
  useEffect(() => {
    if (!isEdit) return;

    axiosInstance
      .get(`/inmenu/${no}`)
      .then(result => result.data)
      .then((data: InMenuType) => {
        setInput(data);
        console.log('-> inmenu data:', data);
      })
      .catch(err => console.error(err));
  }, [isEdit, no]);

  // e.target: event가 발생한 태그 (숫자 필드는 문자열로 받아뒀다가 전송 시 Number 변환)
  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setInput({ ...input, [id]: value });
  };

  const onDeptChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const dept = Number(e.target.value);
    // 대표 메뉴로 바꾸면 상위 메뉴 선택값은 의미가 없으므로 초기화
    setInput({ ...input, dept, fkno: dept === DEPT_TOP ? null : input.fkno });
  };

  const onUseYnChange = (value: 'Y' | 'N') => {
    setInput({ ...input, useYn: value });
  };

  const goBack = () => navigate('/dbms/menu');

  const send = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const isTopMenu = Number(input.dept) === DEPT_TOP;

    // InMenuDTO 형태 그대로 JSON으로 전송
    const payload: InMenuType = {
      ...(isEdit ? { no: Number(no) } : {}),
      fkno: isTopMenu
        ? null
        : input.fkno !== undefined && input.fkno !== null && String(input.fkno) !== ''
        ? Number(input.fkno)
        : null,
      dept: Number(input.dept ?? DEPT_TOP),
      ord: Number(input.ord ?? 0),
      title: input.title ?? '',
      purl: input.purl ?? '',
      tname: input.tname ?? '',
      mname: input.mname ?? '',
      useYn: input.useYn ?? 'Y',
    };

    console.log('-> payload:', payload);

    try {
      const response = isEdit
        ? await axiosInstance.put('/inmenu/update', payload)
        : await axiosInstance.post('/inmenu/save', payload);

      if (response.status === 401) { // axios는 상태값 처리, fetch는 안됨.
        alert('저장 권한이 없습니다.\n관리자로 다시 로그인 해주세요.');
        return;
      } else if (response.status !== 200) {
        alert('저장에 실패했습니다.\n다시 시도해주세요.');
        return;
      }

      const result = response.data; // axios
      console.log('서버 응답:', result);
      navigate('/dbms/menu/');

    } catch (err) {
      console.error('네트워크 오류:', err);
      alert('네트워크 오류가 발생했습니다.\n다시 시도해주세요.');
    }
  };

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? '메뉴 수정' : '메뉴 작성'}
        description={
          isEdit
            ? `No.${no}`
            : '사이트에 노출될 메뉴를 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />
      <form onSubmit={send}>
        <div className="card card_pad_lg">

          {/* 메뉴 뎁스 */}
          <div className="form_group">
            <label className="form_label" htmlFor="label_01">
              메뉴 뎁스<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <select
                id="label_01"
                className="form_select"
                value={input.dept ?? DEPT_TOP}
                onChange={onDeptChange}
                style={{ maxWidth: 200 }}
              >
                <option value={DEPT_TOP}>대표 메뉴</option>
                <option value={DEPT_SUB}>하위 메뉴</option>
              </select>
            </div>
          </div>

          {/* 상위 메뉴 (하위 메뉴 선택 시에만 노출) */}
          {Number(input.dept) === DEPT_SUB && (
            <div className="form_group">
              <label className="form_label" htmlFor="label_02">
                상위 메뉴<span className="req" title="필수 입력 요소">*</span>
              </label>
              <div className="form_control">
                <select
                  id="label_02"
                  className="form_select"
                  value={input.fkno ?? ''}
                  onChange={(e) => setInput({ ...input, fkno: e.target.value === '' ? null : Number(e.target.value) })}
                  style={{ maxWidth: 200 }}
                >
                  <option value="">선택하세요</option>
                  {parentList.map(p => (
                    <option key={p.no} value={p.no}>
                      {p.title}
                    </option>
                  ))}
                </select>

                {parentList.length === 0 && (
                  <div className="form_hint">등록된 대표 메뉴가 없습니다.</div>
                )}
              </div>
            </div>
          )}

          {/* 정렬 순서 */}
          <div className="form_group">
            <label className="form_label" htmlFor="label_03">정렬 순서</label>
            <div className="form_control">
              <input
                type="number"
                id="label_03"
                className="form_input"
                value={input.ord ?? 0}
                onChange={(e) => setInput({ ...input, ord: Number(e.target.value) })}
                onKeyDown={e => enter_chk(e, 'label_04')}
                style={{ maxWidth: 200 }}
              />
            </div>
          </div>

          {/* 메뉴 제목 */}
          <div className="form_group">
            <label className="form_label" htmlFor="label_04">
              메뉴 제목<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="label_04"
                className="form_input"
                placeholder="메뉴 제목을 입력하세요"
                value={input.title ?? ''}
                onChange={(e) => setInput({ ...input, title: e.target.value })}
                onKeyDown={e => enter_chk(e, 'label_05')}
              />
            </div>
          </div>

          {/* 경로 */}
          <div className="form_group">
            <label className="form_label" htmlFor="label_05">
              경로(URL)<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="label_05"
                className="form_input"
                placeholder="예: /board/list/1"
                value={input.purl ?? ''}
                onChange={(e) => setInput({ ...input, purl: e.target.value })}
                onKeyDown={e => enter_chk(e, 'label_06')}
              />
            </div>
          </div>

          {/* 테이블명 */}
          <div className="form_group">
            <label className="form_label" htmlFor="label_06">테이블명</label>
            <div className="form_control">
              <input
                id="label_06"
                className="form_input"
                placeholder="연결된 테이블명"
                value={input.tname ?? ''}
                onChange={(e) => setInput({ ...input, tname: e.target.value })}
                onKeyDown={e => enter_chk(e, 'label_07')}
              />
            </div>
          </div>

          {/* 메뉴 설명 */}
          <div className="form_group">
            <label className="form_label" htmlFor="label_07">메뉴 설명</label>
            <div className="form_control">
              <input
                id="label_07"
                className="form_input"
                placeholder="메뉴에 대한 설명"
                value={input.mname ?? ''}
                onChange={(e) => setInput({ ...input, mname: e.target.value })}
              />

              <div className="form_hint">등록 후에도 목록에서 다시 수정할 수 있습니다.</div>
            </div>
          </div>

          {/* 사용 여부 */}
          <div className="form_group">
            <label className="form_label" htmlFor="label_08">
              사용 여부<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <div className="form_check">
                <input
                  type="radio"
                  id="label_08"
                  name="useYn"
                  value="Y"
                  checked={(input.useYn ?? 'Y') === 'Y'}
                  onChange={() => onUseYnChange('Y')}
                />
                <label htmlFor="label_08" className="b_title">사용</label>
              </div>

              <div className="form_check">
                <input
                  type="radio"
                  id="label_09"
                  name="useYn"
                  value="N"
                  checked={input.useYn === 'N'}
                  onChange={() => onUseYnChange('N')}
                />
                <label htmlFor="label_09" className="b_title">미사용</label>
              </div>
            </div>
          </div>

          <div className="form_page_footer">
            <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={send}>
              저장
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
