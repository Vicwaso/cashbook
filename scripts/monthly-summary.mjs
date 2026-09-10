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
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const toISO = d => d.toISOString().slice(0, 10);
  const label = start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return { startStr: toISO(start), endStr: toISO(end), label };
}

async function fetchRows(table, startStr, endStr) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?date=gte.${startStr}&date=lte.${endStr}&select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Supabase fetch (${table}) failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function breakdownRows(rows, keyFn) {
  const byKey = {};
  rows.forEach(r => {
    const k = keyFn(r);
    byKey[k] = (byKey[k] || 0) + Number(r.amount);
  });
  return Object.entries(byKey)
    .sort((a, b) => b[1] - a[1])
    .map(([k, amt]) => `<tr><td style="padding:6px 0;color:#3E4E60;">${k}</td><td style="padding:6px 0;text-align:right;font-variant-numeric:tabular-nums;">${fmtKES(amt)}</td></tr>`)
    .join('');
}

function buildEmailHtml(label, income, expenses) {
  const incomeTotal = income.reduce((s, e) => s + Number(e.amount), 0);
  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const net = incomeTotal - expenseTotal;
  const netColor = net >= 0 ? '#3F6B4E' : '#A8492E';

  const incomeRows = breakdownRows(income, r => r.venture);
  const expenseRows = breakdownRows(expenses, r => r.category);

  return `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:24px;color:#1B2A3D;">
      <h1 style="font-size:20px;border-bottom:2px solid #1B2A3D;padding-bottom:8px;">Cashbook — ${label}</h1>

      <p style="font-size:15px;">Net: <strong style="color:${netColor};">${fmtKES(net)}</strong></p>
      <p style="font-size:13px;color:#3E4E60;">Income: ${fmtKES(incomeTotal)} · Expenses: ${fmtKES(expenseTotal)}</p>

      <h2 style="font-size:14px;margin-top:18px;">Income by venture</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${incomeRows || '<tr><td>No income logged.</td></tr>'}
      </table>

      <h2 style="font-size:14px;margin-top:18px;">Expenses by category</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${expenseRows || '<tr><td>No expenses logged.</td></tr>'}
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
  const [income, expenses] = await Promise.all([
    fetchRows('entries', startStr, endStr),
    fetchRows('expenses', startStr, endStr)
  ]);
  const html = buildEmailHtml(label, income, expenses);
  await sendEmail(label, html);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
