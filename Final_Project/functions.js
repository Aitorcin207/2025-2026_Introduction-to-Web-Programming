// script.js — StatFin Visual Explorer (final version)
// -------------------------------------------------------
// Requirements: Leaflet, Chart.js, html2canvas loaded in index.html.
// Works locally; connects to StatFin PxWeb API for employment data.
// Fallbacks gracefully to demo data if network/CORS fails.
//
// -------------------------------------------------------
// GLOBAL STATE
let map;
let geoLayer;
let geojsonData = null;
let currentLayer = "employment";
let layerData = {}; // { layerName: { municipalityCode -> value } }
let selectedMunicipality = null;
let chartDistribution;
let chartTimeseries;

// -------------------------------------------------------
// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindUI();
  loadGeoJSON("./finland_municipalities.geojson");
});

// -------------------------------------------------------
// MAP SETUP
function initMap() {
  map = L.map("map").setView([64.5, 26.0], 5.5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
}

// -------------------------------------------------------
// UI INTERACTIONS
function bindUI() {
  // Drag-and-drop
  const items = document.querySelectorAll(".data-item");
  items.forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", el.dataset.id);
    });
  });

  const mapDiv = document.getElementById("map");
  mapDiv.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) changeLayer(id);
  });
  mapDiv.addEventListener("dragover", (e) => e.preventDefault());

  // Buttons
  document.getElementById("btn-download").onclick = downloadPNG;
  document.getElementById("btn-combine").onclick = makeCombinedIndex;
  document.getElementById("layer-elections").onclick = () => changeLayer("elections");
  document.getElementById("layer-employment").onclick = () => changeLayer("employment");
}

// -------------------------------------------------------
// GEOJSON LOAD
async function loadGeoJSON(url) {
  try {
    const res = await fetch(url);
    geojsonData = await res.json();
    drawGeoJSON();
    // After boundaries load, fetch employment data
    await loadStatFinEmployment();
  } catch (e) {
    console.warn("GeoJSON not found, using demo mode:", e);
    alert("Missing GeoJSON file: add 'finland_municipalities.geojson' in the project folder.");
    loadDemoData("employment");
  }
}

// -------------------------------------------------------
// DRAW GEOJSON
function drawGeoJSON() {
  if (!geojsonData) return;
  if (geoLayer) geoLayer.remove();

  geoLayer = L.geoJSON(geojsonData, {
    style: featureStyle,
    onEachFeature: (feature, layer) => {
      layer.on("click", () => {
        const id = feature.properties.kunta || feature.properties.code || feature.id;
        const name = feature.properties.name || feature.properties.nimi || id;
        selectedMunicipality = { id, name };
        updateCharts();
      });
    },
  }).addTo(map);
}

// -------------------------------------------------------
// FEATURE STYLE (color scale)
function featureStyle(feature) {
  const id = feature.properties.kunta || feature.properties.code || feature.id;
  const values = layerData[currentLayer];
  const v = values ? values[id] : null;

  const opacity = v == null ? 0.2 : 0.85;
  const scale = v == null ? 0 : Math.min(1, v / 100);
  const color = v == null
    ? "#ccc"
    : `rgba(${Math.round(200 * (1 - scale))}, ${Math.round(50 + 150 * scale)}, ${Math.round(100 + 100 * (1 - scale))}, ${opacity})`;

  return { color: "#333", weight: 0.5, fillColor: color, fillOpacity: opacity };
}

// -------------------------------------------------------
// LAYER SWITCHING
function changeLayer(name) {
  currentLayer = name;
  document.getElementById("layer-name").innerText = name;
  if (!layerData[name]) {
    if (name === "employment") loadStatFinEmployment();
    else loadDemoData(name);
  } else {
    drawGeoJSON();
    updateCharts();
  }
}

// -------------------------------------------------------
// STATFIN FETCH — REAL DATA
async function loadStatFinEmployment() {
  const url = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/statfin_tyokay/statfin_tyokay_pxt_12df.px";
  const body = {
    query: [
      { code: "Vuosi", selection: { filter: "item", values: ["2021"] } },
      { code: "Alue", selection: { filter: "all", values: ["*"] } },
      { code: "Sukupuoli", selection: { filter: "item", values: ["SSS"] } },
    ],
    response: { format: "json-stat2" },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("StatFin fetch failed: " + res.status);
    const json = await res.json();
    const parsed = parseJsonStatMunicipality(json);
    layerData["employment"] = parsed;
    drawGeoJSON();
    updateCharts();
  } catch (err) {
    console.warn("⚠️ StatFin fetch failed:", err);
    loadDemoData("employment");
  }
}

