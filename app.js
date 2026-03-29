document.addEventListener("DOMContentLoaded", async () => {
  initMarketClock();

  try {
    const marketData = await fetchMarketData();
    renderMarketData(marketData);

    const econData = await fetchEconomicData();
    renderEconomicData(econData);
  } catch (error) {
    renderErrorState("Some live data is unavailable right now.");
  }
});
