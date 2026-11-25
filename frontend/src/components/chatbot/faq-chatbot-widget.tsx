import {
  CloseOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Button, Input, Spin, Typography } from 'antd';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { chatbotService } from '../../api/services/chatbot.service';
import type { ChatbotSuggestion } from '../../types/chatbot';
import { RecommendationChatbotFlow } from './recommendation-chatbot-flow';

type ChatRole = 'BOT' | 'CUSTOMER';
type ChatbotMode = 'FAQ' | 'RECOMMENDATION';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'BOT',
  content:
    'Xin chào! Tôi có thể trả lời về bảo hành, giao hàng, thanh toán, đổi trả, hủy đơn hoặc tư vấn chọn xe.',
};

const createMessageId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const FaqChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatbotMode>('FAQ');
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [suggestions, setSuggestions] = useState<ChatbotSuggestion[]>([]);
  const [isSuggestionsLoaded, setIsSuggestionsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const panelId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const closeChatbot = (): void => {
    setIsOpen(false);
    launcherRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen || isSuggestionsLoaded) {
      return;
    }

    let isMounted = true;
    void chatbotService
      .getSuggestions()
      .then((items) => {
        if (isMounted) {
          setSuggestions(items);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setIsSuggestionsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, isSuggestionsLoaded]);

  useEffect(() => {
    const body = bodyRef.current;
    const messageList = messagesRef.current;
    if (!body || !messageList) {
      return;
    }

    body.scrollTo({
      top: Math.max(0, messageList.offsetHeight - body.clientHeight),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [isLoading, isOpen, messages, mode]);

  const sendMessage = async (rawMessage: string): Promise<void> => {
    const message = rawMessage.trim();
    if (!message || sendingRef.current) {
      return;
    }

    sendingRef.current = true;
    setMessages((current) => [
      ...current,
      { id: createMessageId(), role: 'CUSTOMER', content: message },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatbotService.sendMessage({ message });
      setMessages((current) => [
        ...current,
        { id: createMessageId(), role: 'BOT', content: response.message },
      ]);
      setSuggestions(response.suggestions);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'BOT',
          content:
            'Kết nối tới trợ lý đang gặp sự cố. Bạn vui lòng thử lại trong ít phút.',
        },
      ]);
    } finally {
      sendingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <div className={`faq-chatbot-floating${isOpen ? ' faq-chatbot-floating-open' : ''}`}>
      {isOpen ? (
        <section
          id={panelId}
          ref={panelRef}
          className="faq-chatbot-panel"
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              closeChatbot();
            }
          }}
        >
          <div className="faq-chatbot-header">
            <div className="faq-chatbot-title">
              <span className="faq-chatbot-avatar"><RobotOutlined /></span>
              <div>
                <Typography.Text id={titleId} strong>Trợ lý XeDap22h</Typography.Text>
                <Typography.Text type="secondary">
                  {mode === 'FAQ' ? 'Hỏi nhanh, trả lời từ FAQ' : 'Tư vấn xe theo nhu cầu'}
                </Typography.Text>
              </div>
            </div>
            <Button
              type="text"
              shape="circle"
              icon={<CloseOutlined />}
              aria-label="Đóng chatbot"
              onClick={closeChatbot}
            />
          </div>

          {mode === 'RECOMMENDATION' ? (
            <RecommendationChatbotFlow onBackToFaq={() => setMode('FAQ')} />
          ) : (
            <>
              <div ref={bodyRef} className="faq-chatbot-body">
                <div ref={messagesRef} className="faq-chatbot-messages" aria-live="polite">
                  {messages.map((chatMessage) => (
                    <div
                      key={chatMessage.id}
                      className={`faq-chatbot-message faq-chatbot-message-${chatMessage.role.toLowerCase()}`}
                    >
                      {chatMessage.role === 'BOT' ? <RobotOutlined /> : null}
                      <Typography.Text>{chatMessage.content}</Typography.Text>
                    </div>
                  ))}
                  {isLoading ? (
                    <div className="faq-chatbot-message faq-chatbot-message-bot">
                      <RobotOutlined />
                      <Spin size="small" />
                    </div>
                  ) : null}
                </div>

                <div className="faq-chatbot-recommendation-cta">
                  <Typography.Text type="secondary">Bạn cần chọn xe phù hợp?</Typography.Text>
                  <Button
                    size="small"
                    icon={<CustomerServiceOutlined />}
                    onClick={() => setMode('RECOMMENDATION')}
                  >
                    Tư vấn chọn xe
                  </Button>
                </div>

                {suggestions.length > 0 ? (
                  <div className="faq-chatbot-suggestions">
                    <Typography.Text type="secondary">Câu hỏi gợi ý</Typography.Text>
                    <div className="faq-chatbot-suggestion-list">
                      {suggestions.map((suggestion) => (
                        <Button
                          key={suggestion.id}
                          size="small"
                          onClick={() => void sendMessage(suggestion.question)}
                          disabled={isLoading}
                        >
                          {suggestion.question}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <form className="faq-chatbot-composer" onSubmit={handleSubmit}>
                <Input.TextArea
                  aria-label="Câu hỏi cho trợ lý XeDap22h"
                  value={input}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  maxLength={1_000}
                  placeholder="Nhập câu hỏi của bạn..."
                  disabled={isLoading}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  type="primary"
                  htmlType="submit"
                  shape="circle"
                  icon={<SendOutlined />}
                  aria-label="Gửi câu hỏi"
                  loading={isLoading}
                  disabled={!input.trim()}
                />
              </form>
            </>
          )}
        </section>
      ) : null}

      <Button
        ref={launcherRef}
        className="faq-chatbot-toggle"
        type="primary"
        shape="circle"
        size="large"
        icon={<MessageOutlined />}
        aria-label={isOpen ? 'Đóng chatbot' : 'Mở chatbot'}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => {
          if (isOpen) {
            closeChatbot();
          } else {
            setIsOpen(true);
          }
        }}
      />
    </div>
  );
};
