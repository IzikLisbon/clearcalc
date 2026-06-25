#!/usr/bin/env node
// update-rates.js — refresh the "Today's average mortgage rates" box on the
// mortgage + refinance pages from FRED (Federal Reserve Bank of St. Louis).
//
// Data source: Freddie Mac Primary Mortgage Market Survey (PMMS), public domain,
// served via FRED's public CSV download endpoint (no API key required):
//   MORTGAGE30US — 30-Year Fixed Rate Mortgage Average in the United States
//   MORTGAGE15US — 15-Year Fixed Rate Mortgage Average in the United States
//
// This is fresh, authoritative, citeable data — the differentiator a generic
// generated calculator can't claim. Run it before each deploy; it rewrites the
// content between <!--RATES:START--> and <!--RATES:END--> and updates the
// JSON-LD dateModified. Idempotent and safe to re-run.
//
// Usage: node update-rates.js   (exits non-zero only on a real failure)

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FRED = (id) => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
const PAGES = ['mortgage-calculator.html', 'refinance-calculator.html'];

/** Fetch a FRED series CSV and return the latest { date:'YYYY-MM-DD', value:Number }. */
async function latest(id) {
  const res = await fetch(FRED(id), { headers: { Accept: 'text/csv' } });
  if (!res.ok) throw new Error(`FRED ${id} HTTP ${res.status}`);
  const csv = await res.text();
  const rows = csv.trim().split('\n').slice(1); // drop header
  for (let i = rows.length - 1; i >= 0; i--) {
    const [date, raw] = rows[i].split(',');
    const value = parseFloat(raw);
    if (date && Number.isFinite(value)) return { date: date.trim(), value };
  }
  throw new Error(`FRED ${id}: no numeric observations`);
}

/** 'YYYY-MM-DD' → 'Jun 25, 2026' (UTC, no locale surprises). */
function prettyDate(iso) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, d] = iso.split('-').map(Number);
  return `${months[m - 1]} ${d}, ${y}`;
}

function buildBox(r30, r15, asOf) {
  return [
    '  <!--RATES:START-->',
    '  <div style="margin:14px 0 4px;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:#f6faf8;display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px">',
    '    <strong style="color:var(--brand)">Today\'s average mortgage rates</strong>',
    `    <span>30-yr fixed <b>${r30.toFixed(2)}%</b></span>`,
    `    <span>15-yr fixed <b>${r15.toFixed(2)}%</b></span>`,
    `    <span style="font-size:12px;color:var(--muted);flex-basis:100%">As of ${asOf} \u00b7 Source: Freddie Mac PMMS via FRED (Federal Reserve Bank of St. Louis) \u00b7 updated weekly</span>`,
    '  </div>',
    '  <!--RATES:END-->'
  ].join('\n');
}

async function main() {
  const [m30, m15] = await Promise.all([latest('MORTGAGE30US'), latest('MORTGAGE15US')]);
  // Use the newest observation date across the two series as the "as of".
  const asOfIso = m30.date >= m15.date ? m30.date : m15.date;
  const asOf = prettyDate(asOfIso);
  const box = buildBox(m30.value, m15.value, asOf);

  let changed = 0;
  for (const file of PAGES) {
    const p = path.join(__dirname, file);
    let html = fs.readFileSync(p, 'utf8');
    const before = html;
    html = html.replace(/ {2}<!--RATES:START-->[\s\S]*?<!--RATES:END-->/, box);
    html = html.replace(/("dateModified":")\d{4}-\d{2}-\d{2}(")/, `$1${asOfIso}$2`);
    if (html !== before) { fs.writeFileSync(p, html); changed++; }
  }

  // Keep the sitemap <lastmod> for the rate-bearing pages in sync with the data.
  const smPath = path.join(__dirname, 'sitemap.xml');
  if (fs.existsSync(smPath)) {
    let sm = fs.readFileSync(smPath, 'utf8');
    const smBefore = sm;
    for (const file of PAGES) {
      const re = new RegExp(`(<loc>https://getclearcalc\\.com/${file}</loc><lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`);
      sm = sm.replace(re, `$1${asOfIso}$2`);
    }
    if (sm !== smBefore) fs.writeFileSync(smPath, sm);
  }

  console.log(`rates: 30yr ${m30.value}% / 15yr ${m15.value}% as of ${asOf} — updated ${changed}/${PAGES.length} pages`);
}

main().catch((err) => { console.error(`update-rates failed: ${err.message}`); process.exit(1); });
