// Replace with your Supabase details
const API_URL = "https://czqpnvfobmdlckzenfts.supabase.co/rest/v1/vw_kpi_samples";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6cXBudmZvYm1kbGNremVuZnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzUwNTIsImV4cCI6MjA3MjYxMTA1Mn0.F3TQPMfU7hBT67XZxSo4Ja8EpuL4klzLG_lHkPTxiH4";

// Initialize map
const map = L.map("map").setView([41.3, -96.1], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

let pointLayer;

// Color scale for ammonia
function getAmmoniaColor(value) {
  if (value < 0.1) return "green";
  if (value < 0.25) return "yellow";
  if (value < 0.5) return "orange";
  return "red";
}

// Load dates for dropdown
async function loadSampleDates() {
  const res = await fetch(`${API_URL}?select=sample_date`, {
    headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` }
  });
  const data = await res.json();
  console.log("Dates returned:", data);

  const uniqueDates = [...new Set(data.map(d => d.sample_date))].sort();
  const dropdown = document.getElementById("sampleDate");

  dropdown.innerHTML = '<option value="">--Select--</option>';
  uniqueDates.forEach(date => {
    const opt = document.createElement("option");
    opt.value = date;
    opt.textContent = date;
    dropdown.appendChild(opt);
  });
}

// Load points + KPIs for a date
async function loadDataForDate(date) {
  const res = await fetch(`${API_URL}?sample_date=eq.${date}`, {
    headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` }
  });
  const data = await res.json();
  console.log("Data for date:", date, data);

  // Update points
  if (pointLayer) map.removeLayer(pointLayer);
  pointLayer = L.layerGroup(
    data.map(d =>
      L.circleMarker([d.latitude, d.longitude], {
        radius: 8,
        fillColor: getAmmoniaColor(d.ammonia_ppm),
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).bindPopup(`
        <b>Date:</b> ${d.sample_date}<br>
        <b>Ammonia:</b> ${d.ammonia_ppm} ppm<br>
        <b>Phosphate:</b> ${d.phosphates_ppm} ppm<br>
        <b>Nitrite:</b> ${d.nitrites_ppm} ppm
      `)
    )
  ).addTo(map);

  // Update KPIs (average values for selected date)
  if (data.length > 0) {
    const avgPhosphate = (data.reduce((a, b) => a + b.phosphates_ppm, 0) / data.length).toFixed(2);
    const avgAmmonia = (data.reduce((a, b) => a + b.ammonia_ppm, 0) / data.length).toFixed(2);
    const avgNitrite = (data.reduce((a, b) => a + b.nitrites_ppm, 0) / data.length).toFixed(2);

    document.getElementById("phosphate").textContent = avgPhosphate;
    document.getElementById("ammonia").textContent = avgAmmonia;
    document.getElementById("nitrite").textContent = avgNitrite;
  } else {
    document.getElementById("phosphate").textContent = "-";
    document.getElementById("ammonia").textContent = "-";
    document.getElementById("nitrite").textContent = "-";
  }
}

// Event listener for dropdown
document.getElementById("sampleDate").addEventListener("change", e => {
  if (e.target.value) loadDataForDate(e.target.value);
});

// Initial load
loadSampleDates();
