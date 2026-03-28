import React, { useState, useRef, useEffect } from 'react';
import { C, agentLogs } from '../lib/constants';
import { Badge } from './ui/Badge';
import { GoogleGenAI } from '@google/genai';
import { X } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "dummy" });

export const AgentPanel = ({ onClose }: { onClose?: () => void }) => {
  const [viewMode, setViewMode] = useState<"actions" | "chat">("actions");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{role: string, text: string}[]>([
    { role: "agent", text: "Hi there! I'm continuously monitoring your campaigns. Ask me anything about your data." }
  ]);
  const [logs, setLogs] = useState(agentLogs);
  const [actions, setActions] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (viewMode === "chat") {
      scrollToBottom();
    }
  }, [messages, viewMode]);

  const handleAction = (id: string, msg: string) => {
    setActions(p => ({ ...p, [id]: "loading" }));
    setTimeout(() => {
      setActions(p => ({ ...p, [id]: "done" }));
      const now = new Date();
      const t = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
      setLogs(prev => [{ time: t, type: "AGENT", color: C.blue, msg }, ...prev]);
    }, 1200);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setViewMode("chat");
    setIsTyping(true);

    try {
      // Use the Gemini API if the key is available
      if (import.meta.env.VITE_GEMINI_API_KEY) {
        const chat = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: "You are an AI marketing assistant monitoring campaign data. Keep your answers concise, professional, and data-driven.",
          }
        });
        
        // Replay history (excluding the initial greeting for simplicity, or map them)
        for (const msg of messages.slice(1)) {
          await chat.sendMessage({ message: msg.text });
        }
        
        const response = await chat.sendMessage({ message: userMsg.text });
        setMessages(prev => [...prev, { role: "agent", text: response.text || "I couldn't process that." }]);
      } else {
        // Fallback dummy responses
        setTimeout(() => {
          const q = userMsg.text.toLowerCase();
          let ans = "Analyzing your query across connected data sources...";
          if (q.includes("cac")) ans = "CAC spiked 8.1% MoM driven by Meta CPMs rising +22% due to iOS 17 tracking restrictions. Recommend shifting 8% budget to Email/CRM where efficiency is strongest.";
          else if (q.includes("roas")) ans = "Blended ROAS is 3.8×. Email/CRM leads at 8.1×, Paid Search at 6.2×. Meta Social at 2.8× is underperforming — MMM model recommends reducing allocation by 8%.";
          else if (q.includes("churn")) ans = "312 accounts are in critical churn zone (>80% propensity). Top predictors: days since last login and support ticket volume. Launching save playbook could recover ~$340K ARR.";
          else if (q.includes("forecast") || q.includes("q3") || q.includes("pipeline")) ans = "Q3 pipeline forecast is $6.8M (base case), range $5.9M–$7.6M at 84% confidence. Base case assumes 18% email budget increase is applied.";
          else ans = "I've analyzed the data and couldn't find a specific anomaly for that. However, overall marketing ROI is strong at 3.8×.";
          
          setMessages(prev => [...prev, { role: "agent", text: ans }]);
          setIsTyping(false);
        }, 600);
        return;
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "agent", text: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const BtnAction = ({ id, label, msg, variant = "primary" }: any) => {
    const state = actions[id];
    const styles: Record<string, any> = {
      primary: { bg: C.black, color: "#fff", border: C.black },
      warn: { bg: C.amberLight, color: C.amber, border: "#fde68a" },
      danger: { bg: C.redLight, color: C.red, border: "#fecaca" },
      done: { bg: C.greenLight, color: C.green, border: "#bbf7d0" },
    };
    const s = state === "done" ? styles.done : styles[variant];
    return (
      <button onClick={() => state !== "done" && handleAction(id, msg)}
        style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${s.border}`, background: s.bg, color: s.color, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.04em", transition: "all 0.15s" }}>
        {state === "loading" ? "⟳ Applying..." : state === "done" ? "✓ Done" : label}
      </button>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: "flex", flexDirection: "column", background: C.surface, flexShrink: 0 }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>AI Agent</span>
          <Badge label="ACTIVE" variant="live" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: C.textMuted }}>24/7 Monitoring</span>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", background: C.surfaceAlt, padding: 4, borderRadius: 8, margin: "12px 12px 0" }}>
        <button onClick={() => setViewMode("actions")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, background: viewMode === "actions" ? C.surface : "transparent", boxShadow: viewMode === "actions" ? "0 2px 8px rgba(0,0,0,0.05)" : "none", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", color: viewMode === "actions" ? C.textPrimary : C.textSecondary, fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}>Insights & Actions</button>
        <button onClick={() => setViewMode("chat")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, background: viewMode === "chat" ? C.surface : "transparent", boxShadow: viewMode === "chat" ? "0 2px 8px rgba(0,0,0,0.05)" : "none", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", color: viewMode === "chat" ? C.textPrimary : C.textSecondary, fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}>Chat</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {viewMode === "actions" ? (
          <>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase" }}>⚠ Anomalies</div>

            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px" }}>
              <Badge label="ANOMALY" variant="error" />
              <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5, margin: "8px 0" }}>
                <strong style={{ color: C.textPrimary }}>CAC up 8.1% MoM</strong> — Meta CPMs +22%. Efficiency threshold breached.
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <BtnAction id="a1" label="Reallocate Budget" msg="Reallocating budget away from Meta Paid Social..." variant="danger" />
                <button style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textSecondary, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>Investigate</button>
              </div>
            </div>

            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px" }}>
              <Badge label="WARNING" variant="warning" />
              <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5, margin: "8px 0" }}>
                <strong style={{ color: C.textPrimary }}>MQL→SQL dropped to 15.6%</strong> (from 22% last quarter). Social lead quality declining.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <BtnAction id="a2" label="Tighten MQL Score" msg="Adjusting MQL scoring threshold for Social channel..." variant="warn" />
                <button style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textSecondary, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>View Cohort</button>
              </div>
            </div>

            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase", marginTop: 4 }}>💡 Opportunities</div>

            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px" }}>
              <Badge label="INSIGHT" variant="info" />
              <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5, margin: "8px 0" }}>
                <strong style={{ color: C.textPrimary }}>Email/CRM at 8.1× ROAS</strong> — under-budgeted. MMM recommends +18% allocation → +$280K revenue.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <BtnAction id="a3" label="Apply Recommendation" msg="Proposing +18% budget shift to Email/CRM channel..." />
                <button style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textSecondary, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>Simulate</button>
              </div>
            </div>

            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px" }}>
              <Badge label="OPPORTUNITY" variant="success" />
              <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5, margin: "8px 0" }}>
                <strong style={{ color: C.textPrimary }}>1,240 high-churn accounts</strong> — 312 critical. Save playbook could recover ~$340K ARR.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <BtnAction id="a4" label="Launch Save Playbook" msg="Launching retention save playbook for 312 critical accounts..." />
              </div>
            </div>

            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px" }}>
              <Badge label="OPPORTUNITY" variant="success" />
              <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5, margin: "8px 0" }}>
                <strong style={{ color: C.textPrimary }}>Google Brand at 6.2× ROAS</strong> with budget headroom. Increasing daily by $8K could unlock ~$49K revenue.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <BtnAction id="a5" label="Boost Campaign" msg="Increasing Google Brand PMax daily budget by $8K..." />
              </div>
            </div>

            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase", marginTop: 4 }}>🤖 Action Log</div>
            {logs.map((l, i) => (
              <div key={i} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: l.color || C.textMuted, marginBottom: 3, fontWeight: 700 }}>{l.time} · {l.type}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.4 }}>{l.msg}</div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? C.black : C.surfaceAlt, color: m.role === "user" ? "#fff" : C.textSecondary, padding: "10px 14px", borderRadius: 12, border: m.role === "user" ? "none" : `1px solid ${C.border}`, maxWidth: "90%", fontSize: 12, lineHeight: 1.5 }}>
                {m.role === "agent" && <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: C.purple, marginBottom: 4, fontWeight: 700 }}>AGENT</div>}
                {m.text}
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: "flex-start", background: C.surfaceAlt, color: C.textSecondary, padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.border}`, maxWidth: "90%", fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: C.purple, marginBottom: 4, fontWeight: 700 }}>AGENT</div>
                <div style={{ display: "flex", gap: 4, alignItems: "center", height: 18 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.textMuted, animation: "pulse 1s infinite" }} />
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.textMuted, animation: "pulse 1s infinite 0.2s" }} />
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.textMuted, animation: "pulse 1s infinite 0.4s" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: 12 }}>
        <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Ask Your Data</div>
        <div style={{ display: "flex", gap: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px" }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChat()}
            placeholder="Why did CAC spike in May?" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 12, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }} />
          <button onClick={handleChat} style={{ width: 26, height: 26, background: C.black, borderRadius: 6, border: "none", cursor: "pointer", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );
};
