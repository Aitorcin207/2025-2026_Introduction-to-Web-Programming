// Final project from Aitor Martin Lopez 003355176

let charts = [];
let activeChart = null;
// Used to make the purchases on the porfolio
const purchases = [];

// This initiate the first chart on page load
initChart(document.querySelector(".chart-container canvas"));

//This is the drag and drop setup used for charts
function setupDropzone(container) {
  container.addEventListener("dragover", e => {
    e.preventDefault();
    container.classList.add("dragover");
  });
  container.addEventListener("dragleave", () => container.classList.remove("dragover"));
  container.addEventListener("drop", async e => {
    e.preventDefault();
    container.classList.remove("dragover");
    let payload = {};
    try {
      payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
    } catch (err) {
      console.warn("Invalid drag payload", err);
      return;
    }
    const color = document.getElementById("colorPicker").value;
    const days = getDaysFromRange(document.getElementById("timeRange").value);
    await fetchDataAndAdd(payload, color, days, container.chart);
  });
}

// this function allows to drag objects by activatiing it tactility
function enableTouchDrag() {
  const draggables = document.querySelectorAll("#draggables div");
  // To make each draggable object
  draggables.forEach(el => {
    // For the start of the draging
    el.addEventListener("touchstart", e => {
      const touch = e.touches[0];
      const payload = {
        type: el.dataset.type,
        id: el.dataset.id,
        base: el.dataset.base,
        symbols: el.dataset.symbols,
        symbol: el.dataset.symbol
      };
      // This is for storing the crypto that is being dragged
      el.dataset.dragPayload = JSON.stringify(payload);
      const ghost = el.cloneNode(true);
      ghost.style.position = "fixed";
      ghost.style.opacity = "0.7";
      ghost.style.left = touch.pageX + "px";
      ghost.style.top = touch.pageY + "px";
      ghost.id = "ghost-drag";
      document.body.appendChild(ghost);
    });
    // To make it move the draggable objects
    el.addEventListener("touchmove", e => {
      const ghost = document.getElementById("ghost-drag");
      if (ghost) {
        const touch = e.touches[0];
        ghost.style.left = touch.pageX + "px";
        ghost.style.top = touch.pageY + "px";
      }
    });
    // To be posible to drop the draggable objects
    el.addEventListener("touchend", e => {
      const ghost = document.getElementById("ghost-drag");
      if (ghost) ghost.remove();

      const touch = e.changedTouches[0];
      const dropzone = document.elementFromPoint(touch.clientX, touch.clientY)?.closest(".dropzone");
      if (dropzone) {
        const payload = JSON.parse(el.dataset.dragPayload);
        const color = document.getElementById("colorPicker").value;
        const days = getDaysFromRange(document.getElementById("timeRange").value);
        fetchDataAndAdd(payload, color, days, dropzone.chart);
      }
    });
  });
}

// Activate the Drag & Drop function
enableTouchDrag();

// This are the time ranges used for the chart
function getDaysFromRange(val) {
  switch (val) {
    case "1": return 1;
    case "3": return 3;
    case "7": return 7;
    case "30": return 30;
    case "90": return 90;
    case "365": return 365;
    case "3650": return 3650;
    case "max": return "max";
    default: return parseInt(val, 10) || 30;
  }
}

// This is the function about the drag & drop data transfer
document.querySelectorAll("#draggables div").forEach(el => {
  el.addEventListener("dragstart", e => {
    const payload = {
      type: el.dataset.type,
      id: el.dataset.id,
      base: el.dataset.base,
      symbols: el.dataset.symbols,
      symbol: el.dataset.symbol
    };
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
  });
});

// Here we add the function that creates new charts to compare the cryptocurrencies
document.getElementById("addChart").addEventListener("click", () => {
  // Create a new container for the chart
  const section = document.getElementById("chart-area");
  const container = document.createElement("div");
  container.className = "chart-container dropzone";
  // Create the canvas for the new chart
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  section.appendChild(container);
  initChart(canvas);
  setupDropzone(container);
});

// This function initializes and creates the new chart in the canvas
function initChart(canvas) {
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
          showModal(`${dataset.label}<br><strong>${date}</strong><br>Value: ${Number(value).toFixed(4)}`);
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
  charts.push(chart);
  activeChart = chart;
  // The setup of the dropzone used for the drag and drop function
  setupDropzone(canvas.parentElement);
  // The chart is activated when its being clicked
  canvas.addEventListener("pointerdown", () => activeChart = chart);
}

