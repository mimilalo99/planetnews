window.PlanetCalendar = (() => {
  const fallbackCalendar = {
    source: "Fallback event feed",
    updatedAt: new Date().toLocaleString(),
    status: "Delayed",
    nextRelease: "US CPI - Tomorrow 08:30 ET",
    events: [
      { time: "08:30 ET", title: "US CPI", impact: "High", status: "Upcoming" },
      { time: "10:00 ET", title: "US Consumer Confidence", impact: "Medium", status: "Upcoming" },
      { time: "14:00 ET", title: "FOMC Minutes", impact: "High", status: "Scheduled" }
    ],
    governmentFeed: [
      { source: "Federal Reserve", headline: "Policy statement archive update", status: "Delayed" },
      { source: "ECB", headline: "Speeches and policy release summary", status: "Delayed" },
      { source: "BLS", headline: "Upcoming release schedule", status: "Delayed" }
    ]
  };

  async function init() {
    const data = await fetchCalendarData();
    renderCalendar(data.events);
    renderGovFeed(data.governmentFeed);
    setCalendarMeta(data);
    setGovernmentMeta(data);

    const heroNextRelease = document.getElementById("hero-next-release");
    if (heroNextRelease) {
      heroNextRelease.textContent = data.nextRelease;
    }
  }

  async function fetchCalendarData() {
    try {
      return fallbackCalendar;
    } catch (error) {
      return fallbackCalendar;
    }
  }

  function renderCalendar(events) {
    const target = document.getElementById("calendar-list");
    if (!target) return;

    target.innerHTML = events.map((event) => `
      <div class="data-row">
        <div>
          <strong>${event.title}</strong>
          <div>${event.time}</div>
        </div>
        <div>
          <span class="badge ${impactToBadge(event.impact)}">${event.impact}</span>
        </div>
      </div>
    `).join("");
  }

  function renderGovFeed(items) {
    const target = document.getElementById("gov-feed-list");
    if (!target) return;

    target.innerHTML = items.map((item) => `
      <div class="data-row">
        <div>
          <strong>${item.source}</strong>
          <div>${item.headline}</div>
        </div>
        <div>
          <span class="badge badge-delayed">${item.status}</span>
        </div>
      </div>
    `).join("");
  }

  function setCalendarMeta(data) {
    const source = document.getElementById("calendar-source");
    const updated = document.getElementById("calendar-updated");
    const status = document.getElementById("calendar-status");

    if (source) source.textContent = `Source: ${data.source}`;
    if (updated) updated.textContent = `Last updated: ${data.updatedAt}`;
    if (status) {
      status.textContent = data.status;
      status.className = `badge ${statusToBadge(data.status)}`;
    }
  }

  function setGovernmentMeta(data) {
    const source = document.getElementById("gov-source");
    const updated = document.getElementById("gov-updated");
    const status = document.getElementById("gov-status");

    if (source) source.textContent = `Source: ${data.source}`;
    if (updated) updated.textContent = `Last updated: ${data.updatedAt}`;
    if (status) {
      status.textContent = data.status;
      status.className = `badge ${statusToBadge(data.status)}`;
    }
  }

  function impactToBadge(impact) {
    const value = String(impact).toLowerCase();
    if (value === "high") return "badge-demo";
    if (value === "medium") return "badge-delayed";
    return "badge-live";
  }

  function statusToBadge(status) {
    const normalized = String(status).toLowerCase();
    if (normalized === "live") return "badge-live";
    if (normalized === "delayed") return "badge-delayed";
    return "badge-demo";
  }

  return { init };
})();
