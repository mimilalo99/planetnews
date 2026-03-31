/**
 * econ-calendar.js — Planet News economic calendar & central bank feed
 *
 * Economic calendar: hardcoded links to official BLS / Fed / ECB release
 *   schedules (the most reliable source with no API key needed).
 *
 * Central Bank Updates: fetches the Federal Reserve monetary policy RSS via a
 *   CORS proxy (allorigins.win) and appends ECB press-release RSS entries.
 *   Falls back to curated placeholder items on any network error.
 *
 * Exposes: window.fetchEconomicData()
 */

(function () {

  /* ─── CORS proxy ─────────────────────────────────────────────────── */
  // allorigins.win returns {"contents":"<raw body>","status":{"url":...}}
  function proxyUrl(targetUrl) {
    return `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  }

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
      if (statusText === "Live")         statusEl.classList.add("badge-live");
      else if (statusText === "Delayed") statusEl.classList.add("badge-delayed");
      else                               statusEl.classList.add("badge-demo");
    }
  }

  function renderList(id, items) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!items || items.length === 0) {
      el.innerHTML = `<p class="empty-state">No items to display.</p>`;
      return;
    }
    el.innerHTML = items
      .map(
        (item) => `
        <article class="list-card">
          <h3>${escapeHtml(item.title)}</h3>
          ${item.date ? `<p>${escapeHtml(item.date)}</p>` : ""}
          ${
            item.link && item.link !== "#"
              ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`
              : ""
          }
        </article>`
      )
      .join("");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ─── RSS parser ─────────────────────────────────────────────────── */
  async function parseRssViaProxy(feedUrl) {
    const proxyResp = await fetch(proxyUrl(feedUrl));
    if (!proxyResp.ok) throw new Error(`Proxy HTTP ${proxyResp.status}`);
    const envelope = await proxyResp.json();
    const xmlText  = envelope.contents;
    if (!xmlText) throw new Error("Empty proxy response");

    const xml   = new DOMParser().parseFromString(xmlText, "text/xml");
    const error = xml.querySelector("parsererror");
    if (error) throw new Error("XML parse error");

    return [...xml.querySelectorAll("item")]
      .slice(0, 5)
      .map((item) => ({
        title: item.querySelector("title")?.textContent?.trim() || "Untitled",
        link:  item.querySelector("link")?.textContent?.trim()  || "#",
        date:  item.querySelector("pubDate")?.textContent?.trim()
                 ? new Date(item.querySelector("pubDate").textContent.trim()).toLocaleDateString("en-US", {
                     year: "numeric", month: "short", day: "numeric",
                   })
                 : "",
      }));
  }

  /* ─── Fallback items ─────────────────────────────────────────────── */
  const CALENDAR_FALLBACK = [
    {
      title: "US CPI release schedule",
      date:  "Monthly — Bureau of Labor Statistics",
      link:  "https://www.bls.gov/schedule/news_release/cpi.htm",
    },
    {
      title: "US Employment Situation",
      date:  "Monthly — Bureau of Labor Statistics",
      link:  "https://www.bls.gov/schedule/news_release/empsit.htm",
    },
    {
      title: "FOMC meeting calendar",
      date:  "8× per year — Federal Reserve",
      link:  "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    },
    {
      title: "ECB Governing Council meetings",
      date:  "8× per year — European Central Bank",
      link:  "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
    },
    {
      title: "US GDP advance estimate",
      date:  "Quarterly — Bureau of Economic Analysis",
      link:  "https://www.bea.gov/news/schedule",
    },
  ];

  const GOV_FEED_FALLBACK = [
    {
      title: "Fed press release feed temporarily unavailable",
      date:  "",
      link:  "https://www.federalreserve.gov/feeds/press_monetary.xml",
    },
    {
      title: "ECB press release feed temporarily unavailable",
      date:  "",
      link:  "https://www.ecb.europa.eu/press/pr/date/2025/html/index.en.html",
    },
  ];

  /* ─── Main export ────────────────────────────────────────────────── */
  window.fetchEconomicData = async function fetchEconomicData() {
    let govItems      = [];
    let calendarItems = [];

    /* Central Bank feed */
    try {
      const [fedItems, ecbItems] = await Promise.all([
        parseRssViaProxy("https://www.federalreserve.gov/feeds/press_monetary.xml"),
        parseRssViaProxy("https://www.ecb.europa.eu/rss/pressreleases.rss"),
      ]);
      govItems = [...fedItems.slice(0, 3), ...ecbItems.slice(0, 3)];
      renderList("gov-feed-list", govItems);
      setMeta("gov", "Federal Reserve + ECB", "Live");
    } catch (err) {
      console.warn("[Planet News] Central bank feed error:", err);
      govItems = GOV_FEED_FALLBACK;
      renderList("gov-feed-list", govItems);
      setMeta("gov", "Fallback", "Demo");
    }

    /* Economic calendar — official release-schedule links */
    try {
      calendarItems = CALENDAR_FALLBACK;
      renderList("calendar-list", calendarItems);
      setMeta("calendar", "BLS / Fed / ECB / BEA", "Delayed");
    } catch {
      renderList("calendar-list", [
        { title: "Calendar unavailable", date: "", link: "#" },
      ]);
      setMeta("calendar", "Fallback", "Demo");
    }

    return { govItems, calendarItems };
  };

})();