// This function make able to Fetch & route the data obtained from the APIs(it is async to make the fetch without failing)
async function fetchDataAndAdd(payload, color, days, chart) {
  try {
    // Use the active chart
    if (!chart) chart = activeChart;
    // Calling the function depending on the type of data we need to fetch
    if (payload.type === "crypto") {
      await addCrypto(payload.id, color, days, chart);

    } else if (payload.type === "metal") {

    } else {
      console.warn("Unknown payload type", payload);
    }
    mergeDataExample(chart);
  // Error in fetching data
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// This function fetches the data from CoinGecko API and adds it to the chart with the caracteristics selected by the web user
async function addCrypto(coinId, color, days, chart) {
  try {
    const daysParam = (days === "max") ? "max" : Math.max(1, days);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}`;
    const res = await fetch(url);
    // Check for some errors in the web request
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    // Check if data.prices exists and has the data we need
    if (!data.prices || !data.prices.length) {
      console.warn("No price data for", coinId);
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
  } catch (err) {
    console.error("addCrypto error:", err);
  }
}

// This function tries to merge the data from two cryptos and use the currency EUR(does not work properly)
// function mergeDataExample(chart) {
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

// This function handles the modal used when clicking on data points of the charts
const modal = document.getElementById("infoModal");
const modalBody = document.getElementById("modalBody");
const closeBtn = document.querySelector(".close");
// Show the modal with the info of the data point in html
function showModal(html) {
  modalBody.innerHTML = html;
  modal.style.display = "block";
}
// Close modal events when the user clicks
if (closeBtn) closeBtn.onclick = () => (modal.style.display = "none");
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// Function used for download button to work
document.getElementById("download").addEventListener("click", () => {
  // Download the active chart that is being used as a PNG
  if (!activeChart) return;
  const link = document.createElement("a");
  link.href = activeChart.toBase64Image();
  link.download = "chart.png";
  link.click();
});

// Function used for share button to work
document.getElementById("share").addEventListener("click", async () => {
  // Share the active chart that is being used
  if (!activeChart) return;
  try {
    const dataUrl = activeChart.toBase64Image();
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "chart.png", { type: blob.type });
    // Use Web Share API if it is available
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "My chart",
        text: "Chart from Money & Crypto Portal",
        files: [file]
      });
    } else {
      const w = window.open();
      w.document.write(`<img src="${dataUrl}" alt="chart"><p>Right-click -> Save image or upload to social media</p>`);
    }
  // Error in the sharing process
  } catch (err) {
    console.error("Share failed", err);
    alert("Share not supported in this browser — opening image tab.");
    const w = window.open();
    w.document.write(`<img src="${activeChart.toBase64Image()}" alt="chart">`);
  }
});

// This function allows to change the time range used in the chats
document.getElementById("timeRange").addEventListener("change", async () => {
  const newDays = getDaysFromRange(document.getElementById("timeRange").value);
  // For each of the charts that is being used we need to fetch again the data in the new time range
  for (const chart of charts) {
    const datasets = [...chart.data.datasets];
    chart.data.datasets = [];
    chart.data.labels = [];
    // We need to re-fetch the data for each of the datasets used in the chart
    for (const ds of datasets) {
      const label = ds.label || "";
      // Determine if it is a crypto or other type of data
      if (label.includes("(USD)") && !label.includes("/")) {
        const coinId = label.split(" ")[0];
        await addCrypto(coinId, ds.borderColor || "#000", newDays, chart);
      // Other types of data
      } else {
        const coinId = label.split(" ")[0];
        await addCrypto(coinId, ds.borderColor || "#000", newDays, chart);
      }
    }
  }
});

// This function allows the porfolio of the user to work to make able the use to 
// search(or make a supposition og buying) in the purchases
document.getElementById("buyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  // Get the values inserted from the user
  const coin = document.getElementById("buyCoin").value.trim();
  const date = document.getElementById("buyDate").value;
  const amount = parseFloat(document.getElementById("buyAmount").value);
  // Validate the inputs entered by the user
  if (!coin || !date || !amount || amount <= 0) {
    alert("Please enter valid coin id, date and amount.");
    return;
  }
  // Add the purchase done to the "portfolio"
  purchases.push({ coin, date, amount });
  await updatePortfolioSummary();
  document.getElementById("buyForm").reset();
});

// This function is an asyncronate one that updates the portfolio accordingly to the purchases that have been made
async function updatePortfolioSummary() {
  // Summary of the portfolio displayed for the user
  const container = document.getElementById("portfolioSummary");
  container.innerHTML = "<em>Calculating...</em>";
  const summary = [];
  // The initial total value of the portfolio
  let totalCurrentValue = 0;
  // For each of the purchases made we need to fetch the data we get to calcule the benefit/loses from CoinGecko API
  for (const p of purchases) {
    // This get the value of the coin at the current time inserted by the user(if it is valid)
    try {
      // Use the API to get the data
      const histUrl = `https://api.coingecko.com/api/v3/coins/${p.coin}/history?date=${formatDateForCG(p.date)}`;
      const histRes = await fetch(histUrl);
      // Check if the values given by the user are considered to be valid
      if (!histRes.ok) throw new Error(histRes.status);
      const histData = await histRes.json();
      const boughtPrice = histData.market_data && histData.market_data.current_price && histData.market_data.current_price.usd;
      // Gets the value of the coin at the specific time date
      const curUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${p.coin}&vs_currencies=usd`;
      const curRes = await fetch(curUrl);
      const curData = await curRes.json();
      const currentPrice = curData[p.coin] && curData[p.coin].usd;
      // If the data is not complete the summary its not done
      if (boughtPrice == null || currentPrice == null) {
        summary.push(`${p.coin} — data missing`);
        continue;
      }
      // Calculate with the amout invested the value and the percentage of benefit/losses
      const invested = boughtPrice * p.amount;
      // The value of the coin now
      const currentValue = currentPrice * p.amount;
      totalCurrentValue += currentValue;
      const pct = ((currentValue - invested) / invested) * 100;
      let rec = "Hold";
      // The recommendations that are given to the user depending on the percentage obtained
      if (pct > 5) rec = "Consider selling (profit > 5%)";
      else if (pct < -5) rec = "Consider buying more (drop > 5%)";
      summary.push(`${p.coin} bought ${p.amount} @ ${boughtPrice.toFixed(2)} USD on ${p.date} → current ${currentPrice.toFixed(2)} USD → value ${currentValue.toFixed(2)} USD (${pct.toFixed(2)}%). Recommendation: ${rec}`);
    // Error in the fetching of the data that is going to be used for the portfolio item
    } catch (err) {
      console.error("Portfolio item failed", err);
      summary.push(`${p.coin} — failed to fetch data`);
    }
  }
  // Now we update the porfolio with the new data added and obtained
  container.innerHTML = `<strong>Portfolio</strong><br>${summary.join("<br>")}<br><strong>Total current value:</strong> ${totalCurrentValue.toFixed(2)} USD`;
}

// This is the chart of the currencies exchanges(not the crypto ones)
let fxChart;

// This initializes the exchange currencies chart(second one)
function initFXChart() {
  // Get the place in the canvas where the chart is going to be(I put it in the down part of the page)
  const ctx = document.getElementById("fxChart").getContext("2d");
  // Create the chart object
  fxChart = new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // To being able to interact with the points of the chart
      interaction: { mode: "nearest", intersect: false },
      onClick: (e, elements) => {
        // This shows the modal like in the other chart when we click on a data point
        if (elements.length) {
          const el = elements[0];
          const dataset = fxChart.data.datasets[el.datasetIndex];
          const date = fxChart.data.labels[el.index];
          const value = dataset.data[el.index];
          // use the function showModal of befor to shw the info
          showModal(`${dataset.label}<br><strong>${date}</strong><br>Rate: ${Number(value).toFixed(4)}`);
        }
      },
      // The plugins that are being used in the chart
      plugins: {
        title: { display: true, text: "USD ↔ EUR Exchange Rate Over Time" },
        legend: { display: true }
      },

    }
  });
}

// This asyncronate function(to make it work propertly) fetches the data from 
// Frankfurter API to get the exchange values between the currencies
async function fetchUSD_EUR_Frankfurter(days, chart) {
  // This clears the previous data in the chart
  try {
    const end = new Date();
    const start = new Date();
    // Depending on the range of time selected by the user is the day that the fetch data of the chart starts
    // for max it goes up to 10 years back from the current date(the API I used could not get up to 20 years)
    if (days === "max") start.setFullYear(end.getFullYear() - 10);
    // If max it is not selected then it just substracts the number of days selected from the current date
    else start.setDate(end.getDate() - Number(days));

    // This formats the dates to the one of the API used
    const s = start.toISOString().split("T")[0];
    const e = end.toISOString().split("T")[0];

    // To fetch the data from the frankfurter API
    const url = `https://api.frankfurter.app/${s}..${e}?from=USD&to=EUR`;
    const res = await fetch(url);
    // Checks for errors in the request of the web(of the user)
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = await res.json();

    const labels = Object.keys(data.rates).sort();
    const usdToEur = labels.map(d => data.rates[d]?.EUR ?? null);
    const eurToUsd = usdToEur.map(v => (v ? 1 / v : null));

    chart.data.labels = labels;
    chart.data.datasets = [
      {
        label: "USD/EUR",
        data: usdToEur,
        borderColor: "#ff6600",
        fill: false
      },
      {
        label: "EUR/USD",
        data: eurToUsd,
        borderColor: "#00ccff",
        fill: false
      }
    ];
    chart.update();
  } catch (err) {
    console.error("Frankfurter fetch failed:", err);
  }
}

async function loadFXRange(days) {
  fxChart.data.labels = [];
  fxChart.data.datasets = [];
  fxChart.update();
  await fetchUSD_EUR_Frankfurter(days, fxChart);
}

function downloadFXCSV() {
  if (!fxChart || !fxChart.data.labels.length) {
    alert("No data to download yet!");
    return;
  }
  const labels = fxChart.data.labels;
  const datasets = fxChart.data.datasets;
  let csv = "Date," + datasets.map(d => d.label).join(",") + "\n";

  for (let i = 0; i < labels.length; i++) {
    const row = [labels[i], ...datasets.map(d => d.data[i] ?? "")];
    csv += row.join(",") + "\n";
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "usd_eur_exchange.csv";
  a.click();
}

function downloadFXPNG() {
  if (!fxChart) {
    alert("FX chart not ready yet!");
    return;
  }
  const link = document.createElement("a");
  link.href = fxChart.toBase64Image();
  link.download = "usd_eur_exchange.png";
  link.click();
}

window.addEventListener("DOMContentLoaded", () => {
  initFXChart();
  loadFXRange("365");
});



function formatDateForCG(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

let fxCurrentTarget = "EUR";
let fxCurrentDays = "365";

function initFXChart() {
  const ctx = document.getElementById("fxChart").getContext("2d");
  fxChart = new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      onClick: (e, elements) => {
        if (elements.length) {
          const el = elements[0];
          const ds = fxChart.data.datasets[el.datasetIndex];
          const date = fxChart.data.labels[el.index];
          const value = ds.data[el.index];
          showModal(`${ds.label}<br><strong>${date}</strong><br>Rate: ${Number(value).toFixed(6)}`);
        }
      },
      plugins: {
        title: {
          display: true,
          text: () => `USD ↔ ${fxCurrentTarget} Exchange Rate Over Time`
        },
        legend: { display: true }
      },
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Rate" } }
      }
    }
  });
}

