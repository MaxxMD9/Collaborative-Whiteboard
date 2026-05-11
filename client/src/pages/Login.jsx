import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    const res = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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

        <form className="login-form-panel" onSubmit={handleLogin}>
          <div className="login-form-content">
            <Link to="/" className="back-home-link">
              ← Back to Home
            </Link>
            <h1>
              Welcome to <br />
              <span className="brand-emphasis">Interboard</span>
            </h1>
            <p className="login-subtitle">Sign in your account</p>

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

            <div className="login-options-row">
              <label className="remember-row">
                <input type="checkbox" />
                Remember me
              </label>

              <button className="link-button" type="button">
                Forgot Password?
              </button>
            </div>

            <button className="login-submit-button" type="submit">
              Sign In
            </button>

            <p className="register-text">
              Don&apos;t have an account? <Link to="/register">Sign Up</Link>
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}