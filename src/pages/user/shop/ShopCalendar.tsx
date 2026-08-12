import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { AlertModal, ConfirmDeleteModal, PageHeader } from '../../../components/ui';
import Modal from '../../../components/ui/Modal';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalCurrentShop } from '../../../store/UserStore';
import './ShopCalendar.css';
import {
  CTYPE_OPTIONS,
  COLOR_SWATCHES,
  EMPTY_CALENDAR,
  getCtypeOption,
  toFcRange,
  toInputValue,
  fromInputValue,
  toStoreDates,
  formatRangeLabel,
  type ShopCalendarType,
} from '../../../components/ts/ShopCalendarType';

/* ---------------------------------------------------------------------
   매장 캘린더(/user/calendar) - Topbar에서 입장한 매장(GlobalCurrentShop().no)에
   물려서 SHOP_CALENDAR 일정을 달력으로 등록/조회/수정/삭제합니다.

   SHOP_CALENDAR 컬럼: no/sno/ctype/title/contents/sdate/edate/allday/color/status/cdate/udate

   API (ShopCalendarCont, /shopcalendar) - 백엔드는 이미 구현되어 있음
   GET    /shopcalendar/find_by_sno/{sno}
   POST   /shopcalendar/save
   PUT    /shopcalendar/update
   DELETE /shopcalendar/{pk}

   날짜 변환/타입/색상 상수는 ./ShopCalendar.ts 로 옮겨뒀습니다.
--------------------------------------------------------------------- */

type DraftState = ShopCalendarType & { startInput: string; endInput: string };

const toDraft = (row: ShopCalendarType): DraftState => {
  const { start, end } = toFcRange(row.sdate, row.edate, row.allday === 'Y');
  const displayEnd = row.allday === 'Y' ? new Date(end.getTime() - 24 * 60 * 60 * 1000) : end;
  return {
    ...row,
    startInput: toInputValue(start, row.allday === 'Y'),
    endInput: toInputValue(displayEnd, row.allday === 'Y'),
  };
};

