(function () {
  const fallbackData = {
    commodities: [
      { name: "Gold", value: "Fallback only", symbol: "XAU" },
      { name: "WTI Crude", value: "Fallback only", symbol: "CL" },
      { name: "Brent", value: "Fallback only", symbol: "BRN" }
    ],
    fx: [
      { pair: "EUR/USD", value: "Fallback only" },
      { pair: "USD/JPY", value: "Fallback only" },
      { pair: "GBP/USD", value: "Fallback only" }
    ],
    bonds: [
      { name: "US 10Y", value: "Fallback only" },
      { name: "US 2Y", value: "Fallback only" },
      { name: "DE 10Y", value: "Fallback only" }
    ]
  };

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.text();
  }

  function setMeta(prefix, source, statusText) {
    const sourceEl = document.getElementById(`${prefix}-source`);
    const updatedEl = document.getElementById(`${prefix}-updated`);
    const statusEl = document.getElementById(`${prefix}-status`);

    if (sourceEl) sourceEl.textContent = `Source: ${source}`;
    if (updatedEl) updatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
    if (statusEl) statusEl.textContent = statusText;
  }

  function renderGrid(id, items, labelKey = "name", valueKey = "value") {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(item => `
      <article class="mini-card">
        <h3>${item[labelKey]}</h3>
        <p>${item[valueKey]}</p>
      </article>
    `).join("");
  }

  async function fetchFX() {
    const data = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR,JPY,GBP,CAD,CHF,AUD");
    return [
      { pair: "USD/EUR", value: data.rates.EUR },
      { pair: "USD/JPY", value: data.rates.JPY },
      { pair: "USD/GBP", value: data.rates.GBP },
      { pair: "USD/CAD", value: data.rates.CAD }
    ];
  }

  async function fetchCommodities() {
    const symbols = [
      { name: "Gold", code: "xauusd" },
      { name: "WTI Crude", code: "cl.f" },
      { name: "Brent", code: "bz.f" }
    ];

    const results = await Promise.all(symbols.map(async item => {
      try {
        const csv = await fetchText(`https://stooq.com/q/l/?s=${item.code}&f=sd2t2ohlcvn&e=csv`);
        const lines = csv.trim().split("\n");
        const headers = lines[0].split(",");
        const values = lines[1]?.split(",") || [];
        const closeIdx = headers.indexOf("Close");
        return {
          name: item.name,
          value: values[closeIdx] || "N/A"
        };
      } catch {
        return { name: item.name, value: "Unavailable" };
      }
    }));

    return results;
  }

  async function fetchBonds() {
    return [
      { name: "US 10Y", value: "Use Treasury/FRED feed" },
      { name: "US 2Y", value: "Use Treasury/FRED feed" },
      { name: "DE 10Y", value: "Add official ECB or market proxy" }
    ];
  }

  window.fetchMarketData = async function fetchMarketData() {
    let fx = fallbackData.fx;
    let commodities = fallbackData.commodities;
    let bonds = fallbackData.bonds;

    try {
      fx = await fetchFX();
      renderGrid("fx-grid", fx, "pair", "value");
      setMeta("fx", "Frankfurter", "Live");
    } catch {
      renderGrid("fx-grid", fx, "pair", "value");
      setMeta("fx", "Fallback", "Demo");
    }

    try {
      commodities = await fetchCommodities();
      renderGrid("commodities-grid", commodities, "name", "value");
      setMeta("commodities", "Stooq", "Delayed");
    } catch {
      renderGrid("commodities-grid", commodities, "name", "value");
      setMeta("commodities", "Fallback", "Demo");
    }

    try {
      bonds = await fetchBonds();
      renderGrid("bonds-grid", bonds, "name", "value");
      setMeta("bonds", "Configured feed", "Delayed");
    } catch {
      renderGrid("bonds-grid", bonds, "name", "value");
      setMeta("bonds", "Fallback", "Demo");
    }

    return { fx, commodities, bonds };
  };
})();
