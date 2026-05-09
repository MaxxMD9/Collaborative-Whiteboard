import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any route that requires login with this component.
// If the user isn't logged in, they'll get redirected to /login.
//
// Usage in main.jsx:
//   <Route path="/whiteboard" element={<ProtectedRoute><WhiteboardPage /></ProtectedRoute>} />

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Still checking if the token is valid - don't redirect yet
  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;