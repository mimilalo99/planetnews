window.PlanetClock = (() => {
  const markets = [
    { name: "New York", timezone: "America/New_York", open: 9, close: 16 },
    { name: "London", timezone: "Europe/London", open: 8, close: 16.5 },
    { name: "Frankfurt", timezone: "Europe/Berlin", open: 9, close: 17.5 },
    { name: "Tokyo", timezone: "Asia/Tokyo", open: 9, close: 15 },
    { name: "Sydney", timezone: "Australia/Sydney", open: 10, close: 16 }
  ];

  let timer = null;

  function init() {
    render();
    timer = setInterval(render, 1000);
  }

  function render() {
    const grid = document.getElementById("clock-grid");
    const updated = document.getElementById("clock-updated");
    const heroStatus = document.getElementById("hero-market-status");

    if (!grid) return;

    grid.innerHTML = markets.map((market) => {
      const now = getZonedDateParts(market.timezone);
      const decimalHour = now.hour + now.minute / 60;
      const isOpen = decimalHour >= market.open && decimalHour < market.close;

      return `
        <div class="data-item">
          <span class="data-item-label">${market.name}</span>
          <span class="data-item-value">${now.time}</span>
          <span class="data-item-change ${isOpen ? "up" : "flat"}">
            ${isOpen ? "Open" : "Closed"}
          </span>
        </div>
      `;
    }).join("");

    const openMarkets = markets.filter((market) => {
      const now = getZonedDateParts(market.timezone);
      const decimalHour = now.hour + now.minute / 60;
      return decimalHour >= market.open && decimalHour < market.close;
    });

    if (heroStatus) {
      heroStatus.textContent = openMarkets.length
        ? `${openMarkets.length} major markets open`
        : "Major markets mostly closed";
    }

    if (updated) {
      updated.textContent = `Last updated: ${new Date().toLocaleString()}`;
    }
  }

  function getZonedDateParts(timezone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

    const parts = formatter.formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
    const second = Number(parts.find((p) => p.type === "second")?.value || 0);

    return {
      hour,
      minute,
      second,
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`
    };
  }

  return { init };
})();