function onFXTargetChange() {
  const sel = document.getElementById("fxTargetSelect");
  fxCurrentTarget = sel.value;
  loadFXRange(fxCurrentDays);
}

async function fetchUSDToTarget(days, chart) {
  try {
    const end = new Date();
    const start = new Date();
    if (days === "max") {
      start.setFullYear(end.getFullYear() - 10);
    } else {
      start.setDate(end.getDate() - Number(days));
    }

    const s = start.toISOString().split("T")[0];
    const e = end.toISOString().split("T")[0];

    const url = `https://api.frankfurter.app/${s}..${e}?from=USD&to=${fxCurrentTarget}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Frankfurter fetch error: ${res.status}`);
    const data = await res.json();

    const dates = Object.keys(data.rates).sort();
    const values = dates.map(d => {
      const rec = data.rates[d];
      return rec ? rec[fxCurrentTarget] : null;
    });

    chart.data.labels = dates;
    chart.data.datasets = [
      {
        label: `USD/${fxCurrentTarget}`,
        data: values,
        borderColor: "#ff6600",
        fill: false
      },
      {
        label: `${fxCurrentTarget}/USD`,
        data: values.map(v => (v != null ? 1 / v : null)),
        borderColor: "#00ccff",
        fill: false
      }
    ];
    chart.update();

  } catch (err) {
    console.error("fetchUSDToTarget failed:", err);
  }
}

