import React, { useMemo, useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { AuthContext } from "../context/AuthContext";

const TABS = ["All Invoices", "Unpaid", "Pending", "Paid", "Archived"];

function formatMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseRecipients(raw) {
  return String(raw || "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinEmailLines(lines) {
  return lines.filter((l) => l !== null && l !== undefined).join("\r\n");
}

function buildMailto({ toList, subject, body }) {
  const to = (toList || []).join(",");
  const q = [];
  if (subject) q.push(`subject=${encodeURIComponent(subject)}`);
  if (body) q.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${to}${q.length ? `?${q.join("&")}` : ""}`;
}

export default function Dashboard() {
  const nav = useNavigate();
  const location = useLocation();

  const { user } = useContext(AuthContext);

  const senderName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Your friend";

  const [activeTab, setActiveTab] = useState("All Invoices");

  // invoices (real)
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  // row action menu
  const [menuOpenId, setMenuOpenId] = useState(null);

  // modal (new invoice)
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

  // share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [mailtoUrl, setMailtoUrl] = useState("");

  // close action menu on outside click
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
  // All Invoices should NOT include archived
  if (activeTab === "All Invoices") {
    return invoices.filter((inv) => inv.status !== "Archived");
  }

  // Archived tab (and others) show only matching status
  return invoices.filter((inv) => inv.status === activeTab);
}, [activeTab, invoices]);


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

  // If AppLayout navigates to /invoices with state: { openNew: true }
  useEffect(() => {
    if (location.state?.openNew) {
      openNewInvoice();
      nav("/invoices", { replace: true, state: null }); // clear state
    }
  }, [location.state, nav]);

  async function updateStatus(invoiceId, newStatus) {
    try {
      const { data } = await api.patch(`/invoices/${invoiceId}`, { status: newStatus });

      setInvoices((prev) => prev.map((inv) => (inv._id === invoiceId ? data.invoice : inv)));
      setMenuOpenId(null);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || e?.message || "Failed to update status");
    }
  }

  // Shares an existing invoice again (uses the invoice’s own saved fields)
  async function shareExistingInvoice(inv) {
    try {
      const pubRes = await api.post(`/invoices/${inv._id}/publish`);
      const token = pubRes.data.shareToken;

      const url = `${window.location.origin}/pay/${token}`;

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }

      const recipients = parseRecipients(inv.recipientEmails);
      const amountStr = Number(inv.total || 0).toFixed(2);
      const currency = (inv.currency || user?.currency || "USD").toUpperCase();

      const subject = `Invoice from ${senderName}: ${inv.name?.trim() || "Invoice"} — $${amountStr}`;

      const reason = (inv.notes || "").trim() || inv.name?.trim() || "this invoice";

      const lines = [
        `Hi${inv.client?.trim() ? ` ${inv.client.trim()}` : ""},`,
        "",
        `Please kindly receive this invoice from ${senderName} for ${reason}.`,
        "",
        `Invoice: ${inv.name?.trim() || "Invoice"}`,
        `Amount due: ${amountStr} ${currency}`,
        "",
        "You can view and pay the invoice here:",
        url,
        "",
        inv.notes?.trim() ? `Notes:\r\n${inv.notes.trim()}` : null,
        "",
        "If you have any questions, feel free to reply to this email.",
        "",
        "Thanks,",
        "I Owe You App - Invoicing Made Simple",
      ];

      const body = joinEmailLines(lines);
      const mailto = buildMailto({ toList: recipients, subject, body });

      setShareUrl(url);
      setMailtoUrl(mailto);
      setShareOpen(true);

      setMenuOpenId(null);
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || "Failed to generate share link");
    }
  }

  async function createInvoice(mode) {
    setSaveErr("");

    if (!invName.trim() || !invClientName.trim() || invTotal === "") {
      setSaveErr("Please fill in name, client, and total.");
      return;
    }

    setSaving(true);
    try {
      // upload receipt if provided
      let receipt = undefined;

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

      const payload = {
        name: invName.trim(),
        client: invClientName.trim(),
        recipientEmails: invRecipientEmails.trim(),
        notes: invNotes.trim(),
        total: Number(invTotal),
        status: invStatus,
        date: invDate,
        receipt,
      };

      const { data } = await api.post("/invoices", payload);

      // add to list
      setInvoices((prev) => [data.invoice, ...prev]);
      setModalOpen(false);

      // "Create & Share" = publish + show link + open email app option
      if (mode === "send") {
        const pubRes = await api.post(`/invoices/${data.invoice._id}/publish`);
        const token = pubRes.data.shareToken;

        const url = `${window.location.origin}/pay/${token}`;

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
        }

        const recipients = parseRecipients(invRecipientEmails);
        const amountStr = Number(invTotal || 0).toFixed(2);
        const currency = (user?.currency || "USD").toUpperCase();

        const subject = `Invoice from ${senderName}: ${invName.trim()} — $${amountStr}`;

        const reason = invNotes.trim() || invName.trim() || "this invoice";

        const lines = [
          `Hi${invClientName?.trim() ? ` ${invClientName.trim()}` : ""},`,
          "",
          `Please kindly receive this invoice from ${senderName} for ${reason}.`,
          "",
          `Invoice: ${invName.trim()}`,
          `Amount due: ${amountStr} ${currency}`,
          "",
          "You can view and pay the invoice here:",
          url,
          "",
          invNotes?.trim() ? `Notes:\r\n${invNotes.trim()}` : null,
          "",
          "If you have any questions, feel free to reply to this email.",
          "",
          "Thanks,",
          senderName,
        ];

        const body = joinEmailLines(lines);
        const mailto = buildMailto({ toList: recipients, subject, body });

        setShareUrl(url);
        setMailtoUrl(mailto);
        setShareOpen(true);
      }
    } catch (e) {
      setSaveErr(e?.response?.data?.error || e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
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
          <div className="th name">
            Name <span className="sort">⇅</span>
          </div>
          <div className="th date">
            Date <span className="sort">⇅</span>
          </div>
          <div className="th client">
            Client <span className="sort">⇅</span>
          </div>
          <div className="th price">
            Price <span className="sort">⇅</span>
          </div>
          <div className="th status">Status</div>
          <div className="th actions" />
        </div>

        <div className="rows">
          {loading && <div className="empty">Loading invoices…</div>}
          {!loading && loadErr && <div className="empty">⚠️ {loadErr}</div>}

          {!loading &&
            !loadErr &&
            filteredInvoices.map((inv, idx) => (
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
                      {inv.name}{" "}
                      {inv.receipt?.url ? <span className="clip" title="Has receipt"></span> : null}
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
                    <div className="actionMenu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => shareExistingInvoice(inv)}>Share link</button>

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

      {/* New Invoice Modal */}
      {modalOpen && (
        <div className="modalBackdrop" onMouseDown={() => setModalOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div className="modalTitle">New Invoice</div>
              <button className="modalClose" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <form className="modalForm" onSubmit={(e) => e.preventDefault()}>
              <label className="mField">
                <div className="mLabel">Invoice Title</div>
                <input
                  className="mInput"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="Invoice Title / Subject"
                />
              </label>

              <input
                className="mInput"
                value={invClientName}
                onChange={(e) => setInvClientName(e.target.value)}
                placeholder="Name of Invoice Recipient"
              />

              <input
                className="mInput"
                value={invRecipientEmails}
                onChange={(e) => setInvRecipientEmails(e.target.value)}
                placeholder="Email of Recipient(s)"
              />

              <textarea
                className="mInput"
                style={{ height: 96, paddingTop: 12, paddingBottom: 12, resize: "vertical" }}
                value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)}
                placeholder="Invoice Message"
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
                  <input
                    className="mInput"
                    type="date"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                  />
                </label>

                <label className="mField">
                  <div className="mLabel">Status</div>
                  <select
                    className="mInput"
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value)}
                  >
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
                <button
                  type="button"
                  className="mBtn primary"
                  disabled={saving}
                  onClick={() => createInvoice("send")}
                >
                  {saving ? "Working…" : "Create & Share"}
                </button>

                <button
                  type="button"
                  className="mBtn ghost"
                  disabled={saving}
                  onClick={() => createInvoice("save")}
                >
                  {saving ? "Working…" : "Create & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <div className="modalBackdrop" onMouseDown={() => setShareOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div className="modalTitle">Share Invoice</div>
              <button className="modalClose" onClick={() => setShareOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modalForm" style={{ gap: 10 }}>
              <div className="mLabel">Share link (copied to clipboard)</div>
              <input className="mInput" value={shareUrl} readOnly />

              <div className="mActions">
                <button
                  type="button"
                  className="mBtn ghost"
                  onClick={async () => {
                    if (shareUrl && navigator.clipboard) {
                      await navigator.clipboard.writeText(shareUrl);
                    }
                    alert("Copied!");
                  }}
                >
                  Copy Link
                </button>

                <button
                  type="button"
                  className="mBtn primary"
                  onClick={() => (window.location.href = mailtoUrl)}
                >
                  Share as Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
