// ==========================================
// Supabase client
// ==========================================
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// ==========================================
// Leaflet map
// ==========================================
const map = L.map('map').setView([41.323, -96.15], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ==========================================
// Legend: Phosphates
// ==========================================
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = `
    <h4>Phosphate (ppm)</h4>
    <i style="background:#2ecc71"></i> <0.1<br/>
    <i style="background:#f1c40f"></i> 0.1 – 0.25<br/>
    <i style="background:#e67e22"></i> 0.25 – 0.5<br/>
    <i style="background:#e74c3c"></i> >0.5
    <div class="chem">
      <b>PO₄</b> = Phosphates<br/>
      <b>NH₃</b> = Ammonia<br/>
      <b>NO₂</b> = Nitrite
    </div>
  `;
  return div;
};
legend.addTo(map);

// ==========================================
// Color functions
// ==========================================
function phosphateColor(ppm) {
  if (ppm == null) return '#666';
  if (ppm < 0.1) return '#2ecc71';
  if (ppm < 0.25) return '#f1c40f';
  if (ppm < 0.5) return '#e67e22';
  return '#e74c3c';
}

function colorByTreatmentType(t) {
  const s = (t || '').toLowerCase();
  if (s.includes('alga')) return '#1f77b4';        // algaecide
  if (s.includes('bacteria')) return '#2ca02c';    // bacteria
  if (s.includes('phosphate')) return '#d62728';   // phosphate binder
  return '#7f7f7f';                                // other
}

// ==========================================
// Layers
// ==========================================
const samplesLayer = L.layerGroup().addTo(map);
const treatmentsLayer = L.layerGroup().addTo(map);

// Checkbox toggle for treatments
document.getElementById('toggleTreatments').addEventListener('change', (e) => {
  e.target.checked ? map.addLayer(treatmentsLayer) : map.removeLayer(treatmentsLayer);
});

// ==========================================
// Load Samples (Project #1)
// ==========================================
async function loadSamples() {
  const msg = document.getElementById('msg');
  msg.textContent = 'Loading samples…';

  const { data, error } = await supabase
    .from('vw_latest_samples')
    .select('*')
    .limit(1000);

  if (error) {
    console.error(error);
    msg.textContent = 'Error loading samples.';
    return;
  }

  samplesLayer.clearLayers();
  const bounds = [];

  data.forEach(row => {
    if (row.latitude == null || row.longitude == null) return;
    const p = [row.latitude, row.longitude];
    bounds.push(p);

    L.circleMarker(p, {
      radius: Math.max(4, Math.min(12, (row.phosphates_ppm || 0) * 20)),
      color: phosphateColor(row.phosphates_ppm),
      weight: 1,
      fillOpacity: 0.7
    }).bindPopup(`
      <b>${row.sample_location || 'Site'}</b><br/>
      <small>${row.sample_date ? new Date(row.sample_date).toLocaleDateString() : ''}</small><br/>
      Phosphates (PO₄): ${row.phosphates_ppm ?? '—'} ppm<br/>
      Ammonia (NH₃): ${row.ammonia_ppm ?? '—'} ppm<br/>
      Nitrite (NO₂): ${row.nitrites_ppm ?? '—'} ppm<br/>
      pH: ${row.ph ?? '—'}
    `).addTo(samplesLayer);
  });

  if (bounds.length) map.fitBounds(bounds, { padding: [20,20] });
  msg.textContent = `Plotted ${data.length} sample sites.`;
}

// ==========================================
// Load Treatments (Project #2)
// ==========================================
async function loadTreatments() {
  const { data, error } = await supabase
    .from('vw_treatments_geo')
    .select('*')
    .order('treatment_date', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error loading treatments:', error);
    return;
  }

  treatmentsLayer.clearLayers();

  data.forEach(row => {
    if (row.latitude == null || row.longitude == null) return;

    L.circleMarker([row.latitude, row.longitude], {
      radius: 6,
      color: colorByTreatmentType(row.treatment_type),
      weight: 2,
      fillOpacity: 0.7
    })
    .bindPopup(`
      <b>${row.sample_location || 'Location'}</b><br/>
      <small>${row.treatment_date ? new Date(row.treatment_date).toLocaleDateString() : ''}</small><br/>
      <b>${row.treatment_type || 'Treatment'}</b><br/>
      Product: ${row.product_name ?? '—'}<br/>
      Dose: ${row.dose_applied ?? '—'} ${row.unit ?? ''}
    `)
    .addTo(treatmentsLayer);
  });
}

// ==========================================
// Optional: Treatment legend
// ==========================================
const tLegend = L.control({ position: 'bottomleft' });
tLegend.onAdd = () => {
  const d = L.DomUtil.create('div', 'legend');
  d.innerHTML = `
    <h4>Treatment Type</h4>
    <i style="background:#1f77b4"></i> Algaecide<br/>
    <i style="background:#2ca02c"></i> Bacteria<br/>
    <i style="background:#d62728"></i> Phosphate Binder<br/>
    <i style="background:#7f7f7f"></i> Other
  `;
  return d;
};
tLegend.addTo(map);

// ==========================================
// Initialize
// ==========================================
(async function init() {
  await loadSamples();
  await loadTreatments();
})();
