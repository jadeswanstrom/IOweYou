import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import "./Settings.css";

export default function Settings() {
  const [paypalMe, setPaypalMe] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/users/me");
        setPaypalMe(data.user?.paypalMe || "");
        setCurrency((data.user?.currency || "USD").toUpperCase());
      } catch (e) {
        setErr(e?.response?.data?.error || e?.message || "Failed to load settings");
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const { data } = await api.patch("/users/me", { paypalMe, currency });
      setPaypalMe(data.user?.paypalMe || "");
      setCurrency((data.user?.currency || "USD").toUpperCase());
      setMsg("Saved!");
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settingsWrap">
      <section className="card">
        <div className="settingsHeader">
          <div className="settingsHeaderTitle">Payout</div>
          <div className="settingsHeaderSub">
            Add your PayPal.Me so recipients can pay you back with one click.
          </div>
        </div>

        <div className="settingsBody">
          <label className="mField">
            <div className="mLabel">PayPal.Me</div>
            <input
              className="mInput"
              value={paypalMe}
              onChange={(e) => setPaypalMe(e.target.value)}
              placeholder="yourusername OR https://paypal.me/yourusername"
            />
            <div className="settingsHelp">
              This is the PayPal account that invoice recipients will pay.
            </div>
          </label>

          <label className="mField">
            <div className="mLabel">Currency</div>
            <select
              className="mInput"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
            </select>
          </label>

          {err ? <div className="mError">⚠️ {err}</div> : null}
          {msg ? <div className="sSuccess">✅ {msg}</div> : null}

          <div className="mActions">
            <button className="mBtn primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
