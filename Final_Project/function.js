// Maintain all charts
let charts = [];
let activeChart = null;

// simple store for purchases (feature 9)
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
    // clamp fx days later if needed
    const days = getDaysFromRange(document.getElementById("timeRange").value);
    await fetchDataAndAdd(payload, color, days, container.chart);
  });
}

// Helper to interpret time range
function getDaysFromRange(val) {
  // normalize known values; return number or 'max' as fallback
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

// Add new chart
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

// Initialize chart
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

  // set active chart on click to enable download/share of the right chart
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
      // unused now
    } else {
      console.warn("Unknown payload type", payload);
    }
    mergeDataExample(chart);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// --- Crypto via CoinGecko (works for tether-gold too) ---
async function addCrypto(coinId, color, days, chart) {
  try {
    // CoinGecko market_chart supports days param: 'max' or number
    const daysParam = (days === "max") ? "max" : Math.max(1, days);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    if (!data.prices || !data.prices.length) {
      console.warn("No price data for", coinId);
      return;
    }
    // normalize labels as YYYY-MM-DD (daily)
    const labels = data.prices.map(p => {
      const d = new Date(p[0]);
      return d.toISOString().split("T")[0];
    });
    // values
    const prices = data.prices.map(p => p[1]);
    // If chart has no labels yet OR labels equal length mismatch, adopt the crypto labels
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

// --- FX via exchangerate.host ---
async function addFX(base, symbols, color, days, chart) {
  try {
    // exchangerate.host free historical time window is limited — avoid huge ranges
    let daysNum = (days === "max") ? 365 : Number(days);
    if (!Number.isFinite(daysNum) || daysNum > 365) {
      console.warn("FX request limited to 365 days (exchangerate.host free). Requested:", days);
      daysNum = 365;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysNum);

    const s = start.toISOString().split("T")[0];
    const e = end.toISOString().split("T")[0];
    // timeseries endpoint
    const url = `https://api.exchangerate.host/timeseries?base=${base}&symbols=${symbols}&start_date=${s}&end_date=${e}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FX fetch ${res.status}`);
    const data = await res.json();

    if (!data.success || !data.rates) {
      console.warn(`No FX data for ${base}/${symbols} in selected range.`);
      return;
    }

    const labels = Object.keys(data.rates).sort();
    const values = labels.map(d => {
      const r = data.rates[d];
      return (r && r[symbols] != null) ? r[symbols] : null;
    }).filter(v => v != null);

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

// --- Merge/Combined data example ---
function mergeDataExample(chart) {
  const btc = chart.data.datasets.find(d => d.label && d.label.includes("bitcoin"));
  const fx = chart.data.datasets.find(d => d.label && d.label.includes("EUR/USD"));
  if (btc && fx && !chart.data.datasets.find(d => d.label && d.label.includes("bitcoin (EUR)"))) {
    const minLen = Math.min(btc.data.length, fx.data.length);
    if (minLen <= 0) return;
    const merged = btc.data.slice(0, minLen).map((v, i) => {
      // align indices (labels may differ) — simple position-based mapping
      return v / fx.data[i];
    });
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

// Share (feature 11) - prefer navigator.share when available
document.getElementById("share").addEventListener("click", async () => {
  if (!activeChart) return;
  try {
    const dataUrl = activeChart.toBase64Image();
    // convert dataURL to blob
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
      // fallback: open image in new tab so user can save or upload manually
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

// Update all charts dynamically on time range change
document.getElementById("timeRange").addEventListener("change", async () => {
  const newDays = getDaysFromRange(document.getElementById("timeRange").value);
  for (const chart of charts) {
    const datasets = [...chart.data.datasets];
    chart.data.datasets = [];
    chart.data.labels = [];
    for (const ds of datasets) {
      // parse label properly
      const label = ds.label || "";
      if (label.includes("(USD)") && !label.includes("/")) {
        // crypto label like "bitcoin (USD)"
        const coinId = label.split(" ")[0];
        await addCrypto(coinId, ds.borderColor || "#000", newDays, chart);
      } else if (label.includes("/")) {
        // FX or similar; consistent format "EUR/USD"
        const parts = label.split("/");
        const base = parts[0].trim();
        const symbols = parts[1].trim();
        // limit FX to <=365 days
        const allowedDays = (newDays === "max" || Number(newDays) > 365) ? 365 : newDays;
        await addFX(base, symbols, ds.borderColor || "#000", allowedDays, chart);
      } else {
        // other fallback: try fetch as crypto id (e.g. tether-gold)
        const coinId = label.split(" ")[0];
        await addCrypto(coinId, ds.borderColor || "#000", newDays, chart);
      }
    }
  }
});

// --- Purchases (Feature 9) ---
document.getElementById("buyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const coin = document.getElementById("buyCoin").value.trim();
  const date = document.getElementById("buyDate").value;
  const amount = parseFloat(document.getElementById("buyAmount").value);
  if (!coin || !date || !amount || amount <= 0) {
    alert("Please enter valid coin id, date and amount.");
    return;
  }
  // Store purchase
  purchases.push({ coin, date, amount });
  await updatePortfolioSummary();
  // clear inputs
  document.getElementById("buyForm").reset();
});

async function updatePortfolioSummary() {
  const container = document.getElementById("portfolioSummary");
  container.innerHTML = "<em>Calculating...</em>";
  const summary = [];
  let totalCurrentValue = 0;
  for (const p of purchases) {
    // fetch historical price at purchase date (CoinGecko historical endpoint)
    try {
      const histUrl = `https://api.coingecko.com/api/v3/coins/${p.coin}/history?date=${formatDateForCG(p.date)}`;
      const histRes = await fetch(histUrl);
      if (!histRes.ok) throw new Error(histRes.status);
      const histData = await histRes.json();
      const boughtPrice = histData.market_data && histData.market_data.current_price && histData.market_data.current_price.usd;
      // fetch current price
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

function formatDateForCG(dateStr) {
  // CoinGecko wants dd-mm-yyyy
  const d = new Date(dateStr);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
