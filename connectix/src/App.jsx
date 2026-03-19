import { useState, useEffect, useRef, useCallback } from "react";

// ── QR Code generator (pure JS, no lib needed) ──────────────────────────────
function generateQRDataURL(text) {
  // We'll use a public QR API
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}&bgcolor=EBF6FF&color=1A6FC4&margin=10`;
}

// ── Unique ID helper ─────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Avatar colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#1A6FC4","#0EA5E9","#38BDF8","#0284C7","#0369A1",
  "#06B6D4","#0891B2","#22D3EE","#7DD3FC","#BAE6FD",
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
}

// ── Shared in-memory "server" using BroadcastChannel ────────────────────────
const CHANNEL_NAME = "connectix_chat";

// ── Components ───────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }) {
  const bg = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: size * 0.36, fontWeight: 700,
      flexShrink: 0, boxShadow: `0 2px 8px ${bg}55`,
      border: "2px solid #fff",
    }}>
      {initials(name)}
    </div>
  );
}

function Bubble({ msg, isOwn }) {
  return (
    <div style={{
      display: "flex", flexDirection: isOwn ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 8, marginBottom: 14,
      animation: "bubbleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      {!isOwn && <Avatar name={msg.sender} size={32} />}
      <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
        {!isOwn && (
          <span style={{ fontSize: 11, color: "#64A8D8", fontWeight: 600, marginBottom: 3, paddingLeft: 4, fontFamily: "'DM Sans', sans-serif" }}>
            {msg.sender}
          </span>
        )}
        <div style={{
          padding: "10px 16px",
          borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isOwn
            ? "linear-gradient(135deg, #1A6FC4 0%, #0EA5E9 100%)"
            : "#fff",
          color: isOwn ? "#fff" : "#1e3a5f",
          fontSize: 14.5, lineHeight: 1.5,
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: isOwn
            ? "0 4px 16px rgba(14,165,233,0.35)"
            : "0 2px 12px rgba(26,111,196,0.1)",
          border: isOwn ? "none" : "1px solid #cfe8f7",
          wordBreak: "break-word",
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize: 10, color: "#94BBDA", marginTop: 4, paddingRight: 2, fontFamily: "'DM Sans', sans-serif" }}>
          {msg.time}
        </span>
      </div>
    </div>
  );
}

function SystemMsg({ text }) {
  return (
    <div style={{ textAlign: "center", margin: "8px 0", animation: "fadeIn 0.3s ease" }}>
      <span style={{
        display: "inline-block", padding: "4px 14px",
        background: "rgba(14,165,233,0.1)", borderRadius: 20,
        fontSize: 12, color: "#0EA5E9", fontFamily: "'DM Sans', sans-serif",
        border: "1px solid rgba(14,165,233,0.2)",
      }}>{text}</span>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function Connectix() {
  const [screen, setScreen] = useState("home"); // home | join | chat
  const [myName, setMyName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [typing, setTyping] = useState([]);

  const channelRef = useRef(null);
  const myIdRef = useRef(uid());
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // BroadcastChannel setup
  useEffect(() => {
    if (screen !== "chat") return;
    const bc = new BroadcastChannel(CHANNEL_NAME + "_" + sessionId);
    channelRef.current = bc;

    bc.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "MSG") {
        setMessages(prev => [...prev, payload]);
      } else if (type === "JOIN") {
        setMembers(prev => {
          if (prev.find(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        setMessages(prev => [...prev, { id: uid(), type: "system", text: `${payload.name} joined the session` }]);
      } else if (type === "LEAVE") {
        setMembers(prev => prev.filter(m => m.id !== payload.id));
        setMessages(prev => [...prev, { id: uid(), type: "system", text: `${payload.name} left the session` }]);
      } else if (type === "TYPING") {
        setTyping(prev => {
          if (payload.active) {
            return prev.includes(payload.name) ? prev : [...prev, payload.name];
          } else {
            return prev.filter(n => n !== payload.name);
          }
        });
      } else if (type === "PING") {
        // respond with own presence
        bc.postMessage({ type: "JOIN", payload: { id: myIdRef.current, name: myName } });
      }
    };

    // Announce join
    bc.postMessage({ type: "JOIN", payload: { id: myIdRef.current, name: myName } });
    bc.postMessage({ type: "PING", payload: {} }); // ask others to announce

    setMembers([{ id: myIdRef.current, name: myName }]);
    setMessages([{ id: uid(), type: "system", text: `Session started • Code: ${sessionId}` }]);

    return () => {
      bc.postMessage({ type: "LEAVE", payload: { id: myIdRef.current, name: myName } });
      bc.close();
    };
  }, [screen, sessionId, myName]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const msg = {
      id: uid(),
      type: "msg",
      sender: myName,
      senderId: myIdRef.current,
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, msg]);
    channelRef.current?.postMessage({ type: "MSG", payload: msg });
    setInput("");
    // stop typing
    channelRef.current?.postMessage({ type: "TYPING", payload: { name: myName, active: false } });
  }, [input, myName]);

  const handleTyping = (val) => {
    setInput(val);
    channelRef.current?.postMessage({ type: "TYPING", payload: { name: myName, active: true } });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      channelRef.current?.postMessage({ type: "TYPING", payload: { name: myName, active: false } });
    }, 1500);
  };

  const startSession = () => {
    if (!nameInput.trim()) return;
    const id = uid().toUpperCase();
    setMyName(nameInput.trim());
    setSessionId(id);
    setIsHost(true);
    setScreen("chat");
  };

  const joinSession = () => {
    if (!nameInput.trim() || !joinCode.trim()) return;
    setMyName(nameInput.trim());
    setSessionId(joinCode.trim().toUpperCase());
    setIsHost(false);
    setScreen("chat");
  };

  const qrValue = `connectix://join/${sessionId}?name=Guest`;

  // ── STYLES ─────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; }
    @keyframes bubbleIn {
      from { opacity: 0; transform: translateY(10px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%,100% { transform: scale(1); } 50% { transform: scale(1.08); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes dotBounce {
      0%,80%,100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: #BAE6FD; border-radius: 4px; }
    input:focus { outline: none; }
    button:hover { filter: brightness(1.05); }
    button:active { transform: scale(0.97); }
  `;

  // ── HOME SCREEN ────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight: "100vh", background: "linear-gradient(145deg, #EBF6FF 0%, #DBEAFE 40%, #F0F9FF 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        {[{top:-80,right:-60,size:300,op:0.12},{bottom:-100,left:-80,size:350,op:0.09},{top:"40%",left:-40,size:150,op:0.07}].map((c,i) => (
          <div key={i} style={{
            position:"absolute", top:c.top, bottom:c.bottom, left:c.left, right:c.right,
            width:c.size, height:c.size, borderRadius:"50%",
            background:"linear-gradient(135deg,#1A6FC4,#0EA5E9)",
            opacity:c.op, pointerEvents:"none",
          }}/>
        ))}

        <div style={{
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
          borderRadius: 28, padding: "48px 44px", width: "100%", maxWidth: 420,
          boxShadow: "0 20px 60px rgba(14,165,233,0.18), 0 4px 20px rgba(26,111,196,0.08)",
          border: "1px solid rgba(186,230,253,0.6)",
          animation: "slideUp 0.5s cubic-bezier(0.34,1.2,0.64,1)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: "linear-gradient(135deg, #1A6FC4, #0EA5E9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(14,165,233,0.4)",
              animation: "pulse 3s ease infinite",
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: "#1A6FC4", letterSpacing: -1 }}>
              Connectix
            </h1>
            <p style={{ color: "#64A8D8", fontSize: 14, marginTop: 6, fontWeight: 500 }}>
              Instant live chat sessions for everyone
            </p>
          </div>

          {/* Name input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#1A6FC4", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
              Your Display Name
            </label>
            <input
              value={nameInput} onChange={e => setNameInput(e.target.value)}
              placeholder="e.g. Alex Johnson"
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 14,
                border: "2px solid #cfe8f7", fontSize: 15, color: "#1e3a5f",
                background: "#F7FBFF", transition: "border 0.2s",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onFocus={e => e.target.style.border = "2px solid #0EA5E9"}
              onBlur={e => e.target.style.border = "2px solid #cfe8f7"}
              onKeyDown={e => e.key === "Enter" && startSession()}
            />
          </div>

          {/* Buttons */}
          <button onClick={startSession} style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #1A6FC4 0%, #0EA5E9 100%)",
            color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 6px 20px rgba(14,165,233,0.4)", marginBottom: 12, transition: "all 0.2s",
          }}>
            ✦ Create New Session
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex:1, height:1, background:"#cfe8f7" }}/>
            <span style={{ fontSize: 12, color: "#94BBDA", fontWeight: 600 }}>OR JOIN EXISTING</span>
            <div style={{ flex:1, height:1, background:"#cfe8f7" }}/>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Session Code"
              maxLength={7}
              style={{
                flex:1, padding: "13px 16px", borderRadius: 14,
                border: "2px solid #cfe8f7", fontSize: 15, color: "#1e3a5f",
                background: "#F7FBFF", fontFamily: "'DM Sans', sans-serif",
                letterSpacing: 2, fontWeight: 700,
              }}
              onFocus={e => e.target.style.border = "2px solid #0EA5E9"}
              onBlur={e => e.target.style.border = "2px solid #cfe8f7"}
              onKeyDown={e => e.key === "Enter" && joinSession()}
            />
            <button onClick={joinSession} style={{
              padding: "13px 20px", borderRadius: 14, border: "2px solid #0EA5E9",
              background: "transparent", color: "#0EA5E9", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}>
              Join →
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── CHAT SCREEN ────────────────────────────────────────────────────────────
  const otherTyping = typing.filter(n => n !== myName);

  return (
    <>
      <style>{css}</style>
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        background: "#F0F9FF", fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1A6FC4 0%, #0EA5E9 100%)",
          padding: "0 20px", height: 64, display: "flex", alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 20px rgba(14,165,233,0.35)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: "rgba(255,255,255,0.2)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "#fff", fontSize: 18, letterSpacing: -0.5 }}>
                Connectix
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                {members.length} member{members.length !== 1 ? "s" : ""} online
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Session code badge */}
            <div style={{
              background: "rgba(255,255,255,0.18)", borderRadius: 10, padding: "5px 12px",
              border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer",
            }} onClick={() => setShowMembers(!showMembers)}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: 1 }}>
                CODE:
              </span>
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 800, marginLeft: 6, letterSpacing: 2 }}>
                {sessionId}
              </span>
            </div>
            {/* Members toggle */}
            <button onClick={() => setShowMembers(!showMembers)} style={{
              width: 38, height: 38, borderRadius: 12, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.18)", color: "#fff", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Messages */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{
              flex: 1, overflowY: "auto", padding: "20px 16px 8px",
              background: "linear-gradient(180deg, #EBF6FF 0%, #F0F9FF 100%)",
            }}>
              {messages.map(msg =>
                msg.type === "system"
                  ? <SystemMsg key={msg.id} text={msg.text} />
                  : <Bubble key={msg.id} msg={msg} isOwn={msg.senderId === myIdRef.current} />
              )}
              {otherTyping.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, animation: "fadeIn 0.3s ease" }}>
                  <Avatar name={otherTyping[0]} size={28} />
                  <div style={{
                    background: "#fff", borderRadius: "18px 18px 18px 4px",
                    padding: "10px 16px", border: "1px solid #cfe8f7",
                    boxShadow: "0 2px 8px rgba(26,111,196,0.08)",
                    display: "flex", gap: 4, alignItems: "center",
                  }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#0EA5E9",
                        animation: `dotBounce 1.2s ease infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}/>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div style={{
              padding: "12px 16px",
              background: "#fff",
              borderTop: "1px solid #cfe8f7",
              display: "flex", gap: 10, alignItems: "center",
            }}>
              <Avatar name={myName} size={36} />
              <input
                value={input}
                onChange={e => handleTyping(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                style={{
                  flex: 1, padding: "12px 18px", borderRadius: 24,
                  border: "2px solid #cfe8f7", fontSize: 15, color: "#1e3a5f",
                  background: "#F7FBFF", fontFamily: "'DM Sans', sans-serif",
                  transition: "border 0.2s",
                }}
                onFocus={e => e.target.style.border = "2px solid #0EA5E9"}
                onBlur={e => e.target.style.border = "2px solid #cfe8f7"}
              />
              <button onClick={sendMessage} style={{
                width: 44, height: 44, borderRadius: "50%", border: "none",
                cursor: "pointer",
                background: input.trim()
                  ? "linear-gradient(135deg, #1A6FC4, #0EA5E9)"
                  : "#cfe8f7",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: input.trim() ? "0 4px 14px rgba(14,165,233,0.4)" : "none",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={input.trim() ? "#fff" : "#94BBDA"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Members panel */}
          {showMembers && (
            <div style={{
              width: 260, background: "#fff", borderLeft: "1px solid #cfe8f7",
              display: "flex", flexDirection: "column",
              animation: "slideUp 0.25s ease",
            }}>
              {/* QR Code */}
              <div style={{
                padding: 20, background: "linear-gradient(135deg, #EBF6FF, #DBEAFE)",
                borderBottom: "1px solid #cfe8f7",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1A6FC4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  📱 Invite via QR
                </div>
                <div style={{
                  background: "#fff", borderRadius: 16, padding: 10,
                  boxShadow: "0 4px 16px rgba(26,111,196,0.12)",
                  border: "2px solid #cfe8f7", textAlign: "center",
                }}>
                  <img
                    src={generateQRDataURL(`Join Connectix session: ${sessionId}`)}
                    alt="QR Code"
                    style={{ width: 140, height: 140, borderRadius: 8 }}
                  />
                  <div style={{ fontSize: 11, color: "#64A8D8", marginTop: 8, fontWeight: 600, letterSpacing: 2 }}>
                    {sessionId}
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "#94BBDA", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
                  Scan to join or share the code above
                </p>
              </div>

              {/* Members list */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1A6FC4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  Members ({members.length})
                </div>
                {members.map(m => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 12,
                    background: m.id === myIdRef.current ? "rgba(14,165,233,0.07)" : "transparent",
                    marginBottom: 6,
                  }}>
                    <div style={{ position: "relative" }}>
                      <Avatar name={m.name} size={34} />
                      <div style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 10, height: 10, borderRadius: "50%",
                        background: "#22C55E", border: "2px solid #fff",
                      }}/>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1e3a5f" }}>{m.name}</div>
                      {m.id === myIdRef.current && (
                        <div style={{ fontSize: 11, color: "#0EA5E9", fontWeight: 600 }}>
                          {isHost ? "Host · You" : "You"}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Leave button */}
              <div style={{ padding: 16, borderTop: "1px solid #cfe8f7" }}>
                <button onClick={() => setScreen("home")} style={{
                  width: "100%", padding: "11px", borderRadius: 12,
                  border: "2px solid #fca5a5", background: "transparent",
                  color: "#ef4444", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                }}>
                  Leave Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}