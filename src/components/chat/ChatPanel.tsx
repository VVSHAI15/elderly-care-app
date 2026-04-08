"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, CheckCircle, XCircle, Sparkles, MessageSquare } from "lucide-react";

interface PendingAction {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  pendingAction?: PendingAction;
}

const QUICK_ACTIONS: Record<string, string[]> = {
  ADMIN: [
    "Who is free today?",
    "Show open shifts needing coverage",
    "What shifts are scheduled this week?",
    "List all caregivers",
    "Show pending care requests",
    "Who is available tomorrow 9am–5pm?",
  ],
  CAREGIVER: [
    "What are my upcoming shifts?",
    "What are today's tasks?",
    "Report a callout",
  ],
  FAMILY_MEMBER: [
    "How is my loved one doing?",
    "When is the next caregiver visit?",
    "Show current medications",
    "Request extra caregiver coverage",
    "Show my pending care requests",
  ],
  PATIENT: [
    "What are my tasks today?",
    "Show my upcoming visits",
    "What medications am I on?",
  ],
};

const GREETINGS: Record<string, string> = {
  ADMIN: "Hi! I'm Guardian AI. I can check caregiver availability, manage shifts, find coverage for open shifts, create patients or caregivers, and much more.\n\nTry asking \"who is free tomorrow at 9am\" or \"show me open shifts\".",
  CAREGIVER: "Hi! I can show your upcoming shifts, today's tasks, and help you report a callout if you can't make a shift. What do you need?",
  FAMILY_MEMBER: "Hi! I can give you real-time updates on your loved one's care, show upcoming caregiver visits, current medications, and help you request extra coverage. What would you like to know?",
  PATIENT: "Hi! I can help with questions about your care schedule, upcoming visits, and daily tasks. What would you like to know?",
};

export function ChatPanel({ role }: { role?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ messageIndex: number; action: PendingAction } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const greeting = GREETINGS[role ?? ""] ?? "Hi! I'm Guardian AI. How can I help you today?";
  const quickActions = QUICK_ACTIONS[role ?? ""] ?? [];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: greeting }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const txt = (text ?? input).trim();
    if (!txt || loading || pendingConfirm) return;

    const userMsg: Message = { role: "user", content: txt };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      let data: { reply?: string; pendingAction?: PendingAction } = {};
      try { data = await res.json(); } catch { /* ignore parse error */ }
      if (!data.reply) data.reply = "Sorry, I ran into an error. Please try again.";

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply ?? "Sorry, something went wrong.",
        pendingAction: data.pendingAction,
      };

      const withAssistant = [...next, assistantMsg];
      setMessages(withAssistant);

      if (data.pendingAction) {
        setPendingConfirm({ messageIndex: withAssistant.length - 1, action: data.pendingAction });
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pendingConfirm) return;
    const { action, messageIndex } = pendingConfirm;

    // Clear pendingAction from the message so the card disappears
    setMessages((prev) =>
      prev.map((m, i) => (i === messageIndex ? { ...m, pendingAction: undefined } : m))
    );
    setPendingConfirm(null);

    const confirmedNote: Message = { role: "user", content: "Yes, go ahead." };
    setMessages((prev) => [...prev, confirmedNote]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: "Yes, go ahead." }],
          confirmedAction: action,
        }),
      });
      let data: { reply?: string } = {};
      try { data = await res.json(); } catch { /* ignore parse error */ }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "Done." }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to complete the action. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (!pendingConfirm) return;
    const { messageIndex } = pendingConfirm;
    setMessages((prev) =>
      prev.map((m, i) => (i === messageIndex ? { ...m, pendingAction: undefined } : m))
    );
    setPendingConfirm(null);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "No problem, I cancelled that. Is there anything else I can help with?" },
    ]);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isBlocked = loading || !!pendingConfirm;

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[#d8e2f1] overflow-hidden shadow-[0_8px_24px_rgba(25,48,88,0.08)]" style={{ height: "calc(100vh - 280px)", minHeight: "520px" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#2f5f9f] to-[#4472b8] text-white flex-shrink-0">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Bot size={20} />
        </div>
        <div>
          <p className="font-bold text-base">Guardian AI</p>
          <p className="text-xs text-blue-100">Your care coordination assistant</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 px-3 py-1.5 rounded-full">
          <Sparkles size={11} />
          <span>GPT-4o</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[#f8fafd]">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 bg-[#2f5f9f] rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#2f5f9f] text-white rounded-tr-sm"
                    : "bg-white text-gray-800 border border-[#e2eaf4] rounded-tl-sm shadow-sm"
                }`}
              >
                {m.content}
              </div>
            </div>

            {/* Confirmation card */}
            {m.pendingAction && pendingConfirm?.messageIndex === i && (
              <div className="ml-10 mt-3 bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <MessageSquare size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 mb-1">Confirm this action</p>
                    <p className="text-sm text-amber-800">{m.pendingAction.summary}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2f5f9f] text-white text-sm font-semibold rounded-lg hover:bg-[#224978] transition-colors"
                  >
                    <CheckCircle size={14} />
                    Confirm
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 bg-[#2f5f9f] rounded-xl flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-[#e2eaf4] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-[#2f5f9f] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-[#2f5f9f] rounded-full animate-bounce" style={{ animationDelay: "160ms" }} />
                <span className="w-2 h-2 bg-[#2f5f9f] rounded-full animate-bounce" style={{ animationDelay: "320ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick action chips — only show at the start */}
      {messages.length <= 1 && quickActions.length > 0 && (
        <div className="px-5 py-3 border-t border-[#e8eef7] bg-white flex gap-2 flex-wrap flex-shrink-0">
          <span className="text-xs text-gray-400 font-medium self-center">Try asking:</span>
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => send(action)}
              className="text-xs px-3 py-1.5 bg-[#f0f5fd] text-[#2f5f9f] rounded-full border border-[#d8e2f1] hover:bg-[#dbe8f8] transition-colors font-medium"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-[#e8eef7] bg-white flex-shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={isBlocked && pendingConfirm ? "Please confirm or cancel the action above…" : "Ask anything about schedules, availability, tasks, medications…"}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2f5f9f] focus:border-transparent bg-gray-50 resize-none leading-relaxed"
          disabled={isBlocked}
          style={{ maxHeight: "96px" }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || isBlocked}
          className="w-10 h-10 rounded-xl bg-[#2f5f9f] text-white flex items-center justify-center hover:bg-[#224978] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
