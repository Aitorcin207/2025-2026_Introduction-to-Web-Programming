// function.js with unemployment, age structure, education & elections

const TOPOJSON_URL = 'https://raw.githubusercontent.com/lucified/finland-municipalities-topojson/master/finland-municipalities-topojson.json';
const STATFIN_PXWEB_BASE = 'https://pxdata.stat.fi/PxWeb/api/v1/en/';



// Paths to datasets
const UNEMPLOYMENT_PX = 'Kuntien_avainluvut/Kuntien_avainluvut__uusin/142h.px';  // unemployment % latest
const POP_AGE_PX = 'StatFin/StatFin__vaerak/statfin_vaerak_pxt_11rf.px';        // population by municipality, age, year, sex :contentReference[oaicite:0]{index=0}
const EDUCATION_PX = 'Kuntien_avainluvut/Kuntien_avainluvut__uusin/142k.px';    // example: share of tertiary education — adapt if needed
const ELECTIONS_PX = 'StatFin/kvaa/statfin_kvaa_pxt_14wf.px';                    // municipal elections result table

let map, muniLayer;
let unemploymentData = {};
let ageData = {}; // municipality -> { ageGroup: count }
let educationData = {}; // municipality -> { educLevel: share }
let electionData = {};

let chartUnemp, chartAge, chartEdu;

// Initialize after load
window.addEventListener('load', async () => {
  setupMap();
  buildEmptyCharts();
  await loadMunicipalitiesAndData();
});

function setupMap() {
  map = L.map('map').setView([64.5, 26.0], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  muniLayer = L.geoJSON(null, {
    style: baseStyle,
    onEachFeature
  }).addTo(map);
}

async function loadMunicipalitiesAndData() {
  const resp = await fetch(TOPOJSON_URL);
  if (!resp.ok) throw new Error('Could not fetch topojson');
  const topo = await resp.json();
  const objNames = Object.keys(topo.objects || {});
  const geo = topojson.feature(topo, topo.objects[objNames[0]]);
  // assign ids & names
  geo.features.forEach((f,i) => {
    if (!f.properties) f.properties = {};
    f.id = f.properties.code || f.properties.kunta || `m${i}`;
    f.properties.name = f.properties.name || f.properties.nimi || f.properties.NAME || `Municipality ${f.id}`;
  });

  muniLayer.addData(geo);
  map.fitBounds(muniLayer.getBounds().pad(0.1));
  setTimeout(() => map.invalidateSize(), 200);

  fillMuniSelect(geo.features);

  // fetch datasets in parallel
  await Promise.all([
    fetchUnemployment(),
    fetchAgeStructure(),
    fetchEducation(),
    fetchElectionResults()
  ]);

  // apply election coloring
  applyElectionColors();
}

function fillMuniSelect(features) {
  const sel = document.getElementById('muni-select');
  sel.innerHTML = '<option value="">(Select municipality)</option>';
  features
    .sort((a,b) => a.properties.name.localeCompare(b.properties.name))
    .forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.properties.name;
      sel.appendChild(opt);
    });
  sel.addEventListener('change', () => {
    const id = sel.value;
    if (!id) return;
    const layer = findLayerById(id);
    if (layer) {
      map.fitBounds(layer.getBounds().pad(0.3));
      showMunicipalityInfo(layer.feature);
    }
  });
}

// Fetch unemployment %
async function fetchUnemployment() {
  const url = STATFIN_PXWEB_BASE + UNEMPLOYMENT_PX;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Unemployment data fetch failed ' + resp.status);
    const j = await resp.json();

    const dims = j.dataset.dimension;
    const values = j.dataset.value;
    // Dimensions might be: Municipality, Time (year)
    const muniDim = dims.Municipality;
    const timeDim = dims.Time || dims.Year;
    const years = timeDim.category.label;
    const latestYearIndex = years.length - 1;

    muniDim.category.index && Object.entries(muniDim.category.index).forEach(([munName, munIdx]) => {
      const idx = munIdx * years.length + latestYearIndex;
      const val = values[idx];
      unemploymentData[munName] = val;
    });
    console.log('Unemployment data loaded', unemploymentData);
  } catch (e) {
    console.warn('fetchUnemployment failed', e);
  }
}

