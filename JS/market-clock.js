(function () {
  const sessions = [
    { name: "Sydney", tz: "Australia/Sydney", open: 9, close: 16 },
    { name: "Tokyo", tz: "Asia/Tokyo", open: 9, close: 15 },
    { name: "London", tz: "Europe/London", open: 8, close: 16.5 },
    { name: "New York", tz: "America/New_York", open: 9.5, close: 16 }
  ];

  function getTimeParts(timeZone) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find(p => p.type === "hour")?.value || 0);
    const minute = Number(parts.find(p => p.type === "minute")?.value || 0);
    return { hour, minute, display: formatter.format(now) };
  }

  function isOpen(hour, minute, open, close) {
    const nowVal = hour + minute / 60;
    return nowVal >= open && nowVal < close;
  }

  function renderClock() {
    const container = document.getElementById("clock-grid");
    const updated = document.getElementById("clock-updated");
    const status = document.getElementById("clock-status");
    if (!container) return;

    container.innerHTML = sessions.map(session => {
      const t = getTimeParts(session.tz);
      const open = isOpen(t.hour, t.minute, session.open, session.close);
      return `
        <article class="mini-card">
          <h3>${session.name}</h3>
          <p>${t.display}</p>
          <span class="${open ? "status-live" : "status-delayed"}">
            ${open ? "Open" : "Closed"}
          </span>
        </article>
      `;
    }).join("");

    if (updated) updated.textContent = `Last updated: ${new Date().toLocaleString()}`;
    if (status) status.textContent = "Live";
  }

  window.initMarketClock = function initMarketClock() {
    renderClock();
    setInterval(renderClock, 60000);
  };
})();
