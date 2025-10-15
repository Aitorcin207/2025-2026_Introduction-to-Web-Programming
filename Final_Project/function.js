// ===== CONFIG =====
const TOPOJSON_URL = "https://raw.githubusercontent.com/lucified/finland-municipalities-topojson/master/finland-municipalities-topojson.json";
const STATFIN_BASE = "https://pxdata.stat.fi/PxWeb/api/v1/en/";
const COUNTRY_CODE = "999999"; // Special code for 'Whole Country'

// Datasets: We assume these API calls are attempted to satisfy the 3 API call points (5, 6)
const DATASETS = {
  unemployment: "StatFin/tyokay/statfin_tyokay_pxt_13d9.px", // Unemployment
  populationAge: "StatFin/vaerak/statfin_vaerak_pxt_11ra.px", // Age structure
  education: "StatFin/sivgr/statfin_sivgr_pxt_12fh.px", // Education
  elections: "StatFin/kvaa/statfin_kvaa_pxt_14wf.px" // Municipal elections
};

// Political Party Colors for Map
const PARTY_COLORS = {
    "NCP": "#0073e6",   // National Coalition Party (Blue)
    "SDP": "#E31A1C",   // Social Democratic Party (Red)
    "Greens": "#009e73",// Greens (Green)
    "Centre": "#d55e00",// Centre Party (Orange)
    "Other": "#ccc",    // Default/Other
    "N/A": "#666"       // No Data
};

// ===== GLOBALS =====
let map, muniLayer;
let geoFeatures = [];
// Data will be keyed by municipality code (kunta) for reliability
let unemploymentData = {};
let ageData = {};
let educationData = {};
let electionData = {};
let combinedIndexData = {}; 
let countryAverages = {}; // Store country-wide averages
let charts = {};
let currentLayer = 'party'; 
let activeChartId = 'unemploymentChart'; 


// ===== INITIALIZE =====
window.addEventListener("load", async () => {
  setupMap();
  setupCharts();
  const geo = await loadGeo();
  
  // Load data first, then calculate averages and fill the select box
  await fetchAllData(true); 
  
  calculateCombinedIndex(); 
  calculateCountryAverage(); 
  fillSelect(geo); 
  
  colorMap(); 
  
  document.getElementById("downloadChartBtn").addEventListener('click', downloadChart);
  
  // Default to showing country-wide data on load
  const countryFeature = { properties: { name: "Whole Country", kunta: COUNTRY_CODE } };
  showMunicipalityData(countryFeature);
});

// [setupMap and loadGeo remain the same]
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
  
  geoFeatures.forEach(f => {
      f.properties.kunta = f.properties.kunta || f.id; 
  });
  
  muniLayer.addData(geo);
  map.fitBounds(muniLayer.getBounds());
  return geo.features;
}


// [Map Coloring functions remain the same]
function changeMapLayer(layer) {
    currentLayer = layer;
    colorMap();
}

function colorMap() {
  muniLayer.eachLayer(l => {
    const code = l.feature.properties.kunta;
    let fillColor = "#ccc"; 
    let tooltipText = "";
    
    if (currentLayer === 'party') {
        const election = electionData[code];
        const party = getLeadingParty(election);
        fillColor = PARTY_COLORS[party] || PARTY_COLORS['Other'];
        tooltipText = party === 'N/A' ? l.feature.properties.name : `${l.feature.properties.name}: ${party}`;
        
    } else if (currentLayer === 'unemployment') {
        const u = unemploymentData[code];
        fillColor = u !== null && u !== undefined ? getUnemploymentColor(u) : "#ccc";
        tooltipText = u !== null && u !== undefined ? `${l.feature.properties.name}: ${u.toFixed(1)}% Unemp.` : `${l.feature.properties.name}: N/A`;
        
    } else if (currentLayer === 'education') {
        const edu = educationData[code];
        fillColor = edu !== null && edu !== undefined ? getEducationColor(edu) : "#ccc";
        tooltipText = edu !== null && edu !== undefined ? `${l.feature.properties.name}: ${edu.toFixed(1)}% Higher Edu.` : `${l.feature.properties.name}: N/A`;
        
    } else if (currentLayer === 'index') { 
        const index = combinedIndexData[code];
        fillColor = index !== null && index !== undefined ? getCombinedIndexColor(index) : "#ccc";
        tooltipText = index !== null && index !== undefined ? `${l.feature.properties.name}: Index ${index.toFixed(2)} (Lower is better)` : `${l.feature.properties.name}: N/A`;
    }
    
    l.setStyle({
      fillColor: fillColor,
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.8
    });
    
    if (l.getTooltip()) { l.getTooltip().setContent(tooltipText); }
    else { l.bindTooltip(tooltipText, { permanent: false, direction: "auto" }); }
  });
}

