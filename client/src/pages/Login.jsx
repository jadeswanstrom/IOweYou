import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Login.css";
import eyeOpen from "../assets/eye.png";
import eyeClosed from "../assets/eye-off.png";


export default function Login() {
  const { login } = useContext(AuthContext);
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginScreen">
      <div className="loginCard">
        <h1 className="loginTitle">
          Welcome to - I Owe You! <br />
          <span>Log in</span>
        </h1>

        <form className="loginForm" onSubmit={onSubmit}>
          {/* Email */}
          <label className="field">
            <span className="fieldLabel">Email Address</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              required
            />
          </label>

          {/* Password */}
          <label className="field">
            <span className="fieldLabel">Password</span>
            <div className="passwordWrap">
              <input
                className="input passwordInput"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <button
              type="button"
              className="eyeBtn"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              >
              <img
              src={showPw ? eyeOpen : eyeClosed}
              alt=""
              className="eyeIcon"
              draggable="false"
              />
              </button>

            </div>
          </label>

          <div className="forgotRow">
            <button
              type="button"
              className="forgotBtn"
              onClick={() => alert("Forgot password can be added next.")}
            >
              Forgot Password?
            </button>
          </div>

          {err && <div className="errorBox">{err}</div>}

          {/* Login button */}
          <button className="loginBtn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          {/* Signup button (under login) */}
          <Link to="/register" className="signupBtn">
            Sign up
          </Link>
        </form>
      </div>
    </div>
  );
}
