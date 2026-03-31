(function () {
  function setMeta(prefix, source, statusText) {
    const sourceEl = document.getElementById(`${prefix}-source`);
    const updatedEl = document.getElementById(`${prefix}-updated`);
    const statusEl = document.getElementById(`${prefix}-status`);

    if (sourceEl) sourceEl.textContent = `Source: ${source}`;
    if (updatedEl) updatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
    if (statusEl) statusEl.textContent = statusText;
  }

  function renderList(id, items) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(item => `
      <article class="list-card">
        <h3>${item.title}</h3>
        <p>${item.date || ""}</p>
        <a href="${item.link}" target="_blank" rel="noopener noreferrer">Open source</a>
      </article>
    `).join("");
  }

  async function parseRss(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("RSS fetch failed");
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const items = [...xml.querySelectorAll("item")].slice(0, 6).map(item => ({
      title: item.querySelector("title")?.textContent?.trim() || "Untitled",
      link: item.querySelector("link")?.textContent?.trim() || "#",
      date: item.querySelector("pubDate")?.textContent?.trim() || ""
    }));
    return items;
  }

  async function fetchFedFeed() {
    return parseRss("https://www.federalreserve.gov/feeds/press_monetary.xml");
  }

  async function fetchECBFeed() {
    return parseRss("https://www.ecb.europa.eu/rss/press.html");
  }

  window.fetchEconomicData = async function fetchEconomicData() {
    let govItems = [];
    let calendarItems = [];

    try {
      const [fed, ecb] = await Promise.all([
        fetchFedFeed(),
        fetchECBFeed()
      ]);

      govItems = [...fed.slice(0, 3), ...ecb.slice(0, 3)];
      renderList("gov-feed-list", govItems);
      setMeta("gov", "Federal Reserve + ECB", "Live");
    } catch {
      govItems = [
        { title: "Official feed unavailable", date: "", link: "#" }
      ];
      renderList("gov-feed-list", govItems);
      setMeta("gov", "Fallback", "Demo");
    }

    try {
      calendarItems = [
        {
          title: "US BLS CPI release",
          date: "Use official BLS calendar link",
          link: "https://www.bls.gov/schedule/news_release/cpi.htm"
        },
        {
          title: "US Employment Situation",
          date: "Use official BLS calendar link",
          link: "https://www.bls.gov/schedule/news_release/empsit.htm"
        },
        {
          title: "FOMC calendar",
          date: "Use official Federal Reserve calendar",
          link: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
        },
        {
          title: "ECB monetary policy meetings",
          date: "Use official ECB calendar",
          link: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html"
        }
      ];

      renderList("calendar-list", calendarItems);
      setMeta("calendar", "Official release calendars", "Delayed");
    } catch {
      renderList("calendar-list", [
        { title: "Calendar unavailable", date: "", link: "#" }
      ]);
      setMeta("calendar", "Fallback", "Demo");
    }

    return { govItems, calendarItems };
  };
})();
