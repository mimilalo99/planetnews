/**
 * market-clock.js — Planet News live market session clock
 *
 * Uses the browser's Intl.DateTimeFormat API to compute local time in each
 * market's timezone — no network request needed.
 * Refreshes every 60 seconds. Exposes: window.initMarketClock()
 */

(function () {

  // Major trading sessions with their local open/close hours (24h decimal)
  const SESSIONS = [
    { name: "Sydney",   tz: "Australia/Sydney",   open: 9,    close: 16    },
    { name: "Tokyo",    tz: "Asia/Tokyo",          open: 9,    close: 15    },
    { name: "London",   tz: "Europe/London",       open: 8,    close: 16.5  },
    { name: "New York", tz: "America/New_York",    open: 9.5,  close: 16    },
  ];

  function getTimeParts(timeZone) {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const hour   = Number(parts.find((p) => p.type === "hour")?.value   || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return { hour, minute, display: fmt.format(now) };
  }

  function isOpen(hour, minute, open, close) {
    const nowVal = hour + minute / 60;
    return nowVal >= open && nowVal < close;
  }

  function renderClock() {
    const container = document.getElementById("clock-grid");
    const updatedEl = document.getElementById("clock-updated");
    if (!container) return;

    container.innerHTML = SESSIONS.map((session) => {
      const t    = getTimeParts(session.tz);
      const open = isOpen(t.hour, t.minute, session.open, session.close);
      return `
        <article class="mini-card">
          <h3>${session.name}</h3>
          <p>${t.display}</p>
          <span class="${open ? "status-live" : "status-delayed"}">
            ${open ? "● Open" : "○ Closed"}
          </span>
        </article>`;
    }).join("");

    if (updatedEl)
      updatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
  }

  window.initMarketClock = function initMarketClock() {
    renderClock();
    // Re-render every 60 seconds
    setInterval(renderClock, 60_000);
  };

})();
