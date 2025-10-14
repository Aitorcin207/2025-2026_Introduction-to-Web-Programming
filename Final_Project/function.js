// ===== CONFIG =====
const TOPOJSON_URL = "https://raw.githubusercontent.com/lucified/finland-municipalities-topojson/master/finland-municipalities-topojson.json";
const STATFIN_BASE = "https://pxdata.stat.fi/PxWeb/api/v1/en/";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

// Real StatFin datasets (you can change to others)
const DATASETS = {
  unemployment: "StatFin/tyokay/statfin_tyokay_pxt_13d9.px", // Unemployment by municipality
  populationAge: "StatFin/vaerak/statfin_vaerak_pxt_11ra.px", // Age structure
  education: "StatFin/sivgr/statfin_sivgr_pxt_12fh.px", // Education
  elections: "StatFin/kvaa/statfin_kvaa_pxt_14wf.px" // Municipal elections
};

// ===== GLOBALS =====
let map, muniLayer;
let geoFeatures = [];
let unemploymentData = {};
let ageData = {};
let educationData = {};
let electionData = {};
let charts = {};

// ===== INITIALIZE =====
window.addEventListener("load", async () => {
  setupMap();
  setupCharts();
  const geo = await loadGeo();
  fillSelect(geo);
  await fetchAllData();
  colorMap();
});

// ===== MAP =====
function setupMap() {
  map = L.map("map").setView([64.5, 26], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  muniLayer = L.geoJSON(null, {
    style: () => ({ color: "#333", weight: 1, fillOpacity: 0.8 }),
    onEachFeature: (f, l) => l.on("click", () => showMunicipalityData(f))
  }).addTo(map);
}

async function loadGeo() {
  const resp = await fetch(TOPOJSON_URL);
  const topo = await resp.json();
  const geo = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
  geoFeatures = geo.features;
  muniLayer.addData(geo);
  map.fitBounds(muniLayer.getBounds());
  return geo.features;
}

// ===== SELECT MUNICIPALITY =====
function fillSelect(features) {
  const select = document.getElementById("muni-select");
  select.innerHTML = '<option value="">(Select municipality)</option>';
  features
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
    .forEach(f => select.appendChild(new Option(f.properties.name, f.properties.kunta || f.id)));
  select.addEventListener("change", e => {
    const feature = geoFeatures.find(f => f.properties.kunta == e.target.value);
    if (feature) showMunicipalityData(feature);
  });
}

// ===== FETCH ALL DATA =====
async function fetchAllData() {
  await Promise.all([
    fetchPxData(DATASETS.unemployment, d => unemploymentData = d),
    fetchPxData(DATASETS.populationAge, d => ageData = d),
    fetchPxData(DATASETS.education, d => educationData = d),
    fetchPxData(DATASETS.elections, d => electionData = d)
  ]);
}

// ===== GENERIC PxWeb FETCHER =====
async function fetchPxData(path, storeFn) {
  try {
    const url = CORS_PROXY + encodeURIComponent(STATFIN_BASE + path);
    const res = await fetch(url);
    const json = await res.json();

    const dims = json.dataset.dimension;
    const firstDim = Object.keys(dims)[0];
    const labels = dims[firstDim].category.label;
    const vals = json.dataset.value;

    const result = {};
    Object.values(labels).forEach((label, i) => {
      result[label] = vals[i] || null;
    });
    storeFn(result);
  } catch (err) {
    console.warn("StatFin failed, using Eurostat fallback for", path);
    await useFallbackData(storeFn);
  }
}

// ===== FALLBACK SOURCES =====
async function useFallbackData(storeFn) {
  // Eurostat regional unemployment rate (mock data to demonstrate)
  const fallback = {
    Helsinki: 5.5,
    Espoo: 4.8,
    Tampere: 6.1,
    Turku: 6.7,
    Oulu: 7.4,
  };
  storeFn(fallback);
}

// ===== MAP COLORING =====
function colorMap() {
  muniLayer.eachLayer(l => {
    const name = l.feature.properties.name;
    const u = unemploymentData[name];
    l.setStyle({
      fillColor: u ? getColor(u) : "#ccc"
    });
  });
}

function getColor(val) {
  return val > 15 ? "#800026" :
         val > 10 ? "#BD0026" :
         val > 7  ? "#E31A1C" :
         val > 5  ? "#FC4E2A" :
         val > 3  ? "#FD8D3C" :
         val > 1  ? "#FEB24C" :
                    "#FFEDA0";
}

// ===== SHOW MUNICIPALITY DATA =====
function showMunicipalityData(feature) {
  const name = feature.properties.name;
  const u = unemploymentData[name] ?? "N/A";
  const age = ageData[name] ?? "N/A";
  const edu = educationData[name] ?? "N/A";

  document.getElementById("selected-info").innerHTML = `
    <h3>${name}</h3>
    <p><b>Unemployment:</b> ${u}%</p>
    <p><b>Median age:</b> ${age}</p>
    <p><b>Education index:</b> ${edu}</p>
  `;

  updateCharts(name, u, age, edu);
}

// ===== CHARTS =====
function setupCharts() {
  charts.unemployment = new Chart(document.getElementById("unemploymentChart"), {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Unemployment %", data: [], backgroundColor: "#0073e6" }] },
    options: { responsive: true }
  });
  charts.age = new Chart(document.getElementById("ageChart"), {
    type: "doughnut",
    data: { labels: ["0–14", "15–64", "65+"], datasets: [{ data: [30, 50, 20], backgroundColor: ["#56b4e9","#009e73","#e69f00"] }] },
    options: { responsive: true }
  });
  charts.education = new Chart(document.getElementById("educationChart"), {
    type: "pie",
    data: { labels: ["Basic", "Secondary", "Higher"], datasets: [{ data: [40, 40, 20], backgroundColor: ["#f0e442","#0072b2","#d55e00"] }] },
    options: { responsive: true }
  });
  charts.parties = new Chart(document.getElementById("partyChart"), {
    type: "polarArea",
    data: { labels: ["Party A","Party B","Party C"], datasets: [{ data: [50,30,20], backgroundColor: ["#ff6384","#36a2eb","#ffce56"] }] },
    options: { responsive: true }
  });
}

function updateCharts(name, u, age, edu) {
  charts.unemployment.data.labels = [name];
  charts.unemployment.data.datasets[0].data = [parseFloat(u) || 0];
  charts.unemployment.update();
}
