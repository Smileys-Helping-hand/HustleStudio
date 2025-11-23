import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { sendChatCompletion } from '../../lib/openaiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCredits, deductCredits, MINIMUM_CREDITS_PER_REQUEST } from '../../hooks/useCredits.js';
import { useTenant } from '../../context/TenantContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import AIResponseFeedback from '../../components/AIResponseFeedback.jsx';
import { getGlobalRecommendations } from '../../lib/insightBot.js';

const ChatBubble = ({ role, content }) => (
  <div
    className={`rounded-2xl border border-white/10 p-4 text-sm leading-relaxed shadow-lg transition ${
      role === 'user'
        ? 'self-end bg-indigo-500/10 text-indigo-100'
        : 'self-start bg-white/5 text-white/80'
    }`}
  >
    <p className="whitespace-pre-wrap">{content}</p>
  </div>
);

ChatBubble.propTypes = {
  role: PropTypes.oneOf(['user', 'assistant']).isRequired,
  content: PropTypes.string.isRequired,
};

const defaultHistory = (title) => [
  {
    role: 'assistant',
    content: `${title} is active. Ask a question to start generating insights.`,
    auditLogId: null,
  },
];

const AIChatPage = ({ assistantKey, title, systemPrompt, model }) => {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { balance, loading: creditsLoading } = useCredits();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => defaultHistory(title));
  const [isSending, setIsSending] = useState(false);
  const [abortController, setAbortController] = useState(null);

  const systemMessage = useMemo(
    () => ({ role: 'system', content: systemPrompt }),
    [systemPrompt]
  );

  const sendPrompt = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    if (!user) {
      toast.error('Sign in to use AI assistants.');
      return;
    }
    if (!activeTenantId) {
      toast.error('Select a workspace before using assistants.');
      return;
    }
    if (creditsLoading) {
      toast('Checking credits…');
      return;
    }
    if (balance < MINIMUM_CREDITS_PER_REQUEST) {
      toast.error('Top up credits to continue.');
      return;
    }

    const userMessage = { role: 'user', content: input.trim() };
    const optimisticHistory = [...messages, userMessage];
    setMessages(optimisticHistory);
    setInput('');
    const controller = new AbortController();
    setAbortController(controller);
    setIsSending(true);

    try {
      let dynamicSystemMessage = systemMessage;
      if (['strategy', 'growth-coach'].includes(assistantKey)) {
        try {
          const globalTips = await getGlobalRecommendations(userMessage.content, {
            tenantId: activeTenantId,
            assistant: assistantKey,
          });
          if (globalTips) {
            dynamicSystemMessage = {
              role: 'system',
              content: `${systemPrompt}\n\nGlobal intelligence briefing:\n${globalTips}`,
            };
          }
        } catch (error) {
          console.warn('[AIChat] Unable to fetch global recommendations.', error);
        }
      }

      const response = await sendChatCompletion({
        messages: [dynamicSystemMessage, ...optimisticHistory],
        model,
        signal: controller.signal,
        tenantId: activeTenantId,
        userId: user.uid,
        assistant: assistantKey,
      });
      const choice = response.choices?.[0]?.message?.content ?? 'No response received.';
      const completionTokens = response.usage?.completion_tokens ?? 0;
      const promptTokens = response.usage?.prompt_tokens ?? 0;
      const totalTokens = response.usage?.total_tokens ?? completionTokens + promptTokens;
      const assistantMessage = {
        role: 'assistant',
        content: choice.trim(),
        auditLogId: response.auditLogId ?? null,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      await deductCredits(user.uid, totalTokens, {
        assistant: assistantKey,
        promptTokens,
        completionTokens,
        model,
        tenantId: activeTenantId,
      });
      toast.success('Assistant response generated.');
    } catch (error) {
      console.error('[AIChat] error', error);
      setMessages((prev) => prev.slice(0, -1));
      toast.error(error.message || 'Unable to generate response.');
    } finally {
      setAbortController(null);
      setIsSending(false);
    }
  };

  const cancelRequest = () => {
    if (abortController) {
      abortController.abort();
      toast('Request cancelled.');
      setAbortController(null);
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title={title}
        subtitle="Each prompt consumes workspace credits. Top up anytime via the AI Hub."
        actions={
          <div className="text-xs text-white/70">
            Balance: <span className="font-semibold text-white">{balance.toFixed(2)}</span> credits
          </div>
        }
      />

      <section className="mx-auto grid max-w-5xl gap-6">
        <motion.div
          layout
          className="flex max-h-[60vh] min-h-[320px] flex-col gap-3 overflow-y-auto rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.18)]"
        >
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className="flex flex-col">
              <ChatBubble role={message.role} content={message.content} />
              {message.role === 'assistant' && message.auditLogId && index !== 0 && (
                <AIResponseFeedback
                  responseId={message.auditLogId}
                  userId={user?.uid ?? 'guest'}
                  tenantId={activeTenantId ?? 'unknown'}
                />
              )}
            </div>
          ))}
        </motion.div>

        <form
          onSubmit={sendPrompt}
          className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_25px_rgba(99,102,241,0.12)]"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question or paste operational data…"
            rows={4}
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
            disabled={isSending}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white/50">
              Model: {model} • Minimum credit balance required per query: {MINIMUM_CREDITS_PER_REQUEST.toFixed(2)}
            </div>
            <div className="flex gap-2">
              {isSending && (
                <button
                  type="button"
                  onClick={cancelRequest}
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-white/30"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSending}
                className="rounded-full bg-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSending ? 'Thinking…' : 'Send prompt'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
};

AIChatPage.propTypes = {
  assistantKey: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  systemPrompt: PropTypes.string.isRequired,
  model: PropTypes.string,
};

AIChatPage.defaultProps = {
  model: 'gpt-4o-mini',
};

export default AIChatPage;