async function loadFXRange(days) {
  fxCurrentDays = days;
  if (!fxChart) initFXChart();
  fxChart.data.labels = [];
  fxChart.data.datasets = [];
  fxChart.update();
  await fetchUSDToTarget(days, fxChart);
}

function downloadFXCSV() {
  if (!fxChart || !fxChart.data.labels.length) {
    alert("No FX data to download yet!");
    return;
  }
  const labels = fxChart.data.labels;
  const datasets = fxChart.data.datasets;
  let csv = "Date," + datasets.map(d => d.label).join(",") + "\n";
  for (let i = 0; i < labels.length; i++) {
    const row = [labels[i], ...datasets.map(d => (d.data[i] != null ? d.data[i] : ""))];
    csv += row.join(",") + "\n";
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `USD_${fxCurrentTarget}_exchange.csv`;
  a.click();
}
// This function is used to download the chart as a PNG image
function downloadFXPNG() {
  // If the chart has not loaded yet(at the start or when the API saturates) shows an alert
  if (!fxChart) {
    alert("FX chart not ready!");
    return;
  }
  // This is going to be the link of the download of the image
  const link = document.createElement("a");
  // To get the image from the chart
  link.href = fxChart.toBase64Image();
  // And the name of the file
  link.download = `USD_${fxCurrentTarget}_exchange.png`;
  link.click();
}
// Initialize the second chart on the page when this one is open
window.addEventListener("DOMContentLoaded", () => {
  // Uses function for initializing the chart
  initFXChart();
  // maximum one year putted by default
  loadFXRange("365");
});
