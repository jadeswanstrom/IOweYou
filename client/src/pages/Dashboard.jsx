import React, { useContext, useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../lib/api";
import "./Dashboard.css";


const TABS = ["All Invoices", "Unpaid", "Pending", "Paid", "Archived"];

function formatMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function initialsFromUser(user) {
  const first = user?.firstName?.[0] || user?.name?.[0] || "U";
  const last = user?.lastName?.[0] || user?.name?.split(" ")?.[1]?.[0] || "";
  return (first + last).toUpperCase();
}

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const nav = useNavigate();

  const [activeTab, setActiveTab] = useState("All Invoices");
  const [sidebarActive, setSidebarActive] = useState("Invoices");

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // invoices (real)
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [invName, setInvName] = useState("");
  const [invClientName, setInvClientName] = useState("");
  const [invRecipientEmails, setInvRecipientEmails] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [invTotal, setInvTotal] = useState("");
  const [invStatus, setInvStatus] = useState("Unpaid");
  const [invDate, setInvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptName, setReceiptName] = useState("");


  const displayName =
    user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";

  
  useEffect(() => {
    function onDocClick(e) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

const [menuOpenId, setMenuOpenId] = useState(null);

useEffect(() => {
  function close(e) {
    if (e.target.closest(".actionMenu")) return;
    if (e.target.closest(".dots")) return;

    setMenuOpenId(null);
  }

  document.addEventListener("mousedown", close);
  return () => document.removeEventListener("mousedown", close);
}, []);


  // load invoices
  async function fetchInvoices() {
    setLoading(true);
    setLoadErr("");
    try {
      const { data } = await api.get("/invoices");
      setInvoices(data.invoices || []);
    } catch (e) {
      setLoadErr(e?.response?.data?.error || e?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    if (activeTab === "All Invoices") return invoices;
    return invoices.filter((inv) => inv.status === activeTab);
  }, [activeTab, invoices]);

  function onLogout() {
    logout();
    nav("/login");
  }

 function openNewInvoice() {
  setSaveErr("");
  setInvName("");
  setInvClientName("");
  setInvRecipientEmails("");
  setInvNotes("");
  setInvTotal("");
  setInvStatus("Unpaid");
  setInvDate(new Date().toISOString().slice(0, 10));

  setReceiptFile(null);
  setReceiptName("");

  setModalOpen(true);
}

async function updateStatus(invoiceId, newStatus) {
  try {
    const { data } = await api.patch(`/invoices/${invoiceId}`, {
      status: newStatus,
    });

    // update local list so tabs re-filter instantly
    setInvoices((prev) =>
      prev.map((inv) => (inv._id === invoiceId ? data.invoice : inv))
    );

    setMenuOpenId(null);
  } catch (e) {
    console.error(e);
    alert(e?.response?.data?.error || e?.message || "Failed to update status");
  }
}



  async function createInvoice(e) {
    e.preventDefault();
    setSaveErr("");

    if (!invName.trim() || !invClientName.trim() || invTotal === "") {
      setSaveErr("Please fill in name, client, and total.");
      return;
    }

   setSaving(true);
try {
  let receipt = undefined;

  // upload file 
  if (receiptFile) {
    const fd = new FormData();
    fd.append("file", receiptFile);

    const up = await api.post("/uploads/receipt", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    receipt = {
      url: up.data.url,
      publicId: up.data.publicId,
      originalName: up.data.originalName,
      resourceType: up.data.resourceType,
    };
  }

  // create invoice with receipt metadata
  const payload = {
    name: invName.trim(),
    client: invClientName.trim(),
    recipientEmails: invRecipientEmails.trim(),
    notes: invNotes.trim(),
    total: Number(invTotal),
    status: invStatus,
    date: invDate,
    receipt, // url stored in MongoDB
  };


  const { data } = await api.post("/invoices", payload);
  setInvoices((prev) => [data.invoice, ...prev]);
  setModalOpen(false);
} catch (e2) {
  setSaveErr(e2?.response?.data?.error || e2?.message || "Failed to create invoice");
} finally {
  setSaving(false);
}
  }


  return (
    <div className="dash">
      {/* Sidebar */}
      <aside className="sidebar">
        <button className="newInvoiceBtn" onClick={openNewInvoice}>
          <span className="plus">+</span> New Invoice
        </button>

        <nav className="nav">
          <button
            className={`navItem ${sidebarActive === "Home" ? "active" : ""}`}
            onClick={() => setSidebarActive("Home")}
          >
            <span className="navIcon">🏠</span> Home
          </button>

          <button
            className={`navItem ${sidebarActive === "Invoices" ? "active" : ""}`}
            onClick={() => setSidebarActive("Invoices")}
          >
            <span className="navIcon">🧾</span> Invoices
          </button>

          <button
            className={`navItem ${sidebarActive === "Settings" ? "active" : ""}`}
            onClick={() => setSidebarActive("Settings")}
          >
            <span className="navIcon">⚙️</span> Settings
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Top bar */}
        <header className="topbar">
          <h1 className="pageTitle">Invoices</h1>

          <div className="profile" ref={profileRef}>
            <button className="profileBtn" onClick={() => setProfileOpen((v) => !v)}>
              <div className="avatar">{initialsFromUser(user)}</div>
              <div className="profileMeta">
                <div className="profileName">{displayName}</div>
              </div>
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

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`tab ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Table card */}
        <section className="card">
          <div className="tableHeader">
            <div className="th name">Name <span className="sort">⇅</span></div>
            <div className="th date">Date <span className="sort">⇅</span></div>
            <div className="th client">Client <span className="sort">⇅</span></div>
            <div className="th price">Price <span className="sort">⇅</span></div>
            <div className="th status">Status</div>
            <div className="th actions" />
          </div>

          <div className="rows">
            {loading && <div className="empty">Loading invoices…</div>}
            {!loading && loadErr && <div className="empty">⚠️ {loadErr}</div>}

            {!loading && !loadErr && filteredInvoices.map((inv, idx) => (
              <div
              className="row clickable"
              key={inv._id}
              role="button"
              tabIndex={0}
              onClick={() => nav(`/invoices/${inv._id}`)}
              onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") nav(`/invoices/${inv._id}`);
              }}
              >

                <div className="cell name">
                  <div className={`docIcon color${(idx % 3) + 1}`}>🧾</div>
                  <div className="nameBlock">
                    <div className="invTitle">
                   {inv.name} {inv.receipt?.url ? <span className="clip" title="Has receipt"></span> : null}
                  </div>

                    <div className="invId">{inv._id.slice(-6).toUpperCase()}</div>
                  </div>
                </div>

                <div className="cell date">{formatDate(inv.date)}</div>
                <div className="cell client">{inv.client}</div>
                <div className="cell price">{formatMoney(inv.total)}</div>

                <div className="cell status">
                  <span className={`pill ${inv.status.toLowerCase()}`}>{inv.status}</span>
                </div>

                <div className="cell actions" style={{ position: "relative" }}>
  <button
    className="dots"
    onClick={(e) => {
      e.stopPropagation(); 
      setMenuOpenId((curr) => (curr === inv._id ? null : inv._id));
    }}
  >
    …
  </button>

  {menuOpenId === inv._id && (
       <div
      className="actionMenu"
      onClick={(e) => e.stopPropagation()} 
       >
      <button onClick={() => updateStatus(inv._id, "Unpaid")}>Mark Unpaid</button>
      <button onClick={() => updateStatus(inv._id, "Pending")}>Mark Pending</button>
      <button onClick={() => updateStatus(inv._id, "Paid")}>Mark Paid</button>
      <button onClick={() => updateStatus(inv._id, "Archived")}>Archive</button>
      </div>
      )}
      </div>

              </div>
            ))}

            {!loading && !loadErr && filteredInvoices.length === 0 && (
              <div className="empty">No invoices created yet.</div>
            )}
          </div>
        </section>
      </main>

      {/* New Invoice Modal */}
      {modalOpen && (
        <div className="modalBackdrop" onMouseDown={() => setModalOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div className="modalTitle">New Invoice</div>
              <button className="modalClose" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form className="modalForm" onSubmit={createInvoice}>
              <label className="mField">
                <div className="mLabel">Invoice Title</div>
                <input className="mInput" value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Splitting Dinner" />
              </label>

             <input
              className="mInput"
              value={invClientName}
              onChange={(e) => setInvClientName(e.target.value)}
               placeholder="Adam Smith"
                 />


              <input
              className="mInput"
              value={invRecipientEmails}
              onChange={(e) => setInvRecipientEmails(e.target.value)}
              placeholder="fake@email.com, fake1@email.com, fake2@email.com"
                />


               <textarea
               className="mInput"
               style={{ height: 96, paddingTop: 12, paddingBottom: 12, resize: "vertical" }}
               value={invNotes}
               onChange={(e) => setInvNotes(e.target.value)}
               placeholder="Dinner from Thursday night. You ordered a Martini and the Ribeye."
               />


              <label className="mField">
              <div className="mLabel">Upload Receipt (optional)</div>
              <input
              className="mInput"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
              const f = e.target.files?.[0];
              setReceiptFile(f || null);
              setReceiptName(f?.name || "");
              }}
             />
              {receiptName ? <div style={{ fontSize: 12, opacity: 0.7 }}>{receiptName}</div> : null}
             </label>

              <div className="mRow">
                <label className="mField">
                  <div className="mLabel">Date</div>
                  <input className="mInput" type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
                </label>

                <label className="mField">
                  <div className="mLabel">Status</div>
                  <select className="mInput" value={invStatus} onChange={(e) => setInvStatus(e.target.value)}>
                    <option>Unpaid</option>
                    <option>Pending</option>
                    <option>Paid</option>
                    <option>Archived</option>
                  </select>
                </label>
              </div>

              <label className="mField">
                <div className="mLabel">Total</div>
                <input
                  className="mInput"
                  type="number"
                  step="0.01"
                  value={invTotal}
                  onChange={(e) => setInvTotal(e.target.value)}
                  placeholder="1240.00"
                />
              </label>

              {saveErr && <div className="mError">⚠️ {saveErr}</div>}

              <div className="mActions">
                <button type="button" className="mBtn ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="mBtn primary" disabled={saving}>
                  {saving ? "Creating…" : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
