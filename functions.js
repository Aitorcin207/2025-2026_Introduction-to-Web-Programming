const migrationUrl = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/muutl/statfin_muutl_pxt_11a2.px";

// Initialize map
const map = L.map('map', {
  minZoom: -3
});

// Add OpenStreetMap tile background
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {

  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// GeoJSON URL (Statistics Finland WFS)
const url = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326";

fetch(url)
  .then(r => r.json())
  .then(data => {
    console.log("GeoJSON loaded:", data);

    // Add GeoJSON with tooltips
    const geojsonLayer = L.geoJSON(data, {
      style: {
        weight: 2,
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.name) {
          layer.bindTooltip(feature.properties.name, {
            sticky: true
          });
        }
      }
    }).addTo(map);


    map.fitBounds(geojsonLayer.getBounds());

    initializeCode(geojsonLayer);

  })
  .catch(err => console.error("GeoJSON fetch error:", err));


async function fetchStatsFinData(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return await response.json();
}

const initializeCode = async (geojsonLayer) => {
  const migrationBody = await (await fetch("/Week_5/migration_data_query.json")).json();

  const migrationData = await fetchStatsFinData(migrationUrl, migrationBody);

  setupMigrationPopups(migrationData, geojsonLayer);
};

function setupMigrationPopups(migrationData, geojsonLayer) {
  // Basic checks
  if (!migrationData || !migrationData.value || !migrationData.dimension || !migrationData.id || !migrationData.size) {
    console.error("Unexpected migrationData structure:", migrationData);
    return;
  }

  const dims = migrationData.id;        // e.g. ["Vuosi","Alue","Tiedot"]
  const sizes = migrationData.size;     // e.g. [1, 311, 2]
  const values = migrationData.value;   // flattened values array
  const dimObj = migrationData.dimension;

  // compute strides: strides[i] = product of sizes after i
  const strides = sizes.map((_, i) => sizes.slice(i + 1).reduce((a, b) => a * b, 1));

  // helper to find dimension name heuristically
  const findDimByHints = (hints) =>
    dims.find(d => hints.some(h => new RegExp(h, 'i').test(d)));

  // Try to find the dimension names (fallbacks included)
  const areaDim = findDimByHints(['alue', 'kunta']) || dims.find(d => d.toLowerCase().includes('area')) || dims[1] || dims[0];
  const tidotDim = findDimByHints(['tiedot', 'tieto', 'muutto', 'muutt']) || dims.find(d => d !== areaDim) || dims[dims.length - 1];

  console.log("dimension order:", dims, "sizes:", sizes, "using areaDim:", areaDim, "tiedotDim:", tidotDim);

  const areaIndexMap = dimObj[areaDim].category.index;   // mapping key -> index
  const areaLabels = dimObj[areaDim].category.label;     // mapping key -> label (name)
  const tidotIndexMap = dimObj[tidotDim].category.index;
  const tidotLabels = dimObj[tidotDim].category.label;

  // Build index -> label arrays for tidot so we can identify which index is 'positive' and which 'negative'
  const tidotArr = new Array(Object.keys(tidotIndexMap).length);
  for (const key in tidotIndexMap) {
    tidotArr[tidotIndexMap[key]] = tidotLabels[key];
  }

  // Try to detect the positive and negative indices by label keywords (Finnish + English)
  const tidotLower = tidotArr.map(s => (s || "").toLowerCase());
  let posIndex = tidotLower.findIndex(s => /voitto|gain|positive|positiv|inbound|tulo|tulleet|saapuneet|arrival/i.test(s));
  let negIndex = tidotLower.findIndex(s => /tappio|loss|negative|negat|outbound|lähtö|lähteneet|lähtöön|departure/i.test(s));

  // If detection fails, pick 0 and 1 as user expected alternating values
  if (posIndex === -1) posIndex = 0;
  if (negIndex === -1) negIndex = (posIndex === 0) ? 1 : 0;

  console.log("tidot labels:", tidotArr, "posIndex:", posIndex, "negIndex:", negIndex);

  // helper to compute a flat index into the flattened values array
  function flatIndexFor(indicesByDimName) {
    // indicesByDimName is an object mapping dimensionName -> index
    let idx = 0;
    for (let j = 0; j < dims.length; j++) {
      const dimName = dims[j];
      const dimIndex = (typeof indicesByDimName[dimName] === 'number') ? indicesByDimName[dimName] : 0;
      // sum digit-by-digit: add (dimIndex * strides[j]) to idx
      idx = idx + (dimIndex * strides[j]);
    }
    return idx;
  }

  // Build a mapping keyed by areaKey (the PX key)
  const migrationMap = {};
  for (const areaKey in areaIndexMap) {
    const areaIdx = areaIndexMap[areaKey];

    // build indices object for pos and neg
    const indicesPos = {};
    const indicesNeg = {};
    dims.forEach(d => {
      if (d === areaDim) {
        indicesPos[d] = areaIdx;
        indicesNeg[d] = areaIdx;
      } else if (d === tidotDim) {
        indicesPos[d] = posIndex;
        indicesNeg[d] = negIndex;
      } else {
        // if the dimension has only size 1 pick 0, else pick 0 (you can customize to choose a particular year)
        indicesPos[d] = 0;
        indicesNeg[d] = 0;
      }
    });

    const flatPos = flatIndexFor(indicesPos);
    const flatNeg = flatIndexFor(indicesNeg);

    const posVal = (flatPos >= 0 && flatPos < values.length) ? values[flatPos] : null;
    const negVal = (flatNeg >= 0 && flatNeg < values.length) ? values[flatNeg] : null;

    migrationMap[areaKey] = {
      name: areaLabels[areaKey] || areaKey,
      positive: Number.isFinite(posVal) ? posVal : null,
      negative: Number.isFinite(negVal) ? negVal : null
    };
  }

  console.log("Built migrationMap with", Object.keys(migrationMap).length, "areas");



  geojsonLayer.eachLayer(layer => {
    if (!layer.feature || !layer.feature.properties) return;

    const props = layer.feature.properties;
    // possible properties for municipality code/name (depends on GeoJSON)
    const geoCodeCandidates = [
      props.kunta,        // your original
      props.Kunta,
      props.kunta_koodi,
      props.kunta_code,
      props.code,
      props.id
    ].filter(Boolean).map(String);

    const geoName = (props.name || props.nimi || props.Nimi || "").toString();

    let mig = null;

    // 1) try direct code match
    for (const c of geoCodeCandidates) {
      if (migrationMap[c]) { mig = migrationMap[c]; break; }
    }

    // 2) try padded code match (leading zeros) if not found
    if (!mig) {
      const keys = Object.keys(migrationMap);
      if (keys.length) {
        const keyLen = keys[0].length;
        for (const c of geoCodeCandidates) {
          const padded = c.padStart(keyLen, '0');
          if (migrationMap[padded]) { mig = migrationMap[padded]; break; }
        }
      }
    }

    // 3) try matching by name (case-insensitive, exact or contains)
    if (!mig && geoName) {
      const keys = Object.keys(migrationMap);
      const foundKey = keys.find(k => {
        const label = (migrationMap[k].name || "").toString().toLowerCase();
        const g = geoName.toLowerCase();
        return label === g || label.includes(g) || g.includes(label);
      });
      if (foundKey) mig = migrationMap[foundKey];
    }

    // Prepare popup text
    let popupHtml;
    if (mig) {
      const nf = new Intl.NumberFormat('en-US'); // you can change locale if desired
      const posText = mig.positive === null ? 'N/A' : nf.format(mig.positive);
      const negText = mig.negative === null ? 'N/A' : nf.format(mig.negative);
      popupHtml = `<b>${mig.name}</b><br>Positive migration: ${posText}<br>Negative migration: ${negText}`;
    } else {
      popupHtml = `<b>${geoName || "Unknown municipality"}</b><br>No migration data found`;
      console.warn("No migration data for feature:", props, "candidates:", geoCodeCandidates);
    }

    layer.bindPopup(popupHtml);
  });
}