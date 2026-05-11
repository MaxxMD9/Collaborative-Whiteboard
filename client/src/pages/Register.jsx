import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();

    const res = await fetch("http://localhost:3001/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    const data = await res.json();

    if (res.ok) {
      login(data.user, data.token);
      navigate("/lobby");
    } else {
      alert(data.error);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">

        <div className="login-visual-panel">
          <img
            className="full-panel-image"
            src="/assets/login_adjacent_image.png"
            alt="Register illustration"
          />
        </div>

        <form className="login-form-panel" onSubmit={handleRegister}>
          <div className="login-form-content">

            <Link to="/" className="back-home-link">
              ← Back to Home
            </Link>

            <h1>Create Account</h1>

            <p className="login-subtitle">
              Register your Interboard account
            </p>

            <label>Username</label>
            <input
              className="line-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />

            <label>Email</label>
            <input
              className="line-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <label>Password</label>
            <input
              className="line-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button
              className="login-submit-button"
              type="submit"
            >
              Create Account
            </button>

            <p className="register-text">
              Already have an account?{" "}
              <Link to="/login">Sign In</Link>
            </p>

          </div>
        </form>

      </section>
    </main>
  );
}