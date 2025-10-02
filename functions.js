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

let geojsonLayer;

fetch(url)
  .then(r => r.json())
  .then(data => {
    console.log("GeoJSON loaded:", data);

    geojsonLayer = L.geoJSON(data, {
      style: { weight: 2 }, // initial style, will be overridden later
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.name) {
          layer.bindTooltip(feature.properties.name, { sticky: true });
        }
      }
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());

    initializeCode();
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

const initializeCode = async () => {
  // adjust path if necessary
  const migrationBody = await (await fetch("/Week_5/migration_data_query.json")).json();
  const migrationData = await fetchStatsFinData(migrationUrl, migrationBody);

  setupMigrationPopups(migrationData);
};

function setupMigrationPopups(migrationData) {
  const municipalityNamesObj = migrationData.dimension.Alue.category.label;
  const municipalityCodesArray = Object.keys(municipalityNamesObj);
  const values = migrationData.value;

  const migrationMap = {};
  for (let i = 0; i < municipalityCodesArray.length; i++) {
    const code = municipalityCodesArray[i];
    const pos = values[i * 2];
    const neg = values[i * 2 + 1];
    migrationMap[code] = {
      name: municipalityNamesObj[code],
      positive: pos,
      negative: neg
    };
  }

  // Apply dynamic style based on migration data
  geojsonLayer.setStyle(feature => {
    if (!feature.properties || !feature.properties.kunta) {
      return { color: "hsl(0, 0%, 80%)", weight: 2 };
    }

    const code = feature.properties.kunta;
    const mig = migrationMap[code];

    if (!mig || !mig.positive || !mig.negative || mig.negative === 0) {
      return { color: "hsl(0, 0%, 80%)", weight: 2 }; // fallback gray
    }

    let hue = Math.pow(mig.positive / mig.negative, 3) * 60;
    if (hue > 120) hue = 120;

    return {
      color: `hsl(${hue}, 75%, 50%)`,
      weight: 2
    };
  });

  // Add popups
  geojsonLayer.eachLayer(layer => {
    if (layer.feature && layer.feature.properties && layer.feature.properties.kunta) {
      const code = layer.feature.properties.kunta;
      const mig = migrationMap[code];
      if (mig) {
        layer.bindPopup(`
          <b>${mig.name}</b><br>
          Positive migration: ${mig.positive}<br>
          Negative migration: ${mig.negative}
        `);
      }
    }
  });
}
