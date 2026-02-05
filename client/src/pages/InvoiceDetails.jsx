import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import "./InvoiceDetails.css";

function formatMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function InvoiceDetails() {
  const { id } = useParams();
  const nav = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await api.get(`/invoices/${id}`);
        setInvoice(data.invoice);
      } catch (e) {
        setErr(e?.response?.data?.error || e?.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="invPage"><div className="invCard">Loading…</div></div>;
  if (err) return (
    <div className="invPage">
      <div className="invCard">
        <button className="backBtn" onClick={() => nav("/dashboard")}>← Back</button>
        <div className="errorBox">⚠️ {err}</div>
      </div>
    </div>
  );

  const receiptUrl = invoice?.receipt?.url;
  const receiptType = invoice?.receipt?.resourceType; 

  return (
    <div className="invPage">
      <div className="invCard">
        <div className="invTop">
          <button className="backBtn" onClick={() => nav("/dashboard")}>← Back</button>
          <div className={`pill ${String(invoice.status || "").toLowerCase()}`}>{invoice.status}</div>
        </div>

        <h1 className="invH1">{invoice.name}</h1>

        <div className="grid">
          <div className="field">
            <div className="label">Who owes you</div>
            <div className="value">{invoice.client}</div>
          </div>

          <div className="field">
            <div className="label">Date</div>
            <div className="value">{formatDate(invoice.date)}</div>
          </div>

          <div className="field">
            <div className="label">Total</div>
            <div className="value">{formatMoney(invoice.total)}</div>
          </div>

          <div className="field">
            <div className="label">Recipients</div>
            <div className="value">{invoice.recipientEmails || "—"}</div>
          </div>

          <div className="field wide">
            <div className="label">Notes</div>
            <div className="value">{invoice.notes || "—"}</div>
          </div>
        </div>

        <div className="receiptSection">
          <div className="label">Receipt / Attachment</div>

          {!receiptUrl && <div className="muted">No receipt uploaded.</div>}

          {receiptUrl && (
            <>
              <a className="linkBtn" href={receiptUrl} target="_blank" rel="noreferrer">
                Open attachment in new tab
              </a>

              {receiptType === "image" && (
                <img className="receiptImg" src={receiptUrl} alt="Receipt upload" />
              )}

              {receiptType === "raw" && (
                <iframe className="receiptPdf" title="Receipt PDF" src={receiptUrl} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
