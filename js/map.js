(function () {
  var mapData = null;
  var posts = [];
  var container = document.getElementById("map-container");
  var postEl = document.getElementById("post-display");
  var controlsEl = document.getElementById("map-controls");
  var backBtn = document.getElementById("back-to-world");

  if (!container) return;

  var map = null;
  var cityLayer = null;
  var continentLayers = [];

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatContent(text) {
    if (!text) return "";
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function showPost(continent, region, cityName) {
    var post = posts.find(function (p) {
      return p.continent === continent && p.region === region && p.city === cityName;
    });
    if (!postEl) return;
    if (!post) {
      postEl.innerHTML = "<p class=\"post-meta\">No post for this city yet.</p>";
      postEl.classList.add("post-display");
      return;
    }
    var d = post.date ? new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
    postEl.innerHTML =
      "<h2>" + escapeHtml(post.title) + "</h2>" +
      "<p class=\"post-meta\">" + escapeHtml(cityName) + (d ? " · " + d : "") + "</p>" +
      "<div class=\"post-content\">" + formatContent(post.content) + "</div>";
    postEl.classList.add("post-display");
    postEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getCitiesForContinent(continentKey) {
    var list = [];
    var c = mapData.continents[continentKey];
    if (!c || !c.regions) return list;
    Object.entries(c.regions).forEach(function ([regionKey, r]) {
      (r.cities || []).forEach(function (city) {
        var name = typeof city === "object" && city.name ? city.name : city;
        var lat = typeof city === "object" && city.lat != null ? city.lat : null;
        var lon = typeof city === "object" && city.lon != null ? city.lon : null;
        if (lat != null && lon != null) list.push({ continent: continentKey, region: regionKey, name: name, lat: lat, lon: lon });
      });
    });
    return list;
  }

  function showContinent(continentKey) {
    var c = mapData.continents[continentKey];
    if (!c || !c.bounds) return;
    if (cityLayer) {
      map.removeLayer(cityLayer);
      cityLayer = null;
    }
    var b = c.bounds;
    var bounds = L.latLngBounds([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
    map.fitBounds(bounds, { maxZoom: 5, padding: [20, 20] });
    if (controlsEl) controlsEl.style.display = "block";

    cityLayer = L.layerGroup();
    var cities = getCitiesForContinent(continentKey);
    cities.forEach(function (item) {
      var marker = L.marker([item.lat, item.lon]);
      marker.bindTooltip(item.name, { permanent: false, direction: "top" });
      marker.on("click", function () {
        showPost(item.continent, item.region, item.name);
      });
      marker.addTo(cityLayer);
    });
    cityLayer.addTo(map);
  }

  function backToWorld() {
    if (cityLayer) {
      map.removeLayer(cityLayer);
      cityLayer = null;
    }
    map.setView([20, 0], 2);
    if (controlsEl) controlsEl.style.display = "none";
  }

  function initMap() {
    container.innerHTML = "<div id=\"leaflet-map\" class=\"leaflet-map\"></div>";
    var mapEl = document.getElementById("leaflet-map");
    if (!mapEl) return;

    map = L.map("leaflet-map", { zoomControl: true }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
      maxZoom: 19,
    }).addTo(map);

    var boundsStyle = {
      color: "var(--accent)",
      fillColor: "var(--accent)",
      fillOpacity: 0.15,
      weight: 2,
    };
    if (typeof getComputedStyle !== "undefined") {
      var root = document.documentElement;
      var accent = getComputedStyle(root).getPropertyValue("--accent").trim() || "#2d5a4a";
      boundsStyle.color = accent;
      boundsStyle.fillColor = accent;
    }

    Object.entries(mapData.continents).forEach(function ([key, c]) {
      if (!c.bounds || c.bounds.length < 2) return;
      var b = c.bounds;
      var bounds = L.latLngBounds([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
      var rect = L.rectangle(bounds, boundsStyle);
      rect.continentKey = key;
      rect.on("click", function () {
        showContinent(key);
      });
      rect.bindTooltip(c.label, { permanent: false, direction: "center" });
      rect.addTo(map);
      continentLayers.push(rect);
    });

    if (backBtn) backBtn.addEventListener("click", backToWorld);
  }

  function init() {
    var isFile = typeof location !== "undefined" && location.protocol === "file:";
    var hasInline = typeof window.__MAP_DATA__ !== "undefined" && typeof window.__POSTS__ !== "undefined";
    if (isFile && hasInline) {
      mapData = window.__MAP_DATA__;
      posts = (window.__POSTS__ && window.__POSTS__.posts) || [];
      initMap();
      return;
    }
    Promise.all([
      fetch("data/map-data.json").then(function (r) { return r.json(); }),
      fetch("data/posts.json").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      mapData = results[0];
      posts = (results[1].posts) || [];
      initMap();
    }).catch(function () {
      container.innerHTML = "<p>Could not load map. Check that data/map-data.json and data/posts.json exist.</p>";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
