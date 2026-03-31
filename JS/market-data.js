window.PlanetMarketData = (() => {
  const fallbackData = {
    source: "Fallback demo data",
    updatedAt: new Date().toLocaleString(),
    status: "Demo",
    commodities: [
      { label: "WTI Crude", value: "78.42", change: "+0.84%" },
      { label: "Brent", value: "82.15", change: "+0.61%" },
      { label: "Gold", value: "2188.30", change: "-0.22%" },
      { label: "Natural Gas", value: "2.14", change: "+1.12%" }
    ],
    fx: [
      { label: "EUR/USD", value: "1.0834", change: "+0.15%" },
      { label: "USD/JPY", value: "149.28", change: "-0.34%" },
      { label: "GBP/USD", value: "1.2716", change: "+0.08%" },
      { label: "USD/CAD", value: "1.3511", change: "-0.18%" }
    ],
    bonds: [
      { label: "US 2Y", value: "4.19%", change: "+2 bps" },
      { label: "US 10Y", value: "4.03%", change: "-1 bp" },
      { label: "Germany 10Y", value: "2.34%", change: "+1 bp" },
      { label: "UK 10Y", value: "4.07%", change: "+3 bps" }
    ]
  };

  async function init() {
    const data = await fetchMarketData();
    renderGroup("commodities-grid", data.commodities);
    renderGroup("fx-grid", data.fx);
    renderGroup("bonds-grid", data.bonds);

    setMeta("commodities", data.source, data.updatedAt, data.status);
    setMeta("fx", data.source, data.updatedAt, data.status);
    setMeta("bonds", data.source, data.updatedAt, data.status);

    updateHeroPreview(data);
  }

  async function fetchMarketData() {
    try {
      return fallbackData;
    } catch (error) {
      return fallbackData;
    }
  }

  function renderGroup(targetId, items) {
    const target = document.getElementById(targetId);
    if (!target) return;

    target.innerHTML = items.map((item) => {
      const direction = getDirection(item.change);
      return `
        <div class="data-item">
          <span class="data-item-label">${item.label}</span>
          <span class="data-item-value">${item.value}</span>
          <span class="data-item-change ${direction}">${item.change}</span>
        </div>
      `;
    }).join("");
  }

  function setMeta(prefix, source, updatedAt, status) {
    const sourceEl = document.getElementById(`${prefix}-source`);
    const updatedEl = document.getElementById(`${prefix}-updated`);
    const statusEl = document.getElementById(`${prefix}-status`);

    if (sourceEl) sourceEl.textContent = `Source: ${source}`;
    if (updatedEl) updatedEl.textContent = `Last updated: ${updatedAt}`;
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.className = `badge ${statusToBadge(status)}`;
    }
  }

  function updateHeroPreview(data) {
    const wti = data.commodities.find((item) => item.label === "WTI Crude");
    const eurusd = data.fx.find((item) => item.label === "EUR/USD");

    const wtiEl = document.getElementById("hero-wti");
    const eurusdEl = document.getElementById("hero-eurusd");

    if (wtiEl && wti) wtiEl.textContent = wti.value;
    if (eurusdEl && eurusd) eurusdEl.textContent = eurusd.value;
  }

  function getDirection(change) {
    if (String(change).trim().startsWith("+")) return "up";
    if (String(change).trim().startsWith("-")) return "down";
    return "flat";
  }

  function statusToBadge(status) {
    const normalized = String(status).toLowerCase();
    if (normalized === "live") return "badge-live";
    if (normalized === "delayed") return "badge-delayed";
    return "badge-demo";
  }

  return { init };
})();
