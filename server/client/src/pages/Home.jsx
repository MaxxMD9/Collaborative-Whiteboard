import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>InterBoard</h1>

        <p style={styles.subtitle}>
          Collaborate, draw, and create in real-time.
        </p>

        <button
          style={styles.button}
          onClick={() => navigate("/login")}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    animation: "fadeIn 0.8s ease-in",
  },

  card: {
    textAlign: "center",
    padding: "50px",
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    width: "320px",
  },

  logo: {
    fontSize: "42px",
    marginBottom: "10px",
    color: "#1e293b",
    letterSpacing: "1px",
  },

  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "25px",
  },

  button: {
    padding: "12px 20px",
    fontSize: "15px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    backgroundColor: "#4f46e5",
    color: "white",
    transition: "0.2s",
  },
};