// Fetch age structure data
async function fetchAgeStructure() {
  const url = STATFIN_PXWEB_BASE + POP_AGE_PX;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Age structure fetch failed ' + resp.status);
    const j = await resp.json();
    const dims = j.dataset.dimension;
    const values = j.dataset.value;

    const muniDim = dims.Municipality;
    const timeDim = dims.Year;
    const ageDim = dims.Age;
    const sexDim = dims.Sex;

    const years = timeDim.category.label;
    const latestYearIndex = years.length - 1;

    // we focus on *Total* sex (ignore separate male / female) and the latest year
    // The ordering of dimensions in value array is critical — inspect j.dataset.dimension.order
    // We assume ordering: Municipality × Year × Sex × Age

    muniDim.category.index && Object.entries(muniDim.category.index).forEach(([munName, muniIdx]) => {
      const rec = {};
      ageDim.category.index && Object.entries(ageDim.category.index).forEach(([ageLabel, ageIdx]) => {
        // find value index
        // index = muniIdx * ( … ) + latestYearIndex * ( … ) + sexIndex * ( … ) + ageIdx
        // For simplicity, find the value by looping all combinations (inefficient but okay for demo)
        // We'll search across the value array with matching indices

        // Determine sexIndex of "Total"
        const sexTotalIndex = Object.entries(sexDim.category.index).find(([lbl, idx]) => lbl.toLowerCase() === 'total' || lbl.toLowerCase() === 'both sexes');
        let sexIdx = 0;
        if (sexTotalIndex) sexIdx = sexTotalIndex[1];

        // Compute strides
        const ageCount = ageDim.category.label.length;
        const sexCount = sexDim.category.label.length;
        const yearCount = timeDim.category.label.length;
        // assume ordering: muni major, then year, then sex, then age
        const idx = muniIdx * (yearCount * sexCount * ageCount)
                    + latestYearIndex * (sexCount * ageCount)
                    + sexIdx * ageCount
                    + ageIdx;
        const val = values[idx];
        rec[ageLabel] = val;
      });
      ageData[munName] = rec;
    });
    console.log('Age structure loaded', ageData);
  } catch (e) {
    console.warn('fetchAgeStructure failed', e);
  }
}

// Fetch education level shares (example dataset)
async function fetchEducation() {
  const url = STATFIN_PXWEB_BASE + EDUCATION_PX;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Education data fetch failed ' + resp.status);
    const j = await resp.json();
    const dims = j.dataset.dimension;
    const values = j.dataset.value;

    const muniDim = dims.Municipality;
    const timeDim = dims.Time || dims.Year;
    const educDim = dims.Education; // might differ name

    const years = timeDim.category.label;
    const latestYearIndex = years.length - 1;

    muniDim.category.index && Object.entries(muniDim.category.index).forEach(([munName, muniIdx]) => {
      const rec = {};
      educDim.category.index && Object.entries(educDim.category.index).forEach(([eduLabel, eduIdx]) => {
        // same pattern: find index in flat values
        const eduCount = educDim.category.label.length;
        const yearCount = years.length;
        const idx = muniIdx * (yearCount * eduCount)
                    + latestYearIndex * eduCount
                    + eduIdx;
        rec[eduLabel] = values[idx];
      });
      educationData[munName] = rec;
    });
    console.log('Education shares loaded', educationData);
  } catch (e) {
    console.warn('fetchEducation failed', e);
  }
}

// Fetch election data
async function fetchElectionResults() {
  const url = STATFIN_PXWEB_BASE + ELECTIONS_PX;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Election fetch failed ' + resp.status);
    const j = await resp.json();
    const dims = j.dataset.dimension;
    const values = j.dataset.value;

    const muniDim = dims.Municipality;
    const partyDim = dims.Party;
    const statusDimName = Object.keys(dims).find(k => k.toLowerCase().includes('status'));
    const statusDim = dims[statusDimName];

    const statusLabels = statusDim.category.label;
    const electedIdx = statusLabels.indexOf('Elected total') >= 0
                        ? statusLabels.indexOf('Elected total')
                        : 0;

    muniDim.category.index && Object.entries(muniDim.category.index).forEach(([munName, muniIdx]) => {
      const rec = { votes: {}, winner: null };
      let best = -1;
      partyDim.category.index && Object.entries(partyDim.category.index).forEach(([partyLabel, partyIdx]) => {
        const idx = muniIdx * (partyDim.category.label.length * statusLabels.length)
                    + partyIdx * statusLabels.length
                    + electedIdx;
        const val = values[idx];
        rec.votes[partyLabel] = val;
        if (val > best) {
          best = val;
          rec.winner = partyLabel;
        }
      });
      electionData[munName] = rec;
    });
    console.log('Election data loaded', electionData);
  } catch (e) {
    console.warn('fetchElectionResults failed', e);
  }
}

