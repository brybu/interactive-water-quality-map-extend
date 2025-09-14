// ==========================================
// Supabase client
// ==========================================
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// ==========================================
// Leaflet map setup
// ==========================================
const map = L.map('map').setView([41.323, -96.15], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ==========================================
// Legend: Land cover categories
// ==========================================
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = `
    <h4>Land Cover Types</h4>
    <i style="background:#1f77b4"></i> Urban<br/>
    <i style="background:#2ca02c"></i> Agriculture<br/>
    <i style="background:#17becf"></i> Water<br/>
    <i style="background:#bcbd22"></i> Open<br/>
  `;
  return div;
};
legend.addTo(map);

// ==========================================
// Color function: strongest land cover
// ==========================================
function zoneColor(row) {
  const values = [
    { type: 'urban', val: row.percent_urban, color: '#1f77b4' },
    { type: 'ag', val: row.percent_ag, color: '#2ca02c' },
    { type: 'water', val: row.percent_water, color: '#17becf' },
    { type: 'open', val: row.percent_open, color: '#bcbd22' }
  ];
  values.sort((a, b) => (b.val || 0) - (a.val || 0));
  return values[0].color;
}

// ==========================================
// Load Zones
// ==========================================
async function loadZones() {
  const msg = document.getElementById('msg');
  msg.textContent = 'Loading zones…';

  const { data, error } = await supabase
    .from('vw_zone_landcover_map')
    .select('*')
    .limit(1000);

  if (error) {
    console.error(error);
    msg.textContent = 'Error loading zones.';
    return;
  }

  // Convert geometry → GeoJSON FeatureCollection
  const geojson = {
    type: "FeatureCollection",
    features: data.map(row => ({
      type: "Feature",
      geometry: row.geometry, // already an object
      properties: row
    }))
  };

  // Add to map
  let firstLayer = null;

  const layer = L.geoJSON(geojson, {
    style: f => ({
      color: '#333',
      weight: 2,
      fillColor: zoneColor(f.properties),
      fillOpacity: 0.4
    }),
    onEachFeature: (feature, lyr) => {
      const p = feature.properties;
      const chartId = `chart-${p.zone_id}`;

      // Tooltip on hover
      lyr.bindTooltip(`${p.zone_name}`, {
        permanent: false,
        direction: 'top'
      });

      // Popup with donut + raw values
      lyr.bindPopup(`
        <b>${p.zone_name}</b><br/>
        Urban: ${p.percent_urban ?? 0}%<br/>
        Ag: ${p.percent_ag ?? 0}%<br/>
        Water: ${p.percent_water ?? 0}%<br/>
        Open: ${p.percent_open ?? 0}%<br/>
        <canvas id="${chartId}" width="120" height="120"></canvas>
      `);

      // Render chart when popup opens
      lyr.on('popupopen', () => {
        const ctx = document.getElementById(chartId);
        if (!ctx) return;

        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Urban', 'Ag', 'Water', 'Open'],
            datasets: [{
              data: [
                p.percent_urban ?? 0,
                p.percent_ag ?? 0,
                p.percent_water ?? 0,
                p.percent_open ?? 0
              ],
              backgroundColor: ['#1f77b4', '#2ca02c', '#17becf', '#bcbd22'],
              borderWidth: 1
            }]
          },
          options: {
            plugins: { legend: { display: false } },
            responsive: false,
            maintainAspectRatio: false
          }
        });
      });

      // Save the first layer so we can auto-open its popup later
      if (!firstLayer) {
        firstLayer = lyr;
      }
    }
  }).addTo(map);

  map.fitBounds(layer.getBounds());
  msg.textContent = `Loaded ${data.length} zones. Click a zone to view details.`;

  // Automatically open popup for the first zone
  if (firstLayer) {
    firstLayer.openPopup();
  }
}

// ==========================================
// Initialize
// ==========================================
loadZones();