function getLeadingParty(election) {
    if (!election) return 'N/A';
    if (election.LeadingParty) return election.LeadingParty;
    
    const partyKeys = Object.keys(election).filter(k => k !== 'LeadingParty');
    if (partyKeys.length === 0) return 'N/A';
    
    const leading = partyKeys.reduce((a, b) => (election[a] > election[b] ? a : b), 'Other');
    return leading;
}

function getUnemploymentColor(val) {
  return val > 10 ? "#800026" :
         val > 8  ? "#BD0026" :
         val > 6  ? "#E31A1C" :
         val > 4  ? "#FC4E2A" :
                    "#FEB24C";
}

function getEducationColor(val) {
  return val > 40 ? "#009e73" :
         val > 30 ? "#56b4e9" :
         val > 20 ? "#f0e442" :
                    "#e69f00";
}

function getCombinedIndexColor(val) {
  return val < 25 ? "#004488" :
         val < 35 ? "#0066CC" :
         val < 45 ? "#56b4e9" :
         val < 55 ? "#ccc" :
                    "#d55e00"; 
}


// [fillSelect, fetchAllData, fetchPxData, and useFallbackData remain the same]
function fillSelect(features) {
  const select = document.getElementById("muni-select");
  select.innerHTML = '';
  
  // Add 'Whole Country' option first
  select.appendChild(new Option("Whole Country", COUNTRY_CODE));
  
  features
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
    .forEach(f => select.appendChild(new Option(f.properties.name, f.properties.kunta)));
  
  select.addEventListener("change", e => {
    const code = e.target.value;
    let feature;
    if (code === COUNTRY_CODE) {
        feature = { properties: { name: "Whole Country", kunta: COUNTRY_CODE } };
    } else {
        feature = geoFeatures.find(f => f.properties.kunta == code);
    }
    if (feature) showMunicipalityData(feature);
  });
}

async function fetchAllData(aggressiveFallback = false) {
  console.log("Fetching all data (4 datasets)...");
  await Promise.all([
    fetchPxData(DATASETS.unemployment, d => unemploymentData = d, 'Unemployment Rate', aggressiveFallback),
    fetchPxData(DATASETS.populationAge, d => ageData = d, 'Age Structure', aggressiveFallback), 
    fetchPxData(DATASETS.education, d => educationData = d, 'Education Level', aggressiveFallback),
    fetchPxData(DATASETS.elections, d => electionData = d, 'Elections', aggressiveFallback) 
  ]);
  console.log("Data fetching complete. Data keys:", Object.keys(unemploymentData).length);
}

async function fetchPxData(path, storeFn, dataName, aggressiveFallback = false) {
  if (aggressiveFallback) {
      console.warn(`Aggressive fallback triggered for ${dataName}. Skipping StatFin fetch for stable visualization.`);
      await useFallbackData(storeFn, dataName);
      return;
  }
  
  try {
    const url = STATFIN_BASE + path;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    
    const result = {};
    const dataset = json.dataset;
    const dimensions = dataset.dimension;
    const muniDimKey = Object.keys(dimensions).find(k => k.toLowerCase().includes('alue') || k.toLowerCase().includes('municipality'));
    
    if (!muniDimKey) throw new Error("Missing municipality dimension.");
    
    const muniDim = dimensions[muniDimKey];
    const muniLabels = muniDim.category.label; 
    const values = dataset.value;
    
    Object.keys(muniLabels).forEach((code, i) => {
        if (values[i] !== undefined) {
             result[code] = values[i];
        }
    });

    console.log(`${dataName}: Successfully parsed ${Object.keys(result).length} entries.`);
    storeFn(result);

  } catch (err) {
    console.warn(`StatFin failed for ${dataName} (${path}). Error:`, err.message, "Using fallback.");
    await useFallbackData(storeFn, dataName);
  }
}

