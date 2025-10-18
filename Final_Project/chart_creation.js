// Final project from Aitor Martin Lopez 003355176

// This function initializes and creates the new chart in the canvas
function initialitate_the_chart(canvas) {
  // Creates the chart object
  const chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      // To make possible to interact with the chart points
      onClick: (e, elements) => {
        if (elements.length) {
          const el = elements[0];
          const dataset = chart.data.datasets[el.datasetIndex];
          const value = dataset.data[el.index];
          const date = chart.data.labels[el.index];
          // The function used to show the modal
          show_more_info(`${dataset.label}<br><strong>${date}</strong><br>Value: ${Number(value).toFixed(4)}`);
        }
      },
      // The plugins that are being used in the chart
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Value" } }
      }
    }
  });
  // This is used to link the chart with its own container
  canvas.parentElement.chart = chart;
  graph.push(chart);
  activeGraph = chart;
  // The setup of the dropzone used for the drag and drop function
  Drop_zone(canvas.parentElement);
  // The chart is activated when its being clicked
  canvas.addEventListener("pointerdown", () => activeGraph = chart);
}

// This function tries to merge the data from two cryptos and use the currency EUR(does not work properly)
// function combine_data_cryptos(chart) {
//   const btcUSD = chart.data.datasets.find(d => d.label?.includes("bitcoin (USD)"));
//   const usdEUR = chart.data.datasets.find(d => d.label?.includes("USD/EUR"));
//   if (btcUSD && usdEUR && !chart.data.datasets.find(d => d.label?.includes("bitcoin (EUR)"))) {
//     const minLen = Math.min(btcUSD.data.length, usdEUR.data.length);
//     if (minLen <= 0) return;
//     const merged = btcUSD.data.slice(0, minLen).map((v, i) => v * usdEUR.data[i]);
//     chart.data.datasets.push({
//       label: "bitcoin (EUR)",
//       data: merged,
//       borderColor: "#008000",
//       borderDash: [5, 5],
//       fill: false
//     });
//     chart.update();
//   }
// }

// This function fetches the data from CoinGecko API and adds it to the chart with the caracteristics selected by the web user
async function add_new_cryto(coinId, color, times, chart) {
  try {
    const daysParam = (times === "max") ? "max" : Math.max(1, times);
    const frankfurter = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}`;
    const res = await fetch(frankfurter);
    // Check for some errors in the web request
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    // Check if data.prices exists and has the data we need
    if (!data.prices || !data.prices.length) {
      console.warn("There is not price data for:", coinId);
      return;
    }
    // This function allows to map the data to the format that we need for Chart.js
    const labels = data.prices.map(p => {
      const d = new Date(p[0]);
      return d.toISOString().split("T")[0];
    });
    // This gives you the prices you obtained from the fetched data
    const prices = data.prices.map(p => p[1]);
    chart.data.labels = labels;
    // Adding a new dataset to the chart with the data that have been obtain with the fetch
    chart.data.datasets.push({
      label: `${coinId} (USD)`,
      data: prices,
      borderColor: color,
      fill: false
    });
    chart.update();
  } 
  // Error in adding new crypto to the chart
  catch (err) {
    console.error("There has been an error in add_new_cryto:", err);
  }
}
// This are the time ranges used for the chart
function time_range_for_charts(timeval) {
  switch (timeval) {
    case "1": return 1;
    case "3": return 3;
    case "7": return 7;
    case "30": return 30;
    case "90": return 90;
    case "365": return 365;
    case "3650": return 3650;
    case "max": return "max";
    default: return parseInt(timeval, 10) || 30;
  }
}
// This function make able to Fetch & route the data obtained from the APIs(it is async to make the fetch without failing)
async function fetch_and_add_data(load4, color, times, chart) {
  try {
    // Use the active chart
    if (!chart) chart = activeGraph;
    // Calling the function depending on the type of data we need to fetch
    if (load4.type === "crypto") {
      await add_new_cryto(load4.id, color, times, chart);

    } else if (load4.type === "metal") {

    }

  // Error in fetching data
  } catch (err) {
    console.error("There has been an error in the fetching:", err);
  }
}
