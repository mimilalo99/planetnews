/**
 * market-data.js — Planet News market data module
 *
 * Data sources:
 *  FX          → Frankfurter (ECB reference rates, free, no key, CORS-safe)
 *  Commodities → Stooq delayed CSV (free, no key)
 *  Bonds       → Stooq delayed CSV for US Treasury / Bund proxies
 *
 * Falls back to clearly-labelled Demo values if any source is unavailable.
 * Exposes: window.fetchMarketData()
 */

(function () {

  /* ─── Fallback data ──────────────────────────────────────────────── */
  const FALLBACK = {
    commodities: [
      { name: "Gold",     value: "N/A" },
      { name: "WTI Crude",value: "N/A" },
      { name: "Brent",    value: "N/A" },
      { name: "Natural Gas", value: "N/A" },
    ],
    fx: [
      { pair: "EUR/USD", value: "N/A" },
      { pair: "USD/JPY", value: "N/A" },
      { pair: "GBP/USD", value: "N/A" },
      { pair: "USD/CAD", value: "N/A" },
    ],
    bonds: [
      { name: "US 10Y",  value: "N/A" },
      { name: "US 2Y",   value: "N/A" },
      { name: "DE 10Y",  value: "N/A" },
    ],
  };

  /* ─── DOM helpers ────────────────────────────────────────────────── */
  function setMeta(prefix, source, statusText) {
    const sourceEl  = document.getElementById(`${prefix}-source`);
    const updatedEl = document.getElementById(`${prefix}-updated`);
    const statusEl  = document.getElementById(`${prefix}-status`);
    if (sourceEl)  sourceEl.textContent  = `Source: ${source}`;
    if (updatedEl) updatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
    if (statusEl) {
      statusEl.textContent = statusText;
      statusEl.className   = "badge";
      if (statusText === "Live")    statusEl.classList.add("badge-live");
      else if (statusText === "Delayed") statusEl.classList.add("badge-delayed");
      else                           statusEl.classList.add("badge-demo");
    }
  }

  function renderGrid(id, items, labelKey, valueKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items
      .map(
        (item) => `
        <article class="mini-card">
          <h3>${item[labelKey]}</h3>
          <p>${item[valueKey]}</p>
        </article>`
      )
      .join("");
  }

  /* ─── Fetch helpers ──────────────────────────────────────────────── */
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

  /* ─── Stooq CSV parser ───────────────────────────────────────────── */
  async function stooqFetch(symbol) {
    const url = `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcvn&e=csv`;
    const csv  = await getText(url);
    const lines   = csv.trim().split("\n");
    const headers = lines[0].split(",");
    const values  = (lines[1] || "").split(",");
    const closeIdx = headers.indexOf("Close");
    const raw = values[closeIdx];
    if (!raw || raw.trim() === "N/D") return null;
    return parseFloat(raw.trim());
  }

  /* ─── FX — Frankfurter (ECB reference rates) ────────────────────── */
  async function fetchFX() {
    // Base = EUR → USD rate is the real EUR/USD
    const data = await getJson(
      "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,CAD,JPY,AUD"
    );

    // USD/JPY: we have EUR/JPY; invert & cross: USD/JPY = EUR/JPY ÷ EUR/USD
    const eurUsd = data.rates.USD;
    const usdJpy  = data.rates.JPY ? (data.rates.JPY / eurUsd) : null;
    const gbpUsd  = data.rates.GBP ? (eurUsd / data.rates.GBP) : null;
    const usdCad  = data.rates.CAD ? (data.rates.CAD / eurUsd) : null;

    return [
      { pair: "EUR/USD", value: eurUsd          ? eurUsd.toFixed(4)  : "N/A" },
      { pair: "USD/JPY", value: usdJpy          ? usdJpy.toFixed(2)  : "N/A" },
      { pair: "GBP/USD", value: gbpUsd          ? gbpUsd.toFixed(4)  : "N/A" },
      { pair: "USD/CAD", value: usdCad          ? usdCad.toFixed(4)  : "N/A" },
    ];
  }

  /* ─── Commodities — Stooq ────────────────────────────────────────── */
  async function fetchCommodities() {
    const symbols = [
      { name: "Gold",        code: "xauusd",  prefix: "$", decimals: 2 },
      { name: "WTI Crude",   code: "cl.f",    prefix: "$", decimals: 2 },
      { name: "Brent",       code: "bz.f",    prefix: "$", decimals: 2 },
      { name: "Natural Gas", code: "ng.f",    prefix: "$", decimals: 3 },
    ];

    return Promise.all(
      symbols.map(async (item) => {
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

  /* ─── Bonds — Stooq (government bond yield proxies) ─────────────── */
  async function fetchBonds() {
    // Stooq symbols for benchmark government bond yields (% p.a.)
    const symbols = [
      { name: "US 10Y", code: "10ust.b" },
      { name: "US 2Y",  code: "2ust.b"  },
      { name: "DE 10Y", code: "10debt.b" },
    ];

    return Promise.all(
      symbols.map(async (item) => {
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

  /* ─── Main export ────────────────────────────────────────────────── */
  window.fetchMarketData = async function fetchMarketData() {
    let fx          = FALLBACK.fx;
    let commodities = FALLBACK.commodities;
    let bonds       = FALLBACK.bonds;

    /* FX */
    try {
      fx = await fetchFX();
      renderGrid("fx-grid", fx, "pair", "value");
      setMeta("fx", "Frankfurter / ECB", "Live");
    } catch {
      renderGrid("fx-grid", FALLBACK.fx, "pair", "value");
      setMeta("fx", "Fallback", "Demo");
    }

    /* Commodities */
    try {
      commodities = await fetchCommodities();
      renderGrid("commodities-grid", commodities, "name", "value");
      // Stooq is end-of-day delayed
      const anyLive = commodities.some((c) => c.value !== "N/A");
      setMeta("commodities", "Stooq", anyLive ? "Delayed" : "Demo");
    } catch {
      renderGrid("commodities-grid", FALLBACK.commodities, "name", "value");
      setMeta("commodities", "Fallback", "Demo");
    }

    /* Bonds */
    try {
      bonds = await fetchBonds();
      renderGrid("bonds-grid", bonds, "name", "value");
      const anyLive = bonds.some((b) => b.value !== "N/A");
      setMeta("bonds", "Stooq", anyLive ? "Delayed" : "Demo");
    } catch {
      renderGrid("bonds-grid", FALLBACK.bonds, "name", "value");
      setMeta("bonds", "Fallback", "Demo");
    }

    return { fx, commodities, bonds };
  };

})();