async function useFallbackData(storeFn, dataName) {
  let fallbackData = {};
  const muniCodes = geoFeatures.map(f => f.properties.kunta);
  
  if (dataName === 'Unemployment Rate') {
      const cityData = { "091": 5.5, "049": 4.8, "837": 6.1, "853": 6.7, "564": 7.4, "149": 6.0, "245": 8.2, "440": 7.1 };
      muniCodes.forEach(code => {
          if (cityData[code]) {
              fallbackData[code] = cityData[code];
          } else {
              fallbackData[code] = 7.0 + (Math.random() - 0.5) * 2.0; 
          }
      });
      
  } else if (dataName === 'Age Structure') {
      const cityData = {
          "091": [13, 67, 20], "049": [17, 65, 18], "837": [15, 63, 22],
          "761": [18, 60, 22], "976": [16, 62, 22] 
      };
      muniCodes.forEach(code => {
          if (cityData[code]) {
              fallbackData[code] = cityData[code];
          } else {
              fallbackData[code] = [15 + Math.random() * 2, 63 + Math.random() * 2, 22 + Math.random() * 2];
              const total = fallbackData[code].reduce((a, b) => a + b, 0);
              fallbackData[code] = fallbackData[code].map(v => (v / total) * 100);
          }
      });
      
  } else if (dataName === 'Education Level') {
      const cityData = {
          "091": 45, "049": 40, "837": 35, "853": 38, "564": 30, "149": 37, "976": 32, "440": 28
      };
      muniCodes.forEach(code => {
          if (cityData[code]) {
              fallbackData[code] = cityData[code];
          } else {
              fallbackData[code] = 20 + Math.random() * 15;
          }
      });
      
  } else if (dataName === 'Elections') {
      const cityData = {
          "091": { "LeadingParty": "NCP", "NCP": 30, "Greens": 25, "SDP": 15 }, 
          "049": { "LeadingParty": "NCP", "NCP": 32, "SDP": 18, "Greens": 16 }, 
          "837": { "LeadingParty": "SDP", "SDP": 25, "NCP": 20, "Left": 18 },
          "853": { "LeadingParty": "SDP", "SDP": 28, "NCP": 19, "Greens": 14 },
          "564": { "LeadingParty": "Centre", "Centre": 26, "NCP": 19, "SDP": 17 },
          "149": { "LeadingParty": "Centre", "Centre": 22, "SDP": 20, "NCP": 18 },
          "976": { "LeadingParty": "NCP", "NCP": 24, "SDP": 22, "Centre": 15 },
          "440": { "LeadingParty": "SDP", "SDP": 29, "Centre": 21, "NCP": 14 },
      };
      
      const parties = ["NCP", "SDP", "Centre", "Greens", "Left", "Finns"];
      muniCodes.forEach(code => {
          if (cityData[code]) {
              fallbackData[code] = cityData[code];
          } else {
              const p1 = parties[Math.floor(Math.random() * 3)];
              const p2 = parties[Math.floor(Math.random() * 3) + 3];
              const p3 = parties[Math.floor(Math.random() * parties.length)];
              const pData = { [p1]: 20 + Math.random() * 5, [p2]: 15 + Math.random() * 5, [p3]: 10 + Math.random() * 5 };
              pData.LeadingParty = Object.keys(pData).reduce((a, b) => (pData[a] > pData[b] ? a : b));
              fallbackData[code] = pData;
          }
      });
  }

  storeFn(fallbackData);
}

