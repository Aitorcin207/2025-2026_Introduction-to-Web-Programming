// Final project from Aitor Martin Lopez 003355176

let charts = [];
let activeChart = null;
// Used to make the purchases on the porfolio
const purchases = [];

// This initiate the first chart on page load
initialitate_the_chart(document.querySelector(".chart-container canvas"));

//This is the drag and drop setup used for charts
function Drop_zone(container) {
  container.addEventListener("dragover", e => {
    e.preventDefault();
    container.classList.add("dragover");
  });
  // To make the drag effect disappear when it is leaved outside of the designated dropzone
  container.addEventListener("dragleave", () => container.classList.remove("dragover"));
  container.addEventListener("drop", async e => {
    e.preventDefault();
    container.classList.remove("dragover");
    let payload = {};
    // To being able to parse the data obtained from the drag event
    try {
      payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
    } catch (err) {
      console.warn("Invalid drag payload", err);
      return;
    }
    // The color selected by the user
    const color = document.getElementById("ChangeColor").value;
    const days = time_range_for_charts(document.getElementById("TimeRange").value);
    await fetch_and_add_data(payload, color, days, container.chart);
  });
}

// this function allows to drag objects by activatiing it tactility
function Drag_objects() {
  const cryptosList = document.querySelectorAll("#cryptosList div");
  // To make each draggable object
  cryptosList.forEach(el => {
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
      // This is to create an effect that is going to be used when the dragging
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
      // This is to make the effect of the dragging
      if (ghost) {
        const touch = e.touches[0];
        ghost.style.left = touch.pageX + "px";
        ghost.style.top = touch.pageY + "px";
      }
    });
    // To be posible to drop the draggable objects
    el.addEventListener("touchend", e => {
      const ghost = document.getElementById("ghost-drag");
      // For removing the effect of dragging
      if (ghost) ghost.remove();
      // This is to get the element droppen on to the dropzone
      const touch = e.changedTouches[0];
      const dropzone = document.elementFromPoint(touch.clientX, touch.clientY)?.closest(".dropzone");
      // This is if the place we dropped the object is a valid dropzone we do this
      if (dropzone) {
        const payload = JSON.parse(el.dataset.dragPayload);
        const color = document.getElementById("ChangeColor").value;
        const days = time_range_for_charts(document.getElementById("TimeRange").value);
        // This is the function to fetch the data and add it to this first chart
        fetch_and_add_data(payload, color, days, dropzone.chart);
      }
    });
  });
}

// Activate the Drag & Drop function
Drag_objects();

