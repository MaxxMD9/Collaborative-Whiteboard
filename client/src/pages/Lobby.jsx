import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Lobby() {
  const { user, token, logout } = useAuth();
  const navigate                = useNavigate();

  const [roomName, setRoomName]   = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res  = await fetch("http://localhost:3001/api/boards", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`
        },
        body: JSON.stringify({ roomName })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create room");
        return;
      }

      navigate("/whiteboard", { state: { roomName: data.board.roomName } });
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res  = await fetch("http://localhost:3001/api/invites/join", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`
        },
        body: JSON.stringify({ code: inviteCode })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid invite code");
        return;
      }

      navigate("/whiteboard", { state: { roomName: data.roomName } });
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Whiteboard</h1>
        <div style={styles.headerRight}>
          <span style={styles.username}>Hi, {user?.username}</span>
          <button style={styles.signOutButton} onClick={() => { logout(); navigate("/"); }}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.cards}>
          {/* Create a Room */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Create a Room</h2>
            <p style={styles.cardDescription}>
              Start a new whiteboard and invite others to join.
            </p>
            <form onSubmit={handleCreateRoom} style={styles.form}>
              <input
                type="text"
                placeholder="Room name"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                style={styles.input}
                required
              />
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={loading}>
                {loading ? "Creating..." : "Create Room"}
              </button>
            </form>
          </div>

          {/* Join a Room */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Join a Room</h2>
            <p style={styles.cardDescription}>
              Enter an invite code shared by a room owner.
            </p>
            <form onSubmit={handleJoinRoom} style={styles.form}>
              <input
                type="text"
                placeholder="Invite code (e.g. a3f9bc)"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                style={styles.input}
                required
              />
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={loading}>
                {loading ? "Joining..." : "Join Room"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight:       "100vh",
    backgroundColor: "#f8fafc",
    fontFamily:      "Arial, sans-serif"
  },
  header: {
    height:          "56px",
    backgroundColor: "#050505",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    padding:         "0 24px"
  },
  logo: {
    color:     "#ffffff",
    fontSize:  "18px",
    fontWeight: "800",
    margin:    0
  },
  headerRight: {
    display:    "flex",
    alignItems: "center",
    gap:        "16px"
  },
  username: {
    color:    "#9ca3af",
    fontSize: "14px"
  },
  signOutButton: {
    padding:      "6px 14px",
    border:       "1px solid #374151",
    borderRadius: "8px",
    background:   "transparent",
    color:        "#ffffff",
    cursor:       "pointer",
    fontSize:     "13px"
  },
  main: {
    maxWidth: "800px",
    margin:   "60px auto",
    padding:  "0 24px"
  },
  error: {
    color:        "#dc2626",
    background:   "#fee2e2",
    padding:      "10px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize:     "14px"
  },
  cards: {
    display:             "grid",
    gridTemplateColumns: "1fr 1fr",
    gap:                 "24px"
  },
  card: {
    background:   "#ffffff",
    borderRadius: "12px",
    padding:      "28px",
    boxShadow:    "0 2px 12px rgba(0,0,0,0.06)"
  },
  cardTitle: {
    fontSize:   "18px",
    fontWeight: "700",
    color:      "#111827",
    margin:     "0 0 8px"
  },
  cardDescription: {
    fontSize: "14px",
    color:    "#6b7280",
    margin:   "0 0 20px"
  },
  form: {
    display:       "flex",
    flexDirection: "column",
    gap:           "12px"
  },
  input: {
    padding:      "10px 14px",
    border:       "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize:     "14px",
    outline:      "none"
  },
  primaryButton: {
    padding:      "10px",
    border:       "none",
    borderRadius: "8px",
    background:   "#1a73e8",
    color:        "#ffffff",
    fontWeight:   "700",
    cursor:       "pointer",
    fontSize:     "14px"
  }
};