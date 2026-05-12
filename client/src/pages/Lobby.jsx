import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Lobby.css";

export default function Lobby() {
  const { user, token, logout } = useAuth();
  const navigate                = useNavigate();

  const [roomName, setRoomName]     = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const [boards, setBoards]         = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Load existing boards on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/boards`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setBoards(data.boards || []))
      .catch(() => setError("Could not load boards"));
  }, [token]);

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/boards`, {
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

  async function handleDeleteBoard(roomName, boardId) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/boards/${encodeURIComponent(roomName)}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBoards(previous => previous.filter(b => b._id !== boardId));
        setConfirmDeleteId(null);
      } else {
        const data = await res.json();
        setError(data.error || "Could not delete board");
      }
    } catch {
      setError("Could not connect to server");
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/invites/join`, {
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
    <div className="lobby-page">
  <header className="lobby-header">
    <img src="/assets/logo_image.png" alt="Interboard logo" className="lobby-logo" />

    <div className="lobby-header-right">
      <span className="lobby-username">Hi, {user?.username}</span>
      <button className="lobby-signout-button" onClick={() => { logout(); navigate("/"); }}>
        Sign Out
      </button>
    </div>
  </header>

  <main className="lobby-main">
    <h1 className="lobby-title">Choose your board</h1>
    <p className="lobby-subtitle">Create a new room or join an existing one to start collaborating.</p>

    {error && <p className="lobby-error">{error}</p>}

    <div className="lobby-cards">
      <div className="lobby-card">
        <h2 className="lobby-card-title">Create a Room</h2>
        <p className="lobby-card-description">
          Start a new whiteboard and invite others to join.
        </p>

        <form onSubmit={handleCreateRoom} className="lobby-form">
          <input
            type="text"
            placeholder="Room name"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            className="lobby-input"
            required
          />
          <button type="submit" className="lobby-primary-button" disabled={loading}>
            {loading ? "Creating..." : "Create Room"}
          </button>
        </form>
      </div>

      <div className="lobby-card-reverse">
        <h2 className="lobby-card-title">Join a Room</h2>
        <p className="lobby-card-description">
          Enter an invite code shared by a room owner.
        </p>

        <form onSubmit={handleJoinRoom} className="lobby-form">
          <input
            type="text"
            placeholder="Invite code (e.g. a3f9bc)"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            className="lobby-input"
            required
          />
          <button type="submit" className="lobby-primary-button" disabled={loading}>
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>

    {boards.length > 0 && (
      <div className="lobby-boards-section">
        <h2 className="lobby-boards-title">Your Rooms</h2>

        <div className="lobby-boards-grid">
          {boards.map(board => (
            <div
              key={board._id}
              className="lobby-board-card"
              onClick={() => navigate("/whiteboard", { state: { roomName: board.roomName } })}
            >
              <div className="lobby-board-icon">📋</div>
              <div className="lobby-board-name">{board.roomName}</div>
              <div className="lobby-board-meta">
                Created by {board.createdBy?.username || "unknown"}
              </div>
              {confirmDeleteId === board._id ? (
                <div className="lobby-delete-confirm" onClick={e => e.stopPropagation()}>
                  <span>Delete?</span>
                  <button className="lobby-delete-yes" onClick={() => handleDeleteBoard(board.roomName, board._id)}>Yes</button>
                  <button className="lobby-delete-no" onClick={() => setConfirmDeleteId(null)}>No</button>
                </div>
              ) : (
                <button
                  className="lobby-trash-button"
                  onClick={e => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      handleDeleteBoard(board.roomName, board._id);
                    } else {
                      setConfirmDeleteId(board._id);
                    }
                  }}
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </main>
</div>
  );
}