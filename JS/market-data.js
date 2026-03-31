/**
 * market-data.js — Planet News market data module
 *
 * Data sources:
 *  FX          → Frankfurter (ECB reference rates, free, CORS-safe)
 *  Commodities → Stooq delayed CSV routed through allorigins CORS proxy
 *  Bonds       → Stooq delayed CSV routed through allorigins CORS proxy
 *
 * All three sources are fetched in PARALLEL so the first data appears
 * as soon as the slowest of the three responds (not their sum).
 *
 * Exposes: window.fetchMarketData()
 */

(function () {

  /* ─── CORS proxy (needed for Stooq on GitHub Pages / any HTTPS origin) ── */
  function proxied(url) {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  }

  /* ─── Fallback data ─────────────────────────────────────────────────── */
  const FALLBACK = {
    commodities: [
      { name: "Gold",        value: "N/A" },
      { name: "WTI Crude",   value: "N/A" },
      { name: "Brent",       value: "N/A" },
      { name: "Natural Gas", value: "N/A" },
    ],
    fx: [
      { pair: "EUR/USD", value: "N/A" },
      { pair: "USD/JPY", value: "N/A" },
      { pair: "GBP/USD", value: "N/A" },
      { pair: "USD/CAD", value: "N/A" },
    ],
    bonds: [
      { name: "US 10Y", value: "N/A" },
      { name: "US 2Y",  value: "N/A" },
      { name: "DE 10Y", value: "N/A" },
    ],
  };

  /* ─── DOM helpers ───────────────────────────────────────────────────── */
  function setMeta(prefix, source, statusText) {
    const sourceEl  = document.getElementById(`${prefix}-source`);
    const updatedEl = document.getElementById(`${prefix}-updated`);
    const statusEl  = document.getElementById(`${prefix}-status`);
    if (sourceEl)  sourceEl.textContent  = `Source: ${source}`;
    if (updatedEl) updatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    if (statusEl) {
      statusEl.textContent = statusText;
      statusEl.className   = "badge";
      if      (statusText === "Live")    statusEl.classList.add("badge-live");
      else if (statusText === "Delayed") statusEl.classList.add("badge-delayed");
      else                               statusEl.classList.add("badge-demo");
    }
  }

  function renderGrid(id, items, labelKey, valueKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items
      .map(item => `
        <article class="mini-card">
          <h3>${item[labelKey]}</h3>
          <p>${item[valueKey]}</p>
        </article>`)
      .join("");
  }

  /* ─── Fetch helpers ─────────────────────────────────────────────────── */
  async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function getText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  /* ─── Stooq CSV via CORS proxy ──────────────────────────────────────── */
  async function stooqFetch(symbol) {
    const stooqUrl = `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcvn&e=csv`;
    const csv      = await getText(proxied(stooqUrl));
    const lines    = csv.trim().split("\n");
    const headers  = lines[0].split(",");
    const values   = (lines[1] || "").split(",");
    const closeIdx = headers.indexOf("Close");
    const raw      = values[closeIdx];
    if (!raw || raw.trim() === "N/D" || raw.trim() === "") return null;
    return parseFloat(raw.trim());
  }

  /* ─── FX — Frankfurter (ECB reference rates, direct, no proxy needed) ─ */
  async function fetchFX() {
    // Base = EUR → data.rates.USD is the real EUR/USD exchange rate
    const data   = await getJson(
      "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,CAD,JPY,AUD"
    );
    const eurUsd = data.rates.USD;
    const usdJpy = data.rates.JPY ? (data.rates.JPY / eurUsd) : null;
    const gbpUsd = data.rates.GBP ? (eurUsd / data.rates.GBP) : null;
    const usdCad = data.rates.CAD ? (data.rates.CAD / eurUsd) : null;

    return [
      { pair: "EUR/USD", value: eurUsd ? eurUsd.toFixed(4) : "N/A" },
      { pair: "USD/JPY", value: usdJpy ? usdJpy.toFixed(2) : "N/A" },
      { pair: "GBP/USD", value: gbpUsd ? gbpUsd.toFixed(4) : "N/A" },
      { pair: "USD/CAD", value: usdCad ? usdCad.toFixed(4) : "N/A" },
    ];
  }

  /* ─── Commodities — Stooq via proxy ────────────────────────────────── */
  async function fetchCommodities() {
    const symbols = [
      { name: "Gold",        code: "xauusd", prefix: "$", decimals: 2 },
      { name: "WTI Crude",   code: "cl.f",   prefix: "$", decimals: 2 },
      { name: "Brent",       code: "bz.f",   prefix: "$", decimals: 2 },
      { name: "Natural Gas", code: "ng.f",   prefix: "$", decimals: 3 },
    ];

    // Fetch all symbols concurrently
    return Promise.all(
      symbols.map(async item => {
        try {
          const val = await stooqFetch(item.code);
          if (val === null) return { name: item.name, value: "N/A" };
          return { name: item.name, value: `${item.prefix}${val.toFixed(item.decimals)}` };
        } catch {
          return { name: item.name, value: "N/A" };
        }
      })
    );
  }

  /* ─── Bond yields — Stooq via proxy ────────────────────────────────── */
  async function fetchBonds() {
    const symbols = [
      { name: "US 10Y", code: "10ust.b"  },
      { name: "US 2Y",  code: "2ust.b"   },
      { name: "DE 10Y", code: "10debt.b" },
    ];

    return Promise.all(
      symbols.map(async item => {
        try {
          const val = await stooqFetch(item.code);
          if (val === null) return { name: item.name, value: "N/A" };
          return { name: item.name, value: `${val.toFixed(3)}%` };
        } catch {
          return { name: item.name, value: "N/A" };
        }
      })
    );
  }

  /* ─── Main export — all three sources fetched IN PARALLEL ──────────── */
  window.fetchMarketData = async function fetchMarketData() {
    // Fire all three requests at exactly the same time
    const [fxResult, commodResult, bondsResult] = await Promise.allSettled([
      fetchFX(),
      fetchCommodities(),
      fetchBonds(),
    ]);

    // FX
    const fx = fxResult.status === "fulfilled" ? fxResult.value : FALLBACK.fx;
    renderGrid("fx-grid", fx, "pair", "value");
    setMeta("fx",
      fxResult.status === "fulfilled" ? "Frankfurter / ECB"  : "Fallback",
      fxResult.status === "fulfilled" ? "Live" : "Demo"
    );

    // Commodities
    const commodities = commodResult.status === "fulfilled" ? commodResult.value : FALLBACK.commodities;
    renderGrid("commodities-grid", commodities, "name", "value");
    const commodAnyLive = commodities.some(c => c.value !== "N/A");
    setMeta("commodities",
      commodResult.status === "fulfilled" && commodAnyLive ? "Stooq"    : "Fallback",
      commodResult.status === "fulfilled" && commodAnyLive ? "Delayed"  : "Demo"
    );

    // Bonds
    const bonds = bondsResult.status === "fulfilled" ? bondsResult.value : FALLBACK.bonds;
    renderGrid("bonds-grid", bonds, "name", "value");
    const bondsAnyLive = bonds.some(b => b.value !== "N/A");
    setMeta("bonds",
      bondsResult.status === "fulfilled" && bondsAnyLive ? "Stooq"   : "Fallback",
      bondsResult.status === "fulfilled" && bondsAnyLive ? "Delayed" : "Demo"
    );

    return { fx, commodities, bonds };
  };

})();