export default function ShopCalendar() {
  const navigate = useNavigate();
  const { no: sno, title: shopTitle } = GlobalCurrentShop();
  const calRef = useRef<FullCalendar | null>(null);

  const [rows, setRows] = useState<ShopCalendarType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTypes, setActiveTypes] = useState<Set<number>>(
    () => new Set(CTYPE_OPTIONS.map((c) => c.value)),
  );

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'title' | 'range', string>>>({});

  const [deleteTarget, setDeleteTarget] = useState<ShopCalendarType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const isEdit = Boolean(draft?.no);

  const loadList = async () => {
    if (!sno) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get<ShopCalendarType[]>(`/shopcalendar/find_by_sno/${sno}`);
      setRows(res.data ?? []);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sno]);

  const visibleRows = useMemo(
    () => rows.filter((r) => r.status !== 'N' && activeTypes.has(r.ctype)),
    [rows, activeTypes],
  );

  const events: EventInput[] = useMemo(
    () =>
      visibleRows.map((row) => {
        const { start, end, allDay } = toFcRange(row.sdate, row.edate, row.allday === 'Y');
        const color = row.color || getCtypeOption(row.ctype).color;
        return {
          id: String(row.no),
          title: row.title,
          start,
          end,
          allDay,
          backgroundColor: color,
          borderColor: color,
          textColor: '#04211D',
          extendedProps: { row },
        };
      }),
    [visibleRows],
  );

  const toggleType = (value: number) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const openCreate = (start: Date, end: Date | null, allDay: boolean) => {
    const { sdate, edate } = toStoreDates(start, end ?? start, allDay);
    setErrors({});
    setDraft(
      toDraft({
        ...EMPTY_CALENDAR,
        sno: sno ?? undefined,
        sdate,
        edate,
        allday: allDay ? 'Y' : 'N',
      }),
    );
  };

  const openEdit = (row: ShopCalendarType) => {
    setErrors({});
    setDraft(toDraft(row));
  };

  const closeForm = () => setDraft(null);

  const onSelect = (info: DateSelectArg) => {
    openCreate(info.start, info.end, info.allDay);
    info.view.calendar.unselect();
  };

  const onDateClick = (info: { date: Date; allDay: boolean }) => {
    openCreate(info.date, null, info.allDay);
  };

  const onEventClick = (info: EventClickArg) => {
    const row = info.event.extendedProps.row as ShopCalendarType;
    openEdit(row);
  };

  const persistDragOrResize = async (row: ShopCalendarType, start: Date, end: Date | null, allDay: boolean) => {
    const { sdate, edate } = toStoreDates(start, end, allDay);
    try {
      await axiosInstance.put('/shopcalendar/update', {
        ...row,
        allday: allDay ? 'Y' : 'N',
        sdate,
        edate,
      });
      loadList();
    } catch (err) {
      console.error(err);
      setAlert({ message: '일정 이동에 실패했습니다. 다시 시도해주세요.', variant: 'error' });
      loadList();
    }
  };

  const onEventDrop = (info: EventDropArg) => {
    const row = info.event.extendedProps.row as ShopCalendarType;
    persistDragOrResize(row, info.event.start!, info.event.end, info.event.allDay);
  };

  const onEventResize = (info: EventResizeDoneArg) => {
    const row = info.event.extendedProps.row as ShopCalendarType;
    persistDragOrResize(row, info.event.start!, info.event.end, info.event.allDay);
  };

  const onDraftChange = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    if (key === 'title' && errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
  };

  const onAllDayToggle = (allDay: boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const start = fromInputValue(prev.startInput, prev.allday === 'Y') ?? new Date();
      const end = fromInputValue(prev.endInput, prev.allday === 'Y') ?? start;
      return {
        ...prev,
        allday: allDay ? 'Y' : 'N',
        startInput: toInputValue(start, allDay),
        endInput: toInputValue(end, allDay),
      };
    });
  };

  const validateDraft = (d: DraftState) => {
    const nextErrors: typeof errors = {};
    if (!d.title.trim()) nextErrors.title = '제목을 입력해주세요.';

    const start = fromInputValue(d.startInput, d.allday === 'Y');
    const end = fromInputValue(d.endInput, d.allday === 'Y');
    if (!start || !end) {
      nextErrors.range = '시작/종료 일시를 입력해주세요.';
    } else if (end.getTime() < start.getTime()) {
      nextErrors.range = '종료 일시가 시작 일시보다 빠를 수 없습니다.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!draft || !sno || saving) return;
    if (!validateDraft(draft)) return;

    const allDay = draft.allday === 'Y';
    const start = fromInputValue(draft.startInput, allDay)!;
    const end = fromInputValue(draft.endInput, allDay)!;
    const { sdate, edate } = toStoreDates(start, end, allDay);

    const payload: ShopCalendarType = {
      no: draft.no,
      sno,
      ctype: Number(draft.ctype),
      title: draft.title.trim(),
      contents: draft.contents?.trim() || '',
      sdate,
      edate,
      allday: draft.allday,
      color: draft.color || '',
      status: 'Y',
    };

    setSaving(true);
    try {
      if (isEdit) {
        await axiosInstance.put('/shopcalendar/update', payload);
      } else {
        await axiosInstance.post('/shopcalendar/save', payload);
      }
      closeForm();
      loadList();
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        setAlert({ message: `저장에 실패했습니다. (${err.response?.status ?? 'network'})`, variant: 'error' });
      } else {
        setAlert({ message: '저장 중 알 수 없는 오류가 발생했습니다.', variant: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.no) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/shopcalendar/${deleteTarget.no}`);
      setDeleteTarget(null);
      closeForm();
      loadList();
    } catch (err) {
      console.error(err);
      setAlert({ message: '삭제에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  /* ---- 매장 미선택 시 안내 ---- */
  if (!sno) {
    return (
      <section className="view active shop-calendar-page">
        <PageHeader title="매장 캘린더" description="매장을 선택하면 해당 매장의 일정을 관리할 수 있습니다." />
        <div className="card card_pad_lg cal_empty">
          <p className="b_title">먼저 관리할 매장을 선택해주세요.</p>
          <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
            매장 선택하러 가기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="view active shop-calendar-page">
      <PageHeader
        title="매장 캘린더"
        description={`${shopTitle} 매장의 일정을 등록하고 관리합니다. 날짜를 클릭하거나 드래그해서 새 일정을 만들 수 있습니다.`}
        createLabel="+ 일정 등록"
        onCreate={() => openCreate(new Date(), null, true)}
      />

      <div className="cal_toolbar">
        <div className="cal_legend">
          {CTYPE_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`cal_legend_item ${activeTypes.has(c.value) ? 'on' : ''}`}
              onClick={() => toggleType(c.value)}
            >
              <span className="cal_legend_dot" style={{ background: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card card_pad_md">
        {loading ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>불러오는 중...</p>
        ) : (
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,listWeek',
            }}
            locale="ko"
            buttonText={{ today: '오늘', month: '월', week: '주', list: '목록' }}
            height="auto"
            events={events}
            selectable
            selectMirror
            editable
            dayMaxEvents
            select={onSelect}
            dateClick={onDateClick}
            eventClick={onEventClick}
            eventDrop={onEventDrop}
            eventResize={onEventResize}
          />
        )}
      </div>

      {/* ---- 일정 등록/수정 모달 ---- */}
      <Modal
        open={draft !== null}
        onClose={closeForm}
        titleId="calFormTitle"
        title={isEdit ? '일정 수정' : '일정 등록'}
        footer={
          <>
            {isEdit && (
              <button
                type="button"
                className="btn btn_md btn_danger"
                style={{ marginRight: 'auto' }}
                onClick={() => draft && setDeleteTarget(draft)}
              >
                삭제
              </button>
            )}
            <button type="button" className="btn btn_md btn_ghost" onClick={closeForm}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </>
        }
      >
        {draft && (
          <>
            <div className="form_group">
              <label className="form_label" htmlFor="cal_title">
                제목<span className="req">*</span>
              </label>
              <div className="form_control">
                <input
                  id="cal_title"
                  type="text"
                  className={`form_input ${errors.title ? 'is_error' : ''}`}
                  placeholder="일정 제목을 입력하세요"
                  value={draft.title}
                  onChange={(e) => onDraftChange('title', e.target.value)}
                />
                {errors.title && <div className="form_hint error">{errors.title}</div>}
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor="cal_ctype">
                일정 종류
              </label>
              <div className="form_control">
                <select
                  id="cal_ctype"
                  className="form_select"
                  value={draft.ctype}
                  onChange={(e) => onDraftChange('ctype', Number(e.target.value))}
                  style={{ maxWidth: 200 }}
                >
                  {CTYPE_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form_group">
              <div className="form_check">
                <input
                  type="checkbox"
                  id="cal_allday"
                  checked={draft.allday === 'Y'}
                  onChange={(e) => onAllDayToggle(e.target.checked)}
                />
                <label htmlFor="cal_allday" className="b_title">
                  하루 종일
                </label>
              </div>
            </div>

            <div className="form_group">
              <div className="form_row_2">
                <div>
                  <label className="form_label" htmlFor="cal_start">
                    시작<span className="req">*</span>
                  </label>
                  <div className="form_control">
                    <input
                      id="cal_start"
                      type={draft.allday === 'Y' ? 'date' : 'datetime-local'}
                      className="form_input"
                      value={draft.startInput}
                      onChange={(e) => onDraftChange('startInput', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="form_label" htmlFor="cal_end">
                    종료<span className="req">*</span>
                  </label>
                  <div className="form_control">
                    <input
                      id="cal_end"
                      type={draft.allday === 'Y' ? 'date' : 'datetime-local'}
                      className="form_input"
                      value={draft.endInput}
                      onChange={(e) => onDraftChange('endInput', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {errors.range && <div className="form_hint error">{errors.range}</div>}
            </div>

            <div className="form_group">
              <label className="form_label">색상</label>
              <div className="form_control">
                <div className="color_swatch_row">
                  <button
                    type="button"
                    className={`cal_legend_item ${!draft.color ? 'on' : ''}`}
                    onClick={() => onDraftChange('color', '')}
                  >
                    기본({getCtypeOption(draft.ctype).label})
                  </button>
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color_swatch ${draft.color === c ? 'on' : ''}`}
                      style={{ background: c }}
                      aria-label={c}
                      onClick={() => onDraftChange('color', c)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="form_group">
              <label className="form_label" htmlFor="cal_contents">
                메모
              </label>
              <div className="form_control">
                <textarea
                  id="cal_contents"
                  className="form_textarea"
                  placeholder="상세 메모(선택)"
                  value={draft.contents}
                  onChange={(e) => onDraftChange('contents', e.target.value)}
                  style={{ minHeight: 90 }}
                />
              </div>
            </div>

            {isEdit && (
              <p style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                기간: {formatRangeLabel(draft)}
              </p>
            )}
          </>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget?.title}
        loading={deleting}
      />

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}
