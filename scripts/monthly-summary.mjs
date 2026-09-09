// Runs on a schedule via GitHub Actions (see .github/workflows/monthly-summary.yml).
// Reads env vars: SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY, SUMMARY_TO_EMAIL, SUMMARY_FROM_EMAIL

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.SUMMARY_TO_EMAIL || 'wasongav01@gmail.com';
const FROM_EMAIL = process.env.SUMMARY_FROM_EMAIL || 'onboarding@resend.dev';

function fmtKES(n) {
  return 'KES ' + Number(n).toLocaleString('en-KE', { maximumFractionDigits: 0 });
}

function previousMonthRange() {
  const now = new Date();
  // Run on the 1st, so "previous month" is last month relative to today.
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
  const toISO = d => d.toISOString().slice(0, 10);
  const label = start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return { startStr: toISO(start), endStr: toISO(end), label };
}

async function fetchEntries(startStr, endStr) {
  const url = `${SUPABASE_URL}/rest/v1/entries?date=gte.${startStr}&date=lte.${endStr}&select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function buildEmailHtml(label, entries) {
  const total = entries.reduce((s, e) => s + Number(e.amount), 0);
  const byVenture = {};
  entries.forEach(e => {
    byVenture[e.venture] = (byVenture[e.venture] || 0) + Number(e.amount);
  });
  const rows = Object.entries(byVenture)
    .sort((a, b) => b[1] - a[1])
    .map(([venture, amt]) => `<tr><td style="padding:6px 0;color:#3E4E60;">${venture}</td><td style="padding:6px 0;text-align:right;font-variant-numeric:tabular-nums;">${fmtKES(amt)}</td></tr>`)
    .join('');

  return `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:24px;color:#1B2A3D;">
      <h1 style="font-size:20px;border-bottom:2px solid #1B2A3D;padding-bottom:8px;">Cashbook — ${label}</h1>
      <p style="font-size:14px;">Total earnings: <strong>${fmtKES(total)}</strong> across ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        ${rows || '<tr><td>No entries logged this month.</td></tr>'}
      </table>
    </div>
  `;
}

async function sendEmail(label, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject: `Cashbook summary — ${label}`,
      html
    })
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  console.log('Summary email sent for', label);
}

async function main() {
  const { startStr, endStr, label } = previousMonthRange();
  const entries = await fetchEntries(startStr, endStr);
  const html = buildEmailHtml(label, entries);
  await sendEmail(label, html);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
