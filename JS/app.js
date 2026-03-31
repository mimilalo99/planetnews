/**
 * app.js — Planet News orchestrator
 *
 * Responsibilities:
 *  1. Theme toggle
 *  2. Waitlist form
 *  3. Boot all data modules (clock, market data, econ calendar)
 *  4. Populate hero panel from fetched data
 *  5. Auto-refresh market data every 5 minutes
 */

(function () {

  /* ─── Theme toggle ─────────────────────────────────────────────────── */
  function initThemeToggle() {
    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const root = document.documentElement;
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
    });
  }

  /* ─── Waitlist form ─────────────────────────────────────────────────── */
  function initWaitlistForm() {
    const form = document.querySelector(".waitlist-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input[type='email']");
      const email = input ? input.value.trim() : "";
      if (!email) {
        alert("Please enter a valid email address.");
        return;
      }
      alert(`Thanks — ${email} has been added to the waitlist.`);
      form.reset();
    });
  }

  /* ─── Hero panel helpers ─────────────────────────────────────────────── */
  function updateHeroMarketStatus() {
    const el = document.getElementById("hero-market-status");
    if (!el) return;

    // Read rendered clock cards to determine open/closed
    const openCards = document.querySelectorAll("#clock-grid .status-live");
    if (openCards.length > 0) {
      el.textContent = `${openCards.length} session${openCards.length > 1 ? "s" : ""} open`;
      el.style.color = "var(--success)";
    } else {
      el.textContent = "All sessions closed";
      el.style.color = "var(--text-muted)";
    }
  }

  function updateHeroPanel(marketData) {
    if (!marketData) return;

    // WTI crude
    const wtiEl = document.getElementById("hero-wti");
    if (wtiEl && marketData.commodities) {
      const wti = marketData.commodities.find(
        (c) => c.name === "WTI Crude" || c.name === "WTI"
      );
      if (wti && wti.value && wti.value !== "Fallback only" && wti.value !== "Unavailable") {
        const num = parseFloat(wti.value);
        wtiEl.textContent = isNaN(num) ? wti.value : `$${num.toFixed(2)}`;
      } else {
        wtiEl.textContent = "N/A";
      }
    }

    // EUR/USD
    const eurusdEl = document.getElementById("hero-eurusd");
    if (eurusdEl && marketData.fx) {
      const eurusd = marketData.fx.find(
        (f) => f.pair === "EUR/USD" || f.pair === "EURUSD"
      );
      if (eurusd && eurusd.value && eurusd.value !== "Fallback only") {
        const num = parseFloat(eurusd.value);
        eurusdEl.textContent = isNaN(num) ? eurusd.value : num.toFixed(4);
      } else {
        eurusdEl.textContent = "N/A";
      }
    }

    // Hero "next release" — pull first calendar item title if available
    const nextEl = document.getElementById("hero-next-release");
    if (nextEl && marketData.nextRelease) {
      nextEl.textContent = marketData.nextRelease;
    } else if (nextEl && nextEl.textContent === "Loading…") {
      nextEl.textContent = "See calendar ↓";
    }

    // Hero updated timestamp
    const updatedEl = document.getElementById("hero-updated");
    if (updatedEl) updatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
  }

  /* ─── Main init ─────────────────────────────────────────────────────── */
  async function init() {
    // 1. Market clock — purely browser-based, renders instantly
    if (typeof initMarketClock === "function") {
      initMarketClock();
    }
    // Hero market-status reads from clock DOM — give one tick to render
    setTimeout(updateHeroMarketStatus, 50);

    // 2 & 3. Fire market data AND economic calendar IN PARALLEL
    //    Neither waits for the other — whichever finishes first updates the UI
    const [marketResult, econResult] = await Promise.allSettled([
      (async () => {
        const data = await fetchMarketData();
        updateHeroPanel(data);
        return data;
      })(),
      fetchEconomicData(),
    ]);

    if (marketResult.status === "rejected") {
      console.warn("[Planet News] Market data error:", marketResult.reason);
      const wtiEl    = document.getElementById("hero-wti");
      const eurusdEl = document.getElementById("hero-eurusd");
      if (wtiEl)    wtiEl.textContent    = "N/A";
      if (eurusdEl) eurusdEl.textContent = "N/A";
    }

    if (econResult.status === "rejected") {
      console.warn("[Planet News] Economic data error:", econResult.reason);
    }
  }

  /* ─── Auto-refresh market data every 5 minutes ──────────────────────── */
  function startAutoRefresh() {
    const FIVE_MIN = 5 * 60 * 1000;

    setInterval(async () => {
      try {
        const marketData = await fetchMarketData();
        updateHeroPanel(marketData);
        updateHeroMarketStatus();
      } catch (err) {
        console.warn("[Planet News] Auto-refresh error:", err);
      }
    }, FIVE_MIN);

    // Also refresh economic data every 30 minutes
    setInterval(async () => {
      try {
        await fetchEconomicData();
      } catch (err) {
        console.warn("[Planet News] Economic auto-refresh error:", err);
      }
    }, 30 * 60 * 1000);
  }

  /* ─── Boot ──────────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initWaitlistForm();
    init();
    startAutoRefresh();
  });

})();