// After data loaded, color map
function applyElectionColors() {
  muniLayer.eachLayer(layer => {
    const id = layer.feature.id;
    const rec = electionData[id];
    const fill = rec && rec.winner ? getPartyColor(rec.winner) : '#ddd';
    layer.setStyle({
      fillColor: fill,
      fillOpacity: 0.9,
      weight: 1,
      color: '#444'
    });
  });
}

// Event helper
function onEachFeature(feature, layer) {
  layer.on('click', () => showMunicipalityInfo(feature));
}

// Find layer by municipality id
function findLayerById(id) {
  let target = null;
  muniLayer.eachLayer(l => {
    if (l.feature.id == id) target = l;
  });
  return target;
}

// Show info + update charts
function showMunicipalityInfo(feature) {
  const id = feature.id;
  const name = feature.properties.name;

  const unemp = unemploymentData[id];
  const ageRec = ageData[id] || {};
  const eduRec = educationData[id] || {};
  const eRec = electionData[id] || { votes: {}, winner: null };

  document.getElementById('selected-info').innerHTML =
    `<strong>${name}</strong><br>
     Winner: ${eRec.winner || 'N/A'}<br>
     Unemployment: ${unemp != null ? (unemp + '%') : 'N/A'}`;

  // Unemployment chart
  chartUnemp.data = {
    labels: ['Unemployment'],
    datasets: [{ label: 'Unemployment %', data: [unemp != null ? unemp : 0], backgroundColor: '#0073e6' }]
  };
  chartUnemp.update();

  // Age structure chart
  const ages = Object.keys(ageRec);
  const vals = ages.map(a => ageRec[a]);
  chartAge.data = {
    labels: ages,
    datasets: [{ label: 'Population by age', data: vals, backgroundColor: 'rgba(50,150,50,0.7)' }]
  };
  chartAge.update();

  // Education chart
  const educs = Object.keys(eduRec);
  const edVals = educs.map(e => eduRec[e]);
  chartEdu.data = {
    labels: educs,
    datasets: [{ label: 'Education level share', data: edVals, backgroundColor: 'rgba(150,50,150,0.7)' }]
  };
  chartEdu.update();

  // Party list
  const partyDiv = document.getElementById('party-list');
  partyDiv.innerHTML = `<strong>Votes by party (Elected total):</strong>`;
  const ul = document.createElement('ul');
  Object.entries(eRec.votes)
    .sort((a,b) => b[1] - a[1])
    .forEach(([party, v]) => {
      const li = document.createElement('li');
      const color = getPartyColor(party);
      li.innerHTML = `<span style="display:inline-block;width:12px;height:10px;background:${color};margin-right:6px;"></span>
                      ${party}: ${v}`;
      ul.appendChild(li);
    });
  partyDiv.appendChild(ul);
}

// Base polygon style
function baseStyle(feature) {
  return {
    color: '#333',
    weight: 1,
    fillColor: '#ccc',
    fillOpacity: 0.7
  };
}

// Party colors (customize as needed)
function getPartyColor(p) {
  const cols = {
    'Kokoomus': '#006288',
    'SDP': '#E11931',
    'Perussuomalaiset': '#FFDE00',
    'Keskusta': '#01954B',
    'Vihreät': '#61BF1A',
    'Vasemmistoliitto': '#E30613',
    'RKP': '#FFD300',
    'Kristillisdemokraatit': '#003580'
  };
  return cols[p] || '#888';
}

// Build empty Chart.js objects
function buildEmptyCharts() {
  const ctx1 = document.getElementById('chart-unemployment').getContext('2d');
  chartUnemp = new Chart(ctx1, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Unemployment %', data: [], backgroundColor: '#0073e6' }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  const ctx2 = document.getElementById('chart-age-structure').getContext('2d');
  chartAge = new Chart(ctx2, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Population by age', data: [], backgroundColor: 'rgba(50,150,50,0.7)' }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  const ctx3 = document.getElementById('chart-education').getContext('2d');
  chartEdu = new Chart(ctx3, {
    type: 'pie',
    data: { labels: [], datasets: [{ label: 'Education level share', data: [], backgroundColor: [] }] },
    options: { responsive: true }
  });
}
