import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function money(n, currency = "USD") {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency });
}

export default function PayInvoice() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const { data } = await axios.get(`${API_URL}/public/invoices/${token}`);
        setInvoice(data.invoice);
      } catch (e) {
        setErr(e?.response?.data?.error || e?.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [API_URL, token]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err) return <div style={{ padding: 24 }}>⚠️ {err}</div>;
  if (!invoice) return null;

  return (
    <div style={{ minHeight: "100vh", padding: 24, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(92vw, 560px)", padding: 20, borderRadius: 16, border: "1px solid #ddd" }}>
        <h2 style={{ marginTop: 0 }}>{invoice.name}</h2>
        <div style={{ opacity: 0.8 }}>Client: {invoice.client}</div>
        <div style={{ marginTop: 10 }}>
          <strong>Total:</strong> {money(invoice.total, invoice.currency || "USD")}
        </div>

        {invoice.notes ? (
          <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
        ) : null}

        {invoice.receiptUrl ? (
          <div style={{ marginTop: 12 }}>
            <a href={invoice.receiptUrl} target="_blank" rel="noreferrer">
              View receipt
            </a>
          </div>
        ) : null}

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {invoice.paypalLink ? (
            <a
              href={invoice.paypalLink}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #000",
                textDecoration: "none",
              }}
            >
              Pay with PayPal
            </a>
          ) : (
            <div style={{ opacity: 0.7 }}>PayPal link not available.</div>
          )}

          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            style={{ padding: "10px 14px", borderRadius: 10 }}
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}
