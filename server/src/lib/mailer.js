import nodemailer from "nodemailer";

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function makeTransport() {
  const host = must("SMTP_HOST");
  const port = Number(must("SMTP_PORT"));
  const user = must("SMTP_USER");
  const pass = must("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendInvoiceEmail({ to, invoice, paypalLink, shareUrl }) {
  const from = process.env.FROM_EMAIL || "no-reply@ioweyou.app";

  const subject = `Invoice: ${invoice.name} — $${Number(invoice.total).toFixed(2)}`;

  const shareLine = shareUrl
    ? `<p><strong>View invoice:</strong> <a href="${shareUrl}" target="_blank" rel="noreferrer">${shareUrl}</a></p>`
    : "";

  const receiptLine = invoice.receipt?.url
    ? `<p><strong>Receipt:</strong> <a href="${invoice.receipt.url}" target="_blank" rel="noreferrer">View receipt</a></p>`
    : "";

  const paypalLine = paypalLink
    ? `<p><strong>Pay back with PayPal:</strong> <a href="${paypalLink}" target="_blank" rel="noreferrer">${paypalLink}</a></p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4;">
      <h2>Invoice from I Owe You</h2>

      <p><strong>Invoice:</strong> ${invoice.name}</p>
      <p><strong>Client:</strong> ${invoice.client}</p>
      <p><strong>Total:</strong> $${Number(invoice.total).toFixed(2)}</p>
      <p><strong>Status:</strong> ${invoice.status}</p>
      <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>

      ${invoice.notes ? `<p><strong>Notes:</strong><br/>${invoice.notes}</p>` : ""}

      ${shareLine}
      ${receiptLine}
      ${paypalLine}

      <hr/>
      <p style="font-size: 12px; opacity: 0.7;">
        Sent via I Owe You
      </p>
    </div>
  `;

  const transport = makeTransport();
  await transport.sendMail({
    from,
    to,
    subject,
    html,
  });
}
