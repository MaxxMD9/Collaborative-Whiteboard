import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function InviteModal({ roomName, onClose }) {
  const { token }           = useAuth();
  const [code, setCode]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [copied, setCopied] = useState(false);

  async function generateInvite() {
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch("http://localhost:3001/api/invites/create", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`
        },
        body: JSON.stringify({ roomName })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not generate invite");
        return;
      }

      setCode(data.invite.code);
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.title}>Invite to {roomName}</h2>

        {!code ? (
          <>
            <p style={styles.description}>
              Generate a 6-character invite code to share with others.
              The code expires in 7 days.
            </p>
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={styles.generateButton}
              onClick={generateInvite}
              disabled={loading}>
              {loading ? "Generating..." : "Generate Invite Code"}
            </button>
          </>
        ) : (
          <>
            <p style={styles.description}>Share this code with others to invite them:</p>
            <div style={styles.codeBox}>
              <span style={styles.code}>{code}</span>
              <button style={styles.copyButton} onClick={copyCode}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button style={styles.generateButton} onClick={generateInvite}>
              Generate New Code
            </button>
          </>
        )}

        <button style={styles.closeButton} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position:        "fixed",
    inset:           0,
    background:      "rgba(0,0,0,0.4)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          100
  },
  modal: {
    background:    "#ffffff",
    borderRadius:  "12px",
    padding:       "2rem",
    width:         "360px",
    boxShadow:     "0 20px 60px rgba(0,0,0,0.2)",
    display:       "flex",
    flexDirection: "column",
    gap:           "1rem"
  },
  title: {
    margin:   0,
    fontSize: "18px",
    color:    "#111827"
  },
  description: {
    margin:   0,
    fontSize: "14px",
    color:    "#6b7280"
  },
  error: {
    margin:   0,
    fontSize: "14px",
    color:    "#dc2626"
  },
  codeBox: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.75rem",
    background:     "#f3f4f6",
    borderRadius:   "8px",
    padding:        "0.75rem 1rem"
  },
  code: {
    flex:       1,
    fontSize:   "24px",
    fontWeight: "700",
    letterSpacing: "0.15em",
    color:      "#111827",
    fontFamily: "monospace"
  },
  copyButton: {
    padding:      "6px 14px",
    border:       "1px solid #d1d5db",
    borderRadius: "6px",
    background:   "#ffffff",
    cursor:       "pointer",
    fontSize:     "13px",
    fontWeight:   "600"
  },
  generateButton: {
    padding:      "10px",
    border:       "none",
    borderRadius: "8px",
    background:   "#1a73e8",
    color:        "#ffffff",
    fontWeight:   "700",
    cursor:       "pointer",
    fontSize:     "14px"
  },
  closeButton: {
    padding:      "8px",
    border:       "1px solid #d1d5db",
    borderRadius: "8px",
    background:   "#ffffff",
    cursor:       "pointer",
    fontSize:     "14px"
  }
};

export default InviteModal;