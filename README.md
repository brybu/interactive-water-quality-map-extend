# Interactive Water Quality Map

**Live Demo:** [View on Netlify] https://bryanb-portfolio-site.netlify.app/ 

This project is part of my data-driven portfolio. It shows how geospatial data and cloud data integration can create visualizations for understanding the correlation between biological and chemical water treatment and nutrient levels. The application connects **Supabase** (Postgres + API backend) with **Leaflet.js** to display water quality data. **QGIS** Vector and Raster data was also used. Nutrient samples were collected by me, other files include Census, national landcover databases, elevation data, and Tiger Line data. Much of the original backend SQL cleanup was done with **PostgreSQL** in pgadmin and with **PostGIS**.

---

## Features
- **Interactive Leaflet map** with markers at sampling sites  
- **Color-coded phosphate levels** (green → safe, red → high)  
- **Popups with detailed sample data**: phosphates (PO₄), ammonia (NH₃), nitrites (NO₂), and pH  
- **Legend with expanded chemical names** for clarity  
- **Dynamic filters** for year/month (only show periods with available data)  
- **Responsive layout** for mobile & desktop  

---

## Tech Stack
- [Leaflet.js](https://leafletjs.com/) for interactive mapping  
- [Supabase](https://supabase.com/) for data storage & API access  
- **HTML, CSS, JavaScript** (vanilla, no framework required)  
- **Netlify** for deployment & continuous integration  

---

## Data Source
The app connects to read-only Supabase views, ensuring data security and integrity.  
- View: `vw_latest_samples` → returns latest sample data by site  
- Additional views include treatment records and land cover summaries (future projects).  

---

## How to Run Locally
1. Clone this repository:
   ```bash
   git clone https://github.com/brybu/interactive-water-quality-map-extend.git
   cd interactive-water-quality-map-extend
