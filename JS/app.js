document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initWaitlistForm();
  initPageModules();
});

function initThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");
  const root = document.documentElement;

  if (!button) return;

  button.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", nextTheme);
    button.textContent = nextTheme === "dark" ? "Theme" : "Theme";
  });
}

function initWaitlistForm() {
  const form = document.querySelector(".waitlist-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = form.querySelector("input[type='email']");
    if (!email || !email.value.trim()) {
      alert("Please enter your email address.");
      return;
    }

    alert(`Thanks — ${email.value.trim()} has been added to the waitlist preview.`);
    form.reset();
  });
}

async function initPageModules() {
  if (window.PlanetClock && typeof window.PlanetClock.init === "function") {
    window.PlanetClock.init();
  }

  if (window.PlanetMarketData && typeof window.PlanetMarketData.init === "function") {
    await window.PlanetMarketData.init();
  }

  if (window.PlanetCalendar && typeof window.PlanetCalendar.init === "function") {
    await window.PlanetCalendar.init();
  }
}
