// app_timeslider.js

const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

(async function () {
  const msg = document.getElementById("msg");

  try {
    // 1. Fetch data
    const { data, error } = await supabase
      .from("vw_timeseries_nutrients")
      .select("location_id, latitude, longitude, sample_date, ammonia_ppm");

    if (error) throw error;
    console.log("Time series data:", data);

    // 2. Collect unique dates
    const dates = [...new Set(data.map(d => d.sample_date))].sort();
    console.log("Unique sample dates:", dates);

    // 3. Convert to GeoJSON with time
    const geojson = {
      type: "FeatureCollection",
      features: data.map(d => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [d.longitude, d.latitude]
        },
        properties: {
          time: new Date(d.sample_date).toISOString(),
          ammonia: d.ammonia_ppm,
          location_id: d.location_id
        }
      }))
    };

    // 4. Initialize map with time dimension
    const map = L.map("map", {
      center: [41.32, -96.15],
      zoom: 13,
      timeDimension: true,
      timeDimensionOptions: {
        times: dates.map(d => new Date(d).toISOString()),
        currentTime: new Date(dates[0]).toISOString()
      },
      timeDimensionControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // 5. Color scale
    function getColor(v) {
      return v <= 0.1 ? "#1a9850" :
             v <= 0.25 ? "#fee08b" :
             v <= 0.5 ? "#fc8d59" :
                         "#d73027";
    }

    // 6. Base GeoJSON layer
    const baseGeoJson = L.geoJson(geojson, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: getColor(feature.properties.ammonia),
          color: "#000",
          weight: 1,
          fillOpacity: 0.8
        }).bindPopup(`
          <b>Location:</b> ${feature.properties.location_id}<br/>
          <b>Date:</b> ${feature.properties.time}<br/>
          <b>Ammonia:</b> ${feature.properties.ammonia} ppm
        `);
      }
    });

    // 7. Wrap it in a time-dimension layer
    const tdLayer = L.timeDimension.layer.geoJson(baseGeoJson, {
      updateTimeDimension: true,
      updateTimeDimensionMode: "replace",
      addlastPoint: false
    });

    tdLayer.addTo(map);

    // 8. Legend
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "legend");
      div.innerHTML = "<b>Ammonia (ppm)</b><br>";
      const grades = [0.1, 0.25, 0.5];
      const labels = ["≤0.1", "0.1–0.25", "0.25–0.5", ">0.5"];
      for (let i = 0; i < labels.length; i++) {
        div.innerHTML +=
          '<i style="background:' + getColor(grades[i] + 0.001) + '"></i> ' +
          labels[i] + "<br>";
      }
      return div;
    };
    legend.addTo(map);

    msg.textContent = `Loaded ${data.length} samples.`;

  } catch (err) {
    console.error("Error loading time series:", err);
    msg.textContent = "Error loading time series: " + (err.message || err);
  }
})();