// This are the time ranges used for the chart
function time_range_for_charts(val) {
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
document.querySelectorAll("#cryptosList div").forEach(el => {
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
document.getElementById("AddChart").addEventListener("click", () => {
  // Create a new container for the chart
  const section = document.getElementById("CryptoChart");
  const container = document.createElement("div");
  container.className = "chart-container dropzone";
  // Create the canvas for the new chart
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  section.appendChild(container);
  initialitate_the_chart(canvas);
  Drop_zone(container);
});

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
  charts.push(chart);
  activeChart = chart;
  // The setup of the dropzone used for the drag and drop function
  Drop_zone(canvas.parentElement);
  // The chart is activated when its being clicked
  canvas.addEventListener("pointerdown", () => activeChart = chart);
}

// This function make able to Fetch & route the data obtained from the APIs(it is async to make the fetch without failing)
async function fetch_and_add_data(payload, color, days, chart) {
  try {
    // Use the active chart
    if (!chart) chart = activeChart;
    // Calling the function depending on the type of data we need to fetch
    if (payload.type === "crypto") {
      await add_new_cryto(payload.id, color, days, chart);

    } else if (payload.type === "metal") {

    } else {
      console.warn("Unknown payload type", payload);
    }

  // Error in fetching data
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// This function fetches the data from CoinGecko API and adds it to the chart with the caracteristics selected by the web user
async function add_new_cryto(coinId, color, days, chart) {
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
    console.error("add_new_cryto error:", err);
  }
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

// This function handles the modal used when clicking on data points of the charts
const modal = document.getElementById("infoModal");
const moreinfo = document.getElementById("moreinfo");
const closeBtn = document.querySelector(".close");
// Show the modal with the info of the data point in html
function show_more_info(html) {
  moreinfo.innerHTML = html;
  modal.style.display = "block";
}
// Close modal events when the user clicks
if (closeBtn) closeBtn.onclick = () => (modal.style.display = "none");
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// Function used for download button to work
document.getElementById("DownloadPNG").addEventListener("click", () => {
  // Download the active chart that is being used as a PNG
  if (!activeChart) return;
  const link = document.createElement("a");
  link.href = activeChart.toBase64Image();
  link.download = "chart.png";
  link.click();
});

// Function used for share button to work
document.getElementById("shareCrypto").addEventListener("click", async () => {
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
document.getElementById("TimeRange").addEventListener("change", async () => {
  const newDays = time_range_for_charts(document.getElementById("TimeRange").value);
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
        await add_new_cryto(coinId, ds.borderColor || "#000", newDays, chart);
      // Other types of data
      } else {
        const coinId = label.split(" ")[0];
        await add_new_cryto(coinId, ds.borderColor || "#000", newDays, chart);
      }
    }
  }
});

// This function allows the porfolio of the user to work to make able the use to 
// search(or make a supposition og buying) in the purchases
document.getElementById("BuyCrypto").addEventListener("submit", async (e) => {
  e.preventDefault();
  // Get the values inserted from the user
  const coin = document.getElementById("TypeofCoin").value.trim();
  const date = document.getElementById("DateofBuy").value;
  const amount = parseFloat(document.getElementById("TotalAmount").value);
  // Validate the inputs entered by the user
  if (!coin || !date || !amount || amount <= 0) {
    alert("Please enter valid coin id, date and amount.");
    return;
  }
  // Add the purchase done to the "portfolio"
  purchases.push({ coin, date, amount });
  await porfolio_for_purchases();
  document.getElementById("BuyCrypto").reset();
});

// This function is an asyncronate one that updates the portfolio accordingly to the purchases that have been made
async function porfolio_for_purchases() {
  // Summary of the portfolio displayed for the user
  const container = document.getElementById("InformationBuy");
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
// The current target currency that is being used at starting the web
let fxCurrentTarget = "EUR";
// The current amount of time used at the starting of the web
let fxCurrentDays = "365";

// This function is used to initialize the second chart(the exchange currencies one)
function Exchange_currencies_chart() {
  // First create the chart object in the canvas
  const ctx = document.getElementById("fxChart").getContext("2d");
  // This is the chart configuration that will be in the web
  fxChart = new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      // To allow the interaction of the data points like in the crypto chart
      onClick: (e, elements) => {
        // To check if the user clicks the data points
        if (elements.length) {
          const el = elements[0];
          const ds = fxChart.data.datasets[el.datasetIndex];
          const date = fxChart.data.labels[el.index];
          const value = ds.data[el.index];
          // To use the modal function of before to show the info of the data points clicked
          show_more_info(`${ds.label}<br><strong>${date}</strong><br>Rate: ${Number(value).toFixed(6)}`);
        }
      },
      // the plugins used in this chart
      plugins: {
        title: {
          display: true,
          text: () => `USD ↔ ${fxCurrentTarget} Exchange Rate Over Time`
        },
        // The legend fo the chart
        legend: { display: true }
      },
      // the scale depending on the time range that being selected
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Rate" } }
      }
    }
  });
}
// This is the function that allows to change the currency that is being compared 
// with the USD(The API used the dollar as base currency so I have to use that)
function change_comparison_USD() {
  // to get the currency selecte by the user
  const sel = document.getElementById("fxTargetSelect");
  fxCurrentTarget = sel.value;
  // Function to load the data of the new used currency
  load_new_currencies(fxCurrentDays);
}
// This function uses the API of Frankfurter to fetch the values of the exchange currencies
async function values_comparison_USD(days, chart) {
  // First we clear the data of the last time range used
  try {
    const end = new Date();
    const start = new Date();
    // To set the start date depending on the time range selected by the user
    // If max is selected the chart will show from 10 years befor the day used
    // (the API used ddoes not allow me to make the range up to 20 years)
    if (days === "max") {
      start.setFullYear(end.getFullYear() - 10);
    // if selected any other time range that max we use that amount of time
    } else {
      start.setDate(end.getDate() - Number(days));
    }
    // We change the format of tha date used to coincide with the ones used by the API
    const s = start.toISOString().split("T")[0];
    const e = end.toISOString().split("T")[0];
    // This is the URL of the API used to ge the data of the exchange currencies
    const url = `https://api.frankfurter.app/${s}..${e}?from=USD&to=${fxCurrentTarget}`;
    // sometimes it saturates
    const res = await fetch(url);
    // We check for errors in the fetch request
    if (!res.ok) throw new Error(`Frankfurter fetch error: ${res.status}`);
    const data = await res.json();
    // Process the data to get the values with its dates
    const dates = Object.keys(data.rates).sort();
    const values = dates.map(d => {
      const rec = data.rates[d];
      // We return the value of the target currency obtained from the fetched data
      return rec ? rec[fxCurrentTarget] : null;
    });
    // We update the chart with the new data that we obtained
    chart.data.labels = dates;
    chart.data.datasets = [
      {
        // the USD currency used as base against the target currency selected
        label: `USD/${fxCurrentTarget}`,
        data: values,
        borderColor: "#00ff99ff",

      },
      {
        // The target currency selected by the user against the USD
        label: `${fxCurrentTarget}/USD`,
        data: values.map(v => (v != null ? 1 / v : null)),
        borderColor: "#0095ffff",

      }
    ];
    chart.update();
  // Error when fetching the exchange of the currency data
  } catch (err) {
    console.error("values_comparison_USD failed:", err);
  }
}
// This asyncronate function is to load the data of the exchange currencies
// depending on the time range that has been selected by the user
async function load_new_currencies(days) {
  fxCurrentDays = days;
  // To initialize the chart if needed
  if (!fxChart) Exchange_currencies_chart();
  fxChart.data.labels = [];
  fxChart.data.datasets = [];
  // To update the chart with the new data
  fxChart.update();
  await values_comparison_USD(days, fxChart);
}
// This function is used to being able to download the data as a CSV file is the user wants
function download_charts_CSV() {
  // If the chart has not loaded yet(at the start or when the API saturates) shows an alert
  if (!fxChart || !fxChart.data.labels.length) {
    alert("No FX data to download yet!");
    return;
  }
  // This const will store the CSV data that is going to be downloaded from the chart
  const labels = fxChart.data.labels;
  const datasets = fxChart.data.datasets;
  // Creates the CSV string with the data obtained from the chart
  let csv = "Date," + datasets.map(d => d.label).join(",") + "\n";
  // For each one of the dates we make a new row with the data
  for (let i = 0; i < labels.length; i++) {
    const row = [labels[i], ...datasets.map(d => (d.data[i] != null ? d.data[i] : ""))];
    csv += row.join(",") + "\n";
  }
  // This is to create the CSV file and download it
  const blob = new Blob([csv], { type: "text/csv" });
  // And the name of the file
  const a = document.createElement("a");
  // This is the link used for the download
  a.href = URL.createObjectURL(blob);
  a.download = `USD_${fxCurrentTarget}_exchange.csv`;
  a.click();
}
// This function is used to download the chart as a PNG image
function download_charts_PNG() {
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
  Exchange_currencies_chart();
  // maximum one year putted by default
  load_new_currencies("365");
});
// This function is used to format the date to the format used by CoinGecko API(dd-mm-yyyy)
function formatDateForCG(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}