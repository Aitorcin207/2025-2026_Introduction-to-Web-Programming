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

    // Fit map to GeoJSON bounds
    map.fitBounds(geojsonLayer.getBounds());
  })
  .catch(err => console.error("GeoJSON fetch error:", err));
