import React, { useContext, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../pages/Dashboard.css"; // reuse the Dashboard layout styling

function initialsFromUser(user) {
  const first = user?.firstName?.[0] || user?.name?.[0] || "U";
  const last = user?.lastName?.[0] || user?.name?.split(" ")?.[1]?.[0] || "";
  return (first + last).toUpperCase();
}

export default function AppLayout() {
  const { user, logout } = useContext(AuthContext);
  const nav = useNavigate();
  const loc = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const displayName =
    user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";

  const path = loc.pathname;

  // Sidebar active state based on route
  const active =
    path.startsWith("/settings") ? "Settings" :
    path.startsWith("/invoices") ? "Invoices" :
    "Home";

  const pageTitle =
    active === "Settings" ? "Settings" :
    "Invoices";

  function onLogout() {
    logout();
    nav("/login");
  }

  function onNewInvoice() {
    // Always open the invoice modal inside the invoices page
    nav("/invoices", { state: { openNew: true } });
  }

  return (
    <div className="dash">
      {/* Sidebar */}
      <aside className="sidebar">
        <button className="newInvoiceBtn" onClick={onNewInvoice}>
          <span className="plus">+</span> New Invoice
        </button>

        <nav className="nav">
          <button
            className={`navItem ${active === "Home" ? "active" : ""}`}
            onClick={() => nav("/invoices")}
          >
            <span className="navIcon">🏠</span> Home
          </button>

          <button
            className={`navItem ${active === "Invoices" ? "active" : ""}`}
            onClick={() => nav("/invoices")}
          >
            <span className="navIcon">🧾</span> Invoices
          </button>

          <button
            className={`navItem ${active === "Settings" ? "active" : ""}`}
            onClick={() => nav("/settings")}
          >
            <span className="navIcon">⚙️</span> Settings
          </button>
        </nav>
      </aside>

      {/* Right side */}
      <main className="main">
        <header className="topbar">
          <h1 className="pageTitle">{pageTitle}</h1>

          <div className="profile" ref={profileRef}>
            <button className="profileBtn" onClick={() => setProfileOpen((v) => !v)}>
              <div className="avatar">{initialsFromUser(user)}</div>
              <div className="profileName">{displayName}</div>
              <div className="chev">▾</div>
            </button>

            {profileOpen && (
              <div className="profileMenu">
                <button className="menuItem" onClick={() => setProfileOpen(false)}>
                  Account
                </button>
                <button className="menuItem danger" onClick={onLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* This is where pages render (Invoices, Settings, etc.) */}
        <Outlet />
      </main>
    </div>
  );
}
