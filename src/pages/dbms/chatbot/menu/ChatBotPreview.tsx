import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { ChatMenuTypes } from '../../../../components/ts/ChatMenu';

/* ---------------------------------------------------------------------
   관리자용 챗봇 "보기 전용" 미리보기.

   실제 세션 생성/CHAT_LOG 저장/AI 응답 같은 부수효과가 있는 API를 전혀
   호출하지 않습니다. flatMenuList(부모가 이미 조회해둔 트리 데이터)
   안에서만 탐색하며 화면 흐름만 시뮬레이션합니다.

   마크업/클래스명은 실제 사용자 화면(ChatRoom.tsx)과 최대한 동일하게
   맞춰서, 여기서 보이는 모습이 실제 화면과 일치하도록 합니다.

   selectedPath는 ChatMenuFlowchart 칼럼뷰에서 클릭한 경로를 그대로
   전달받아, 트리 클릭 시 미리보기 대화도 그 경로를 따라 재구성됩니다.
--------------------------------------------------------------------- */

interface PreviewBubble {
  id: string;
  sender: 0 | 1 | 2; // 0 사용자 / 1 AI / 2 시스템
  content: string;
  kind?: 'message' | 'divider';
}

interface ChatBotPreviewProps {
  flatMenuList: ChatMenuTypes[];
  selectedPath: ChatMenuTypes[];
}

export interface ChatBotPreviewHandle {
  reset: () => void;
}

const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

const INTRO_BUBBLE: PreviewBubble = { id: 'intro', sender: 2, content: '안녕하세요! 무엇을 도와드릴까요?' };

const ChatBotPreview = forwardRef<ChatBotPreviewHandle, ChatBotPreviewProps>(({ flatMenuList, selectedPath }, ref) => {
  const [bubbles, setBubbles] = useState<PreviewBubble[]>([INTRO_BUBBLE]);
  const [currentOptions, setCurrentOptions] = useState<ChatMenuTypes[]>([]);
  const [showEndButtons, setShowEndButtons] = useState(false);
  const [internalDepth, setInternalDepth] = useState(0);

  const rootOptions = () => flatMenuList.filter((m) => m.pno == null).sort((a, b) => a.vseq - b.vseq);
  const findChildren = (pno: number) => flatMenuList.filter((m) => m.pno === pno).sort((a, b) => a.vseq - b.vseq);

  const resetToIntro = () => {
    setBubbles([INTRO_BUBBLE]);
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

    const nextBubbles: PreviewBubble[] = [INTRO_BUBBLE];
    selectedPath.forEach((node) => {
      nextBubbles.push({ id: `q-${node.no}`, sender: 0, content: node.label });
      nextBubbles.push({
        id: `a-${node.no}`,
        sender: 2,
        content: node.answer && node.answer.trim() ? node.answer : '서비스 준비 중입니다.',
      });
    });
    setBubbles(nextBubbles);

    const lastNode = selectedPath[selectedPath.length - 1];
    const children = findChildren(lastNode.no);
    setCurrentOptions(children);
    setShowEndButtons(children.length === 0);
    setInternalDepth(selectedPath.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath, flatMenuList]);

  const handleAiPreview = () => {
    setBubbles((prev) => [
      ...prev,
      { id: `ai-${makeId()}`, sender: 2, content: '여기부터 AI 상담입니다', kind: 'divider' },
      { id: `ai-greet-${makeId()}`, sender: 2, content: '안녕하세요! 무엇을 도와드릴까요?' },
    ]);
    setCurrentOptions([]);
    setShowEndButtons(false);
  };

  const isRootLevel = internalDepth === 0;

  return (
    <div className="chatbot_preview_readonly">
      <div className="chatbot_preview_readonly_badge">미리보기 (실제로 저장/전송되지 않습니다)</div>

      <div className="chatbot_header">
        <div className="chatbot_header_title">
          <span className="chatbot_status_dot active" />
          <span>알리미오 상담봇</span>
        </div>
      </div>

      <div className="chatbot_body">
        {bubbles.map((b) =>
          b.kind === 'divider' ? (
            <div key={b.id} className="chat_divider_line">
              <span>{b.content}</span>
            </div>
          ) : (
            <div key={b.id} className={`chat_bubble_row ${b.sender === 0 ? 'user' : 'system'}`}>
              {b.sender !== 0 && <span className="chat_sender_label">{b.sender === 1 ? 'AI' : '상담봇'}</span>}
              <div className="chat_bubble_wrap">
                <div className={`chat_bubble ${b.sender === 0 ? 'user' : b.sender === 1 ? 'ai' : 'system'}`}>
                  {b.content}
                </div>
              </div>
            </div>
          ),
        )}

        {currentOptions.length > 0 && isRootLevel && (
          <>
            <div className="chat_options">
              {currentOptions.map((opt) => (
                <button key={opt.no} type="button" className="chat_option_btn">
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
              <button key={opt.no} type="button" className="chat_option_list_item">
                <span>{opt.label}</span>
                <span className="chat_option_arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showEndButtons && (
        <div className="chatbot_fixed_actions">
          <button type="button" className="chat_option_btn" onClick={resetToIntro}>
            다른 질문하기
          </button>
          <button type="button" className="chat_option_btn" onClick={handleAiPreview}>
            AI 상담
          </button>
          <button type="button" className="chat_option_btn chat_option_end" disabled>
            상담 종료
          </button>
        </div>
      )}

      <div className="chatbot_preview_readonly_footer">메시지 입력창은 실제 화면에서만 활성화됩니다</div>
    </div>
  );
});

ChatBotPreview.displayName = 'ChatBotPreview';

export default ChatBotPreview;