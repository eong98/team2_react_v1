import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { ChatMenuTypes } from '../../../../components/ts/ChatMenu';
import type { ChatBubble } from '../../../../components/ui/chatbot/ChatBot';

/* ---------------------------------------------------------------------
   관리자용 챗봇 "보기 전용" 미리보기.

   실제 세션 생성/AI 응답/QA 등록 같은 부수효과가 있는 API를 전혀 호출하지
   않습니다. 클릭 시 프론트에 이미 갖고 있는 flatMenuList(트리 데이터)
   안에서만 탐색하며, 화면 흐름만 시뮬레이션합니다.

   selectedPath는 ChatMenuFlowchart 칼럼뷰에서 클릭한 경로를 그대로 전달받아,
   트리 클릭 시 미리보기 대화도 그 경로를 따라 재구성됩니다.

   internalDepth: selectedPath(트리 클릭)와 미리보기 안에서 직접 클릭한 것을
   합쳐서 "지금 몇 단계인지"를 추적합니다. 이게 없으면, 미리보기 안에서
   직접 클릭해 하위 단계로 들어가도 selectedPath는 계속 [](길이 0)이라
   최상위 스타일(가로 pill)로 계속 렌더링되는 버그가 생깁니다.

   ref로 reset()을 노출해서, 부모(ChatMenuFlowchart)의 새로고침 버튼이
   이 컴포넌트의 내부 상태를 초기화할 수 있게 합니다.

   현재 시각(now())은 더미 데이터입니다 — 실제 시각이 아니라 호출할 때마다
   1분씩 증가하는 고정 값입니다.
--------------------------------------------------------------------- */

interface ChatBotPreviewProps {
  flatMenuList: ChatMenuTypes[];
  selectedPath: ChatMenuTypes[];
}

export interface ChatBotPreviewHandle {
  reset: () => void;
}

const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

let dummyMinuteOffset = 0;
const now = () => {
  const base = new Date('2026-09-14T09:00:00');
  base.setMinutes(base.getMinutes() + dummyMinuteOffset);
  dummyMinuteOffset += 1;
  return base.toISOString();
};

const makeIntroBubble = (): ChatBubble => ({
  id: 'intro',
  sender: 2,
  content: '안녕하세요! 무엇을 도와드릴까요?',
  createdAt: now(),
});