// Parse json-stat2 response → { municipalityCode: value }
function parseJsonStatMunicipality(js) {
  const dim = js.dimension;
  const regionDim = dim.Alue || dim.Region || dim.alue;
  if (!regionDim) throw new Error("No 'Alue' dimension found in JSON");

  const codes = Object.keys(regionDim.category.index);
  const values = js.value;
  const map = {};
  codes.forEach((code, i) => {
    map[code] = values[i];
  });
  console.log("Loaded StatFin values:", Object.entries(map).slice(0, 5), "...");
  return map;
}

// -------------------------------------------------------
// DEMO DATA FALLBACK
function loadDemoData(name) {
  if (!geojsonData) return;
  const data = {};
  geojsonData.features.forEach((f, i) => {
    const id = f.properties.kunta || f.properties.code || f.id || i;
    data[id] = Math.round(((Math.sin(i * 999 + name.length * 13) + 1) / 2) * 100);
  });
  layerData[name] = data;
  drawGeoJSON();
  updateCharts();
}

// -------------------------------------------------------
// COMBINE LAYERS EXAMPLE
function makeCombinedIndex() {
  if (!geojsonData) return;
  const data = {};
  geojsonData.features.forEach((f, i) => {
    const id = f.properties.kunta || f.properties.code || f.id || i;
    const e = (layerData.employment && layerData.employment[id]) || 0;
    const u = (layerData.unemployment && layerData.unemployment[id]) || 0;
    const ed = (layerData.education && layerData.education[id]) || 0;
    data[id] = Math.max(0, e - u + 0.5 * ed);
  });
  layerData.combined = data;
  changeLayer("combined");
}

// -------------------------------------------------------
// CHARTS
function updateCharts() {
  updateDistributionChart();
  updateTimeSeriesChart();
}

function updateDistributionChart() {
  const canvas = document.getElementById("chart-distribution");
  const values = layerData[currentLayer]
    ? Object.values(layerData[currentLayer])
    : [];
  if (!values.length) return;

  const buckets = [0,10,20,30,40,50,60,70,80,90,100].map(b=>({label:`${b}-${b+9}`,count:0}));
  values.forEach(v=>{
    const idx = Math.min(10, Math.floor((v||0)/10));
    buckets[idx].count++;
  });

  const labels = buckets.map(b=>b.label);
  const data = buckets.map(b=>b.count);

  if (chartDistribution) chartDistribution.destroy();
  chartDistribution = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ label: "Municipalities", data, backgroundColor: "#3b82f6" }] },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function updateTimeSeriesChart() {
  const canvas = document.getElementById("chart-timeseries");
  const info = document.getElementById("selected-muni");
  const muni = selectedMunicipality;

  if (!muni) {
    info.textContent = "No municipality selected";
    if (chartTimeseries) chartTimeseries.destroy();
    return;
  }
  info.textContent = `Selected: ${muni.name}`;

  // Fake historical series (replace with real StatFin year series if desired)
  const years = [2000, 2004, 2008, 2012, 2016, 2020, 2024];
  const base = (layerData.employment && layerData.employment[muni.id]) || 50;
  const dataEmp = years.map((y, i) => base + Math.sin(i * 0.5) * 5);
  const dataUnemp = years.map((y, i) => 100 - base + Math.cos(i * 0.5) * 3);

  if (chartTimeseries) chartTimeseries.destroy();
  chartTimeseries = new Chart(canvas, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        { label: "Employment", data: dataEmp, borderColor: "#10b981", fill: false },
        { label: "Unemployment", data: dataUnemp, borderColor: "#ef4444", fill: false },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

// -------------------------------------------------------
// DOWNLOAD PNG
async function downloadPNG() {
  const el = document.querySelector("main");
  const canvas = await html2canvas(el, { useCORS: true });
  const link = document.createElement("a");
  link.download = "statfin-visual.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// -------------------------------------------------------
// PROXY OPTION (CORS HELP)
// If CORS fails, run a simple Node proxy (proxy.js):
//
// const express = require('express'), fetch = require('node-fetch');
// const app = express(); app.use(express.json());
// app.post('/proxy', async (req,res)=>{
//   const { targetUrl, body } = req.body;
//   const r = await fetch(targetUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
//   const t = await r.text(); res.status(r.status).send(t);
// });
// app.listen(3000,()=>console.log('Proxy on http://localhost:3000'));
//
// Then replace `fetch(url, {...})` with POST to `http://localhost:3000/proxy` if direct call fails.
//
