// --- Supabase client ---
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// --- Leaflet map ---
const map = L.map('map').setView([41.323, -96.15], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Legend
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

// Color function
function phosphateColor(ppm) {
  if (ppm == null) return '#666';
  if (ppm < 0.1) return '#2ecc71';
  if (ppm < 0.25) return '#f1c40f';
  if (ppm < 0.5) return '#e67e22';
  return '#e74c3c';
}

// Globals for raw data (so we can build filters from what actually exists)
let ALL_ROWS = [];

// Populate filters from data actually present
function buildFilterOptions(rows) {
  const years = [...new Set(rows
    .map(r => r.sample_date ? new Date(r.sample_date).getFullYear() : null)
    .filter(Boolean)
  )].sort((a,b) => a-b);

  const yearSel = document.getElementById('yearSelect');
  yearSel.innerHTML = '<option value="">All</option>';
  years.forEach(y => {
    const opt = document.createElement('option'); opt.value = y; opt.textContent = y;
    yearSel.appendChild(opt);
  });

  // Month options will depend on selected year; set when year changes
  const monthSel = document.getElementById('monthSelect');
  function setMonthsForYear(y) {
    monthSel.innerHTML = '<option value="">All</option>';
    const months = [...new Set(rows
      .filter(r => !y || new Date(r.sample_date).getFullYear() === Number(y))
      .map(r => new Date(r.sample_date).getMonth()+1)
    )].sort((a,b)=>a-b);
    const names = [,'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    months.forEach(m => {
      const opt = document.createElement('option'); opt.value = m; opt.textContent = names[m];
      monthSel.appendChild(opt);
    });
  }
  setMonthsForYear('');

  // Show the filter box only if there’s something to filter
  document.getElementById('filters').style.display = years.length ? 'block' : 'none';

  yearSel.onchange = () => setMonthsForYear(yearSel.value);
}

// Draw markers for a set of rows
function drawRows(rows) {
  // Remove previous markers (CircleMarker only)
  const toRemove = [];
  map.eachLayer(l => { if (l instanceof L.CircleMarker) toRemove.push(l); });
  toRemove.forEach(l => map.removeLayer(l));

  const bounds = [];
  rows.forEach(row => {
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
    `).addTo(map);
  });

  if (bounds.length) map.fitBounds(bounds, { padding: [20,20] });
  document.getElementById('msg').textContent = `Plotted ${rows.length} sample sites.`;
}

// Apply current filter selections to ALL_ROWS
function applyFilters() {
  const y = document.getElementById('yearSelect').value;
  const m = document.getElementById('monthSelect').value;

  const filtered = ALL_ROWS.filter(r => {
    if (!r.sample_date) return false;
    const d = new Date(r.sample_date);
    const yr = d.getFullYear();
    const mo = d.getMonth()+1;
    if (y && yr !== Number(y)) return false;
    if (m && mo !== Number(m)) return false;
    return true;
  });

  drawRows(filtered);
}

// Reset filters
function resetFilters() {
  document.getElementById('yearSelect').value = '';
  document.getElementById('monthSelect').value = '';
  applyFilters();
}

// Wire buttons
document.getElementById('applyFilters').addEventListener('click', applyFilters);
document.getElementById('resetFilters').addEventListener('click', resetFilters);

// Initial load (grab enough rows for your latest-sample view)
(async function init() {
  const msg = document.getElementById('msg');
  msg.textContent = 'Loading…';

  // NOTE: If your view already returns only the latest per site, great.
  // If it returns many rows per site, bump the limit or add filters.
  const { data, error } = await supabase
    .from('vw_latest_samples')
    .select('*')
    .limit(1000);

  if (error) {
    console.error(error);
    msg.textContent = 'Error loading samples.';
    return;
  }

  ALL_ROWS = data || [];
  buildFilterOptions(ALL_ROWS);
  drawRows(ALL_ROWS);
})();
