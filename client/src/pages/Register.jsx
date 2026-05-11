import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const { login }               = useAuth();
  const navigate                = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    const res  = await fetch("http://localhost:3001/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, email, password }),
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
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleRegister}>
        <h1>Register</h1>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Register</button>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" },
  form: { display: "flex", flexDirection: "column", gap: "10px", width: "300px" },
};