let charts = [];
let activeChart = null;

// simple store for purchases
const purchases = [];

// Initialize first chart
initChart(document.querySelector(".chart-container canvas"));

// DRAG & DROP setup
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

function enableTouchDrag() {
  const draggables = document.querySelectorAll("#draggables div");
  draggables.forEach(el => {
    el.addEventListener("touchstart", e => {
      const touch = e.touches[0];
      const payload = {
        type: el.dataset.type,
        id: el.dataset.id,
        base: el.dataset.base,
        symbols: el.dataset.symbols,
        symbol: el.dataset.symbol
      };
      el.dataset.dragPayload = JSON.stringify(payload);
      const ghost = el.cloneNode(true);
      ghost.style.position = "fixed";
      ghost.style.opacity = "0.7";
      ghost.style.left = touch.pageX + "px";
      ghost.style.top = touch.pageY + "px";
      ghost.id = "ghost-drag";
      document.body.appendChild(ghost);
    });

    el.addEventListener("touchmove", e => {
      const ghost = document.getElementById("ghost-drag");
      if (ghost) {
        const touch = e.touches[0];
        ghost.style.left = touch.pageX + "px";
        ghost.style.top = touch.pageY + "px";
      }
    });

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

enableTouchDrag();

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
          showModal(`${dataset.label}<br><strong>${date}</strong><br>Value: ${Number(value).toFixed(4)}`);
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

  canvas.addEventListener("pointerdown", () => activeChart = chart);
}

// Fetch & route
async function fetchDataAndAdd(payload, color, days, chart) {
  try {
    if (!chart) chart = activeChart;
    if (payload.type === "crypto") {
      await addCrypto(payload.id, color, days, chart);
    } else if (payload.type === "fx") {
      await addFX(payload.base, payload.symbols, color, days, chart);
    } else if (payload.type === "metal") {

    } else {
      console.warn("Unknown payload type", payload);
    }
    mergeDataExample(chart);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

async function addCrypto(coinId, color, days, chart) {
  try {
    const daysParam = (days === "max") ? "max" : Math.max(1, days);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    if (!data.prices || !data.prices.length) {
      console.warn("No price data for", coinId);
      return;
    }
    const labels = data.prices.map(p => {
      const d = new Date(p[0]);
      return d.toISOString().split("T")[0];
    });
    const prices = data.prices.map(p => p[1]);
    chart.data.labels = labels;
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

async function addFX(base, symbols, color, days, chart) {
  try {
    let daysNum = (days === "max") ? 365 : Number(days);
    if (!Number.isFinite(daysNum) || daysNum > 365) daysNum = 365;

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysNum);

    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    const url = `https://api.frankfurter.app/${s}..${e}?from=USD&to=EUR`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
    const data = await res.json();

    if (!data.rates || Object.keys(data.rates).length === 0) {
      console.warn(`No FX data for ${base}/${symbols}`);
      return;
    }

    const labels = Object.keys(data.rates).sort();
    const values = labels.map(d => data.rates[d]?.[symbols]).filter(v => v != null);

    if (!values.length) {
      console.warn(`Empty FX values for ${base}/${symbols}`);
      return;
    }

    chart.data.labels = labels;
    chart.data.datasets.push({
      label: `${base}/${symbols}`,
      data: values,
      borderColor: color,
      fill: false
    });
    chart.update();
  } catch (err) {
    console.error(`FX fetch failed for ${base}/${symbols}:`, err);
  }
}

function mergeDataExample(chart) {
  const btcUSD = chart.data.datasets.find(d => d.label?.includes("bitcoin (USD)"));
  const usdEUR = chart.data.datasets.find(d => d.label?.includes("USD/EUR"));
  if (btcUSD && usdEUR && !chart.data.datasets.find(d => d.label?.includes("bitcoin (EUR)"))) {
    const minLen = Math.min(btcUSD.data.length, usdEUR.data.length);
    if (minLen <= 0) return;
    const merged = btcUSD.data.slice(0, minLen).map((v, i) => v * usdEUR.data[i]);
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

// Modal handling
const modal = document.getElementById("infoModal");
const modalBody = document.getElementById("modalBody");
const closeBtn = document.querySelector(".close");
function showModal(html) {
  modalBody.innerHTML = html;
  modal.style.display = "block";
}
if (closeBtn) closeBtn.onclick = () => (modal.style.display = "none");
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// Download
document.getElementById("download").addEventListener("click", () => {
  if (!activeChart) return;
  const link = document.createElement("a");
  link.href = activeChart.toBase64Image();
  link.download = "chart.png";
  link.click();
});

document.getElementById("share").addEventListener("click", async () => {
  if (!activeChart) return;
  try {
    const dataUrl = activeChart.toBase64Image();
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "chart.png", { type: blob.type });

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
  } catch (err) {
    console.error("Share failed", err);
    alert("Share not supported in this browser — opening image tab.");
    const w = window.open();
    w.document.write(`<img src="${activeChart.toBase64Image()}" alt="chart">`);
  }
});

document.getElementById("timeRange").addEventListener("change", async () => {
  const newDays = getDaysFromRange(document.getElementById("timeRange").value);
  for (const chart of charts) {
    const datasets = [...chart.data.datasets];
    chart.data.datasets = [];
    chart.data.labels = [];
    for (const ds of datasets) {
      const label = ds.label || "";
      if (label.includes("(USD)") && !label.includes("/")) {
        const coinId = label.split(" ")[0];
        await addCrypto(coinId, ds.borderColor || "#000", newDays, chart);
      } else if (label.includes("/")) {
        const parts = label.split("/");
        const base = parts[0].trim();
        const symbols = parts[1].trim();
        const allowedDays = (newDays === "max" || Number(newDays) > 365) ? 365 : newDays;
        await addFX(base, symbols, ds.borderColor || "#000", allowedDays, chart);
      } else {
        const coinId = label.split(" ")[0];
        await addCrypto(coinId, ds.borderColor || "#000", newDays, chart);
      }
    }
  }
});

// Purchases
document.getElementById("buyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const coin = document.getElementById("buyCoin").value.trim();
  const date = document.getElementById("buyDate").value;
  const amount = parseFloat(document.getElementById("buyAmount").value);
  if (!coin || !date || !amount || amount <= 0) {
    alert("Please enter valid coin id, date and amount.");
    return;
  }
  purchases.push({ coin, date, amount });
  await updatePortfolioSummary();
  document.getElementById("buyForm").reset();
});

async function updatePortfolioSummary() {
  const container = document.getElementById("portfolioSummary");
  container.innerHTML = "<em>Calculating...</em>";
  const summary = [];
  let totalCurrentValue = 0;
  for (const p of purchases) {
    try {
      const histUrl = `https://api.coingecko.com/api/v3/coins/${p.coin}/history?date=${formatDateForCG(p.date)}`;
      const histRes = await fetch(histUrl);
      if (!histRes.ok) throw new Error(histRes.status);
      const histData = await histRes.json();
      const boughtPrice = histData.market_data && histData.market_data.current_price && histData.market_data.current_price.usd;
      const curUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${p.coin}&vs_currencies=usd`;
      const curRes = await fetch(curUrl);
      const curData = await curRes.json();
      const currentPrice = curData[p.coin] && curData[p.coin].usd;

      if (boughtPrice == null || currentPrice == null) {
        summary.push(`${p.coin} — data missing`);
        continue;
      }
      const invested = boughtPrice * p.amount;
      const currentValue = currentPrice * p.amount;
      totalCurrentValue += currentValue;
      const pct = ((currentValue - invested) / invested) * 100;
      let rec = "Hold";
      if (pct > 5) rec = "Consider selling (profit > 5%)";
      else if (pct < -5) rec = "Consider buying more (drop > 5%)";
      summary.push(`${p.coin} bought ${p.amount} @ ${boughtPrice.toFixed(2)} USD on ${p.date} → current ${currentPrice.toFixed(2)} USD → value ${currentValue.toFixed(2)} USD (${pct.toFixed(2)}%). Recommendation: ${rec}`);
    } catch (err) {
      console.error("Portfolio item failed", err);
      summary.push(`${p.coin} — failed to fetch data`);
    }
  }
  container.innerHTML = `<strong>Portfolio</strong><br>${summary.join("<br>")}<br><strong>Total current value:</strong> ${totalCurrentValue.toFixed(2)} USD`;
}

let fxChart;

// Initialize FX chart
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
          const dataset = fxChart.data.datasets[el.datasetIndex];
          const date = fxChart.data.labels[el.index];
          const value = dataset.data[el.index];
          showModal(`${dataset.label}<br><strong>${date}</strong><br>Rate: ${Number(value).toFixed(4)}`);
        }
      },
      plugins: {
        title: { display: true, text: "USD ↔ EUR Exchange Rate Over Time" },
        legend: { display: true }
      },

    }
  });
}

// Fetch USD↔EUR data via Frankfurter API
async function fetchUSD_EUR_Frankfurter(days, chart) {
  try {
    const end = new Date();
    const start = new Date();

    if (days === "max") start.setFullYear(end.getFullYear() - 10);
    else start.setDate(end.getDate() - Number(days));

    const s = start.toISOString().split("T")[0];
    const e = end.toISOString().split("T")[0];

    const url = `https://api.frankfurter.app/${s}..${e}?from=USD&to=EUR`;
    const res = await fetch(url);
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

function downloadFXPNG() {
  if (!fxChart) {
    alert("FX chart not ready!");
    return;
  }
  const link = document.createElement("a");
  link.href = fxChart.toBase64Image();
  link.download = `USD_${fxCurrentTarget}_exchange.png`;
  link.click();
}

window.addEventListener("DOMContentLoaded", () => {
  initFXChart();
  loadFXRange("365");
});
