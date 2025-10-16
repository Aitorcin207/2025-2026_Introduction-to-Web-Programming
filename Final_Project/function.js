// Maintain all charts
let charts = [];
let activeChart = null;

// --- Initialize first chart ---
initChart(document.querySelector(".chart-container canvas"));

// --- Drag & Drop setup ---
function setupDropzone(container) {
  container.addEventListener("dragover", e => {
    e.preventDefault();
    container.classList.add("dragover");
  });
  container.addEventListener("dragleave", () => container.classList.remove("dragover"));
  container.addEventListener("drop", async e => {
    e.preventDefault();
    container.classList.remove("dragover");
    const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
    const color = document.getElementById("colorPicker").value;
    const days = getDaysFromRange(document.getElementById("timeRange").value);
    await fetchDataAndAdd(data, color, days, container.chart);
  });
}

// --- Helper to interpret time range ---
function getDaysFromRange(val) {
  switch (val) {
    case "1": return 1;
    case "3": return 3;
    case "15": return 15;
    case "180": return 180; // 6 months
    case "730": return 730; // 2 years
    case "1825": return 1825; // 5 years
    case "3650": return 3650; // 10 years
    default: return parseInt(val); // fallback for existing numeric options
  }
}

// Draggable items
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

// --- Add new chart button ---
document.getElementById("addChart").addEventListener("click", () => {
  const section = document.getElementById("chart-area");
  const container = document.createElement("div");
  container.className = "chart-container dropzone";
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  section.appendChild(container);
  initChart(canvas);
  setupDropzone(container);
});

// --- Initialize chart instance ---
function initChart(canvas) {
  const chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      onClick: (e, elements) => {
        if (elements.length) {
          const el = elements[0];
          const dataset = chart.data.datasets[el.datasetIndex];
          const value = dataset.data[el.index];
          const date = chart.data.labels[el.index];
          showModal(`${dataset.label}<br><strong>${date}</strong><br>Value: ${value.toFixed(4)}`);
        }
      },
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Value" } }
      }
    }
  });
  canvas.parentElement.chart = chart;
  charts.push(chart);
  activeChart = chart;
  setupDropzone(canvas.parentElement);
}

// --- Fetch data ---
async function fetchDataAndAdd(payload, color, days, chart) {
  try {
    if (payload.type === "crypto") {
      await addCrypto(payload.id, color, days, chart);
    } else if (payload.type === "fx") {
      await addFX(payload.base, payload.symbols, color, days, chart);
    } else if (payload.type === "metal") {
      await addMetal(payload.symbol, color, days, chart);
    }
    mergeDataExample(chart);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// --- Crypto API (CoinGecko) ---
async function addCrypto(coinId, color, days, chart) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url);
  const data = await res.json();
  const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString());
  const prices = data.prices.map(p => p[1]);
  chart.data.labels = labels;
  chart.data.datasets.push({
    label: `${coinId} (USD)`,
    data: prices,
    borderColor: color,
    fill: false
  });
  chart.update();
}

// --- FX API (exchangerate.host) — real data only, no simulation ---
async function addFX(base, symbols, color, days, chart) {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const s = start.toISOString().split("T")[0];
    const e = end.toISOString().split("T")[0];
    const url = `https://api.exchangerate.host/timeseries?base=${base}&symbols=${symbols}&start_date=${s}&end_date=${e}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || !data.rates) {
      console.warn(`No FX data for ${base}/${symbols} in selected range.`);
      return;
    }

    const labels = Object.keys(data.rates).sort();
    const values = labels.map(d => data.rates[d][symbols]);

    // only add if there’s valid data
    if (values.length > 0) {
      chart.data.labels = labels;
      chart.data.datasets.push({
        label: `${base}/${symbols}`,
        data: values,
        borderColor: color,
        fill: false
      });
      chart.update();
    } else {
      console.warn(`Empty FX response for ${base}/${symbols}`);
    }
  } catch (err) {
    console.error(`FX fetch failed for ${base}/${symbols}:`, err);
  }
}


// --- Metal API (Metals.dev) ---
// --- Metal API (Metals.dev) — real data only, no simulation ---
async function addMetal(symbol, color, days, chart) {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const s = start.toISOString().split("T")[0];
    const e = end.toISOString().split("T")[0];

    // Metals.dev currently provides latest data and limited history.
    // This uses their historical endpoint if available.
    const url = `https://api.metals.dev/v1/timeseries?api_key=demo&base=USD&symbols=${symbol}&start_date=${s}&end_date=${e}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.rates) {
      console.warn(`No metal data for ${symbol} in selected range.`);
      return;
    }

    const labels = Object.keys(data.rates).sort();
    const values = labels.map(d => data.rates[d][symbol]);

    if (values.length > 0) {
      chart.data.labels = labels;
      chart.data.datasets.push({
        label: `${symbol}/USD`,
        data: values,
        borderColor: color,
        fill: false
      });
      chart.update();
    } else {
      console.warn(`Empty metal response for ${symbol}`);
    }
  } catch (err) {
    console.error(`Metal fetch failed for ${symbol}:`, err);
  }
}


// --- Merge/Combined data example ---
function mergeDataExample(chart) {
  const btc = chart.data.datasets.find(d => d.label.includes("bitcoin"));
  const fx = chart.data.datasets.find(d => d.label.includes("EUR/USD"));
  if (btc && fx && !chart.data.datasets.find(d => d.label.includes("BTC in EUR"))) {
    const minLen = Math.min(btc.data.length, fx.data.length);
    const merged = btc.data.slice(0, minLen).map((v, i) => v / fx.data[i]);
    chart.data.datasets.push({
      label: "bitcoin (EUR)",
      data: merged,
      borderColor: "#008000",
      borderDash: [5, 5],
      fill: false
    });
    chart.update();
  }
}

// --- Modal handling ---
const modal = document.getElementById("infoModal");
const modalBody = document.getElementById("modalBody");
const closeBtn = document.querySelector(".close");

function showModal(html) {
  modalBody.innerHTML = html;
  modal.style.display = "block";
}

closeBtn.onclick = () => (modal.style.display = "none");
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

// --- Download ---
document.getElementById("download").addEventListener("click", () => {
  if (!activeChart) return;
  const link = document.createElement("a");
  link.href = activeChart.toBase64Image();
  link.download = "chart.png";
  link.click();
});

// --- Update all charts dynamically on time range change ---
document.getElementById("timeRange").addEventListener("change", async () => {
  const newDays = getDaysFromRange(document.getElementById("timeRange").value);
  for (const chart of charts) {
    // Re-fetch every dataset for the new range
    const datasets = [...chart.data.datasets];
    chart.data.datasets = [];
    chart.data.labels = [];
    for (const ds of datasets) {
      const [base, symbols] = ds.label.split("/");
      if (ds.label.includes("(USD)") && !ds.label.includes("/")) {
        await addCrypto(base.split(" ")[0], ds.borderColor, newDays, chart);
      } else if (ds.label.includes("/")) {
        if (base === "EUR" || base === "USD") {
          await addFX(base, symbols, ds.borderColor, newDays, chart);
        } else {
          await addMetal(base.replace("(", "").trim(), ds.borderColor, newDays, chart);
        }
      }
    }
  }
});