const ChatBotPreview = forwardRef<ChatBotPreviewHandle, ChatBotPreviewProps>(({ flatMenuList, selectedPath }, ref) => {
  const [bubbles, setBubbles] = useState<ChatBubble[]>(() => [makeIntroBubble()]);
  const [currentOptions, setCurrentOptions] = useState<ChatMenuTypes[]>([]);
  const [showEndButtons, setShowEndButtons] = useState(false);

  // 미리보기 안에서 직접 클릭해 진행한 깊이 (selectedPath와 합쳐서 판단)
  const [internalDepth, setInternalDepth] = useState(0);

  const rootOptions = () => flatMenuList.filter((m) => m.pno == null).sort((a, b) => a.vseq - b.vseq);
  const findChildren = (pno: number) => flatMenuList.filter((m) => m.pno === pno).sort((a, b) => a.vseq - b.vseq);

  const resetToIntro = () => {
    setBubbles([makeIntroBubble()]);
    setCurrentOptions(rootOptions());
    setShowEndButtons(false);
    setInternalDepth(0);
  };

  useImperativeHandle(ref, () => ({ reset: resetToIntro }));

  // 트리에서 selectedPath가 바뀔 때마다 그 경로를 그대로 따라감 (internalDepth도 같이 맞춤)
  useEffect(() => {
    if (selectedPath.length === 0) {
      resetToIntro();
      return;
    }

    const nextBubbles: ChatBubble[] = [makeIntroBubble()];
    selectedPath.forEach((node) => {
      nextBubbles.push({ id: `q-${node.no}`, sender: 0, content: node.label, createdAt: now() });
      if (node.answer) {
        nextBubbles.push({ id: `a-${node.no}`, sender: 2, content: node.answer, createdAt: now() });
      }
    });
    setBubbles(nextBubbles);

    const lastNode = selectedPath[selectedPath.length - 1];
    const children = findChildren(lastNode.no);
    setCurrentOptions(children);
    setShowEndButtons(true);
    setInternalDepth(selectedPath.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath, flatMenuList]);

  // 미리보기 안에서 직접 클릭 — 깊이를 1 증가시키며 진행
  const handleSelect = (menu: ChatMenuTypes) => {
    const nextBubbles: ChatBubble[] = [
      ...bubbles,
      { id: `${menu.no}-q-${makeId()}`, sender: 0, content: menu.label, createdAt: now() },
    ];
    if (menu.answer) {
      nextBubbles.push({ id: `${menu.no}-a-${makeId()}`, sender: 2, content: menu.answer, createdAt: now() });
    } else if (menu.answer === null) {
      nextBubbles.push({ id: `${menu.no}-a-${makeId()}`, sender: 2, content: '서비스 준비 중 입니다.', createdAt: now() });
    }
    console.log(menu.answer)
    setBubbles(nextBubbles);

    const children = findChildren(menu.no);
    setCurrentOptions(children);
    setShowEndButtons(true);
    setInternalDepth((prev) => prev + 1);
  };

  const handleAiPreview = () => {
    setBubbles((prev) => [
      ...prev,
      { id: `ai-${makeId()}`, kind: 'divider', sender: 2, content: '여기부터 AI 상담입니다', createdAt: now() },
      {
        id: `ai-note-${makeId()}`,
        sender: 2,
        content: '(실제 화면에서는 여기서 자유롭게 질문하실 수 있습니다)',
        createdAt: now(),
      },
    ]);
    setCurrentOptions([]);
    setShowEndButtons(false);
  };

  const isRootLevel = internalDepth === 0;

  return (
    <div className="chatbot_preview_readonly">
      <div className="chatbot_preview_readonly_badge">
        <span>미리보기 (클릭은 가능하지만 실제로 저장/전송되지 않습니다)</span>
      </div>

      <div className="chatbot_body">
        {bubbles.map((b) =>
          b.kind === 'divider' ? (
            <div key={b.id} className="chat_divider_line">
              <span>{b.content}</span>
            </div>
          ) : (
            <div key={b.id} className={`chat_bubble_row ${b.sender === 0 ? 'user' : 'system'}`}>
              <div className={`chat_bubble ${b.sender === 0 ? 'user' : b.sender === 1 ? 'ai' : 'system'}`}>{b.content}</div>
            </div>
          ),
        )}

        {currentOptions.length > 0 && isRootLevel && (
          <>
            <div className="chat_options">
              {currentOptions.map((opt) => (
                <button key={opt.no} type="button" className="chat_option_btn" onClick={() => handleSelect(opt)}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="chat_ai_divider">
              <span>또는</span>
            </div>
            <button type="button" className="chat_ai_entry_btn" onClick={handleAiPreview}>
              ✨ AI에게 바로 물어보기
            </button>
          </>
        )}

        {currentOptions.length > 0 && !isRootLevel && (
          <div className="chat_option_list">
            {currentOptions.map((opt) => (
              <button key={opt.no} type="button" className="chat_option_list_item" onClick={() => handleSelect(opt)}>
                <span>{opt.label}</span>
                <span className="chat_option_arrow">›</span>
              </button>
            ))}
          </div>
        )}

        {showEndButtons && (
          <div className="chat_options">
            <button type="button" className="chat_option_btn" onClick={resetToIntro}>
              다른 질문하기
            </button>
            <button type="button" className="chat_option_btn" onClick={handleAiPreview}>
              AI 상담
            </button>
          </div>
        )}
      </div>

      <div className="chatbot_preview_readonly_footer">메시지 입력창은 실제 화면에서만 활성화됩니다</div>
    </div>
  );
});

ChatBotPreview.displayName = 'ChatBotPreview';

export default ChatBotPreview;