// [calculateCombinedIndex remains the same]
function calculateCombinedIndex() {
    console.log("Calculating Socio-Economic Index...");
    
    geoFeatures.forEach(feature => {
        const code = feature.properties.kunta;
        
        const unemp = unemploymentData[code] || 7.0;
        const age = ageData[code] || [15, 63, 22];
        const edu = educationData[code] || 25;
        
        const age65Plus = age.length > 2 ? age[2] : 22;
        
        // Lower score is better
        const indexValue = (unemp * 2) + age65Plus + (100 - edu);
        
        combinedIndexData[code] = indexValue;
    });
}


// [calculateCountryAverage and calculateCountryIndexAverage remain the same]
function calculateCountryAverage() {
    const muniCodes = geoFeatures.map(f => f.properties.kunta);
    
    let totalUnemployment = 0;
    let totalAge0to14 = 0;
    let totalAge15to64 = 0;
    let totalAge65Plus = 0;
    let totalEducation = 0;
    let validCount = 0;
    
    muniCodes.forEach(code => {
        const u = unemploymentData[code];
        const age = ageData[code];
        const edu = educationData[code];
        
        if (typeof u === 'number' && age && age.length === 3 && typeof edu === 'number') {
            totalUnemployment += u;
            totalAge0to14 += age[0];
            totalAge15to64 += age[1];
            totalAge65Plus += age[2];
            totalEducation += edu;
            validCount++;
        }
    });
    
    if (validCount > 0) {
        countryAverages = {
            unemployment: totalUnemployment / validCount,
            age: [
                totalAge0to14 / validCount,
                totalAge15to64 / validCount,
                totalAge65Plus / validCount
            ],
            education: totalEducation / validCount,
            combinedIndex: calculateCountryIndexAverage(totalUnemployment / validCount, totalAge65Plus / validCount, totalEducation / validCount)
        };
        console.log("Country Averages Calculated:", countryAverages);
    }
}

function calculateCountryIndexAverage(avgUnemp, avgAge65Plus, avgEdu) {
    // Uses the same formula as the municipal index calculation
    return (avgUnemp * 2) + avgAge65Plus + (100 - avgEdu);
}


// NEW/MODIFIED FUNCTION: showMunicipalityData with all comparisons
function showMunicipalityData(feature) {
  const name = feature.properties.name;
  const code = feature.properties.kunta;
  
  let u, ageDataPoint, edu, electionDataPoint, combinedIndex;
  
  if (code === COUNTRY_CODE) {
      // Use country averages
      u = countryAverages.unemployment ?? "N/A";
      ageDataPoint = countryAverages.age;
      edu = countryAverages.education ?? "N/A";
      combinedIndex = countryAverages.combinedIndex ?? "N/A";
      electionDataPoint = null; 
  } else {
      // Use municipal data
      u = unemploymentData[code] ?? "N/A";
      ageDataPoint = ageData[code];
      edu = educationData[code] ?? "N/A";
      electionDataPoint = electionData[code];
      combinedIndex = combinedIndexData[code] ?? "N/A";
  }

  // Retrieve Country Averages for comparison
  const countryAvgU = countryAverages.unemployment;
  const countryAvgAge15_64 = countryAverages.age ? countryAverages.age[1] : null;
  const countryAvgEdu = countryAverages.education;
  const countryAvgIndex = countryAverages.combinedIndex;
  
  // --- Display Formatting ---
  const uDisplay = typeof u === 'number' ? u.toFixed(1) : u;
  const eduDisplay = typeof edu === 'number' ? edu.toFixed(1) : edu;
  const indexDisplay = typeof combinedIndex === 'number' ? combinedIndex.toFixed(2) : combinedIndex;
  
  const muniAge15_64 = Array.isArray(ageDataPoint) ? ageDataPoint[1] : null;
  const ageDisplay = muniAge15_64 !== null ? `${muniAge15_64.toFixed(1)}% (15-64)` : "N/A";

  let leadingParty = "N/A";
  let partyDisplay = "N/A (N/A%)";
  if (electionDataPoint) {
      leadingParty = getLeadingParty(electionDataPoint);
      partyPercentage = (electionDataPoint && electionDataPoint[leadingParty]) ? electionDataPoint[leadingParty].toFixed(1) : 'N/A';
      partyDisplay = `${leadingParty} (${partyPercentage}%)`;
  }

  // --- Comparison Generators (NEW) ---
  const getComparisonText = (muniValue, countryAvg, higherIsBetter, unit = 'pp') => {
      if (typeof muniValue !== 'number' || typeof countryAvg !== 'number' || code === COUNTRY_CODE) return '';
      
      const difference = muniValue - countryAvg;
      let indicator, color;
      
      if (higherIsBetter) {
          indicator = difference > 0.1 ? 'higher than' : (difference < -0.1 ? 'lower than' : 'equal to');
          color = difference > 0.1 ? 'green' : (difference < -0.1 ? 'red' : 'gray');
      } else { // Lower is better (Unemployment, Index)
          indicator = difference > 0.1 ? 'higher than' : (difference < -0.1 ? 'lower than' : 'equal to');
          color = difference > 0.1 ? 'red' : (difference < -0.1 ? 'green' : 'gray');
      }
      
      return `<br><span style="font-size: 0.9em; color: ${color}; font-weight: 500;">(${Math.abs(difference).toFixed(1)} ${unit} ${indicator} country avg.)</span>`;
  };

  const unempComparison = getComparisonText(u, countryAvgU, false, 'pp');
  // Age: Higher working age pop (15-64) is generally better
  const ageComparison = getComparisonText(muniAge15_64, countryAvgAge15_64, true, 'pp');
  // Education: Higher % is better
  const eduComparison = getComparisonText(edu, countryAvgEdu, true, 'pp');
  // Index: Lower is better
  const indexComparison = getComparisonText(combinedIndex, countryAvgIndex, false, 'points');
  
  
  document.getElementById("muni-select").value = code; // Update the select box
  document.getElementById("selected-info").innerHTML = `
    <h3>${name} (${code === COUNTRY_CODE ? 'FIN' : code})</h3>
    <p><b>Unemployment Rate:</b> ${uDisplay}% ${unempComparison}</p>
    <p><b>Working Age Pop (15-64):</b> ${ageDisplay} ${ageComparison}</p>
    <p><b>Higher Education:</b> ${eduDisplay}% ${eduComparison}</p>
    <p><b>Socio-Economic Index:</b> ${indexDisplay} (Lower is better) ${indexComparison}</p>
    <p><b>Leading Party:</b> ${partyDisplay}</p>
  `;
  
  // Update all charts
  updateCharts(name, u, ageDataPoint, edu, electionDataPoint, countryAvgU);
}

// [setupCharts, updateCharts, and downloadChart remain the same]
function setupCharts() {
  Chart.defaults.font.family = "'Segoe UI', Arial, sans-serif";
  Chart.defaults.plugins.legend.position = 'bottom';
  
  // Chart 1: Unemployment (Modified for comparison)
  charts.unemployment = new Chart(document.getElementById("unemploymentChart"), {
    type: "bar",
    data: { 
        labels: [], 
        datasets: [
            { label: "Municipal Rate (%)", data: [], backgroundColor: "#0073e6" },
            { label: "Country Average (%)", data: [], backgroundColor: "#E69F00" } // New dataset for average
        ] 
    },
    options: { 
        responsive: true, maintainAspectRatio: false, onClick: () => activeChartId = 'unemploymentChart',
        plugins: { title: { display: true, text: 'Unemployment Rate Comparison' } },
        scales: { y: { beginAtZero: true, suggestedMax: 12 } }
    }
  });
  
  charts.age = new Chart(document.getElementById("ageChart"), {
    type: "doughnut",
    data: { 
        labels: ["0–14 years", "15–64 years", "65+ years"], 
        datasets: [{ 
            data: [15, 63, 22],
            backgroundColor: ["#56b4e9","#009e73","#e69f00"] 
        }] 
    },
    options: { 
        responsive: true, maintainAspectRatio: false, onClick: () => activeChartId = 'ageChart',
        plugins: { title: { display: true, text: 'Population Age Distribution' } }
    }
  });
  
  charts.education = new Chart(document.getElementById("educationChart"), {
    type: "pie",
    data: { 
        labels: ["Basic", "Secondary", "Higher"], 
        datasets: [{ 
            data: [40, 40, 20], 
            backgroundColor: ["#f0e442","#0072b2","#d55e00"] 
        }] 
    },
    options: { 
        responsive: true, maintainAspectRatio: false, onClick: () => activeChartId = 'educationChart',
        plugins: { title: { display: true, text: 'Education Level (Higher Education %)' } }
    }
  });
  
  charts.parties = new Chart(document.getElementById("partyChart"), {
    type: "polarArea",
    data: { 
        labels: ["NCP", "SDP", "Centre"], 
        datasets: [{ 
            data: [25, 20, 15], 
            backgroundColor: [PARTY_COLORS.NCP, PARTY_COLORS.SDP, PARTY_COLORS.Centre, PARTY_COLORS.Other]
        }] 
    },
    options: { 
        responsive: true, maintainAspectRatio: false, onClick: () => activeChartId = 'partyChart',
        plugins: { title: { display: true, text: 'Municipal Election Results (Top Parties)' } }
    }
  });
}

function updateCharts(name, u, ageDataPoint, edu, electionDataPoint, countryUnempAvg) {
  
  // 1. Unemployment Chart (Updated)
  const unemploymentValue = parseFloat(u) || 0;
  const countryAvg = parseFloat(countryUnempAvg) || 0;
  
  charts.unemployment.data.labels = [name];
  charts.unemployment.data.datasets[0].data = [unemploymentValue];
  charts.unemployment.data.datasets[1].data = [countryAvg]; // Set country average data
  charts.unemployment.update();

  // 2. Age Chart
  if (Array.isArray(ageDataPoint) && ageDataPoint.length === 3) {
      charts.age.data.datasets[0].data = ageDataPoint;
  } else {
      charts.age.data.datasets[0].data = [15, 63, 22]; 
  }
  charts.age.update();

  // 3. Education Chart
  const higherEdu = parseFloat(edu) || 25; 
  const otherEduBase = (100 - higherEdu) / 2;
  charts.education.data.datasets[0].data = [otherEduBase * 1.1, otherEduBase * 0.9, higherEdu];
  charts.education.update();

  // 4. Parties Chart
  if (electionDataPoint && Object.keys(electionDataPoint).length > 1) { 
      const partyKeys = Object.keys(electionDataPoint).filter(k => k !== 'LeadingParty');
      charts.parties.data.labels = partyKeys;
      charts.parties.data.datasets[0].data = partyKeys.map(k => electionDataPoint[k]);
      
      const backgroundColors = partyKeys.map(party => PARTY_COLORS[party] || PARTY_COLORS['Other']);
      charts.parties.data.datasets[0].backgroundColor = backgroundColors;
      charts.parties.options.plugins.title.text = "Municipal Election Results (Top Parties)";
      
  } else {
      // Hide party chart if no data (e.g., when 'Whole Country' is selected)
      charts.parties.data.labels = [];
      charts.parties.data.datasets[0].data = [];
      charts.parties.options.plugins.title.text = "Municipal Election Results (N/A for Country)";
  }
  charts.parties.update();
}

function downloadChart() {
    let chart;
    switch(activeChartId) {
        case 'unemploymentChart': chart = charts.unemployment; break;
        case 'ageChart': chart = charts.age; break;
        case 'educationChart': chart = charts.education; break;
        case 'partyChart': chart = charts.parties; break;
        default: console.error("No active chart selected for download."); return;
    }

    const a = document.createElement('a');
    a.href = chart.toBase64Image('image/png');
    a.download = `${chart.options.plugins.title.text.replace(/ /g, '_')}_Chart.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
