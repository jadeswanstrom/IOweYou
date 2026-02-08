import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import "./Register.css";
import eyeOpen from "../assets/eye.png";
import eyeClosed from "../assets/eye-off.png";

export default function Register() {
  const nav = useNavigate();
  const { register } = useContext(AuthContext);


  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      // Backend expects { name, email, password }
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();

      await register(firstName, lastName, email, password);
      nav("/dashboard");


      // After successful signup, send users to login
      nav("/login");
    } catch (e) {
  console.log("REGISTER ERROR:", e, e?.response?.data);
  setErr(e?.response?.data?.error || e?.message || "Sign up failed");
} finally {

      setLoading(false);
    }
  }

  return (
    <div className="registerScreen">
      <div className="registerCard">
        <h1 className="registerTitle">
          Welcome to - I Owe You! <br />
          <span>Create your account</span>
        </h1>

        <form className="registerForm" onSubmit={onSubmit}>
          <div className="twoCol">
            <label className="field">
              <input
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                autoComplete="given-name"
                required
              />
            </label>

            <label className="field">
              <input
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                autoComplete="family-name"
                required
              />
            </label>
          </div>

          <label className="field">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <div className="passwordWrap">
              <input
                className="input passwordInput"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="new-password"
                required
              />
              <button
              type="button"
              className="eyeBtn"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              >
              <img
              src={showPw ? eyeClosed : eyeOpen}
              alt={showPw ? "Hide password" : "Show password"}
              />

              </button>

            </div>
          </label>

          <label className="field">
            <div className="passwordWrap">
              <input
                className="input passwordInput"
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                autoComplete="new-password"
                required
              />
              <button
              type="button"
              className="eyeBtn"
              onClick={() => setShowConfirmPw((v) => !v)}
              aria-label={showConfirmPw ? "Hide password" : "Show password"}
              >
              <img
              src={showConfirmPw ? eyeClosed : eyeOpen}
              alt={showConfirmPw ? "Hide password" : "Show password"}
              />

              </button>

            </div>
          </label>

          {err && <div className="errorBox">{err}</div>}

          <button className="primaryBtn" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Sign up"}
          </button>

          <Link to="/login" className="secondaryBtn">
            Back to login
          </Link>
        </form>
      </div>
    </div>
  );
}
