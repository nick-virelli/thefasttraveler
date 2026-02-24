(function () {
  var mapData = null;
  var posts = [];
  var specialPosts = [];
  var specialById = {};
  var cityToSpecialIds = {};
  var container = document.getElementById("map-container");
  var postEl = document.getElementById("post-display");
  var controlsEl = document.getElementById("map-controls");
  var backBtn = document.getElementById("back-to-world");
  var specialListEl = document.getElementById("special-posts-list");

  if (!container) return;

  var map = null;
  var cityLayer = null;
  var continentLayers = [];
  var continentsGeo = null;

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

  function cityKey(continent, region, city) {
    return [continent || "", region || "", city || ""].join("|");
  }

  function buildSpecialIndexes() {
    specialById = {};
    cityToSpecialIds = {};
    (specialPosts || []).forEach(function (sp) {
      specialById[sp.id] = sp;
      (sp.relatedCities || []).forEach(function (rc) {
        var key = cityKey(rc.continent, rc.region, rc.city);
        if (!cityToSpecialIds[key]) cityToSpecialIds[key] = [];
        cityToSpecialIds[key].push(sp.id);
      });
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return dateStr;
    }
  }

  function showSpecialPostById(id) {
    var sp = specialById[id];
    if (!sp || !postEl) return;
    postEl.innerHTML =
      "<h2>" + escapeHtml(sp.title) + "</h2>" +
      "<p class=\"post-meta\">" + escapeHtml(formatDate(sp.date)) + "</p>" +
      "<div class=\"post-content\">" + formatContent(sp.content) + "</div>";
    postEl.classList.add("post-display");
    postEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderSpecialSidebar() {
    if (!specialListEl) return;
    if (!specialPosts || specialPosts.length === 0) {
      specialListEl.innerHTML = "<p class=\"post-meta\">No special posts yet.</p>";
      return;
    }
    specialListEl.innerHTML = "";
    specialPosts.forEach(function (sp) {
      var item = document.createElement("div");
      item.className = "special-item";
      item.innerHTML =
        "<a href=\"#\" data-special-id=\"" + escapeHtml(sp.id) + "\">" + escapeHtml(sp.title) + "</a>" +
        "<div class=\"meta\">" + escapeHtml(formatDate(sp.date)) + "</div>";
      item.querySelector("a").addEventListener("click", function (e) {
        e.preventDefault();
        showSpecialPostById(sp.id);
      });
      specialListEl.appendChild(item);
    });
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

    var related = cityToSpecialIds[cityKey(continent, region, cityName)];
    if (related && related.length) {
      var html = "<div style=\"margin-top:1.25rem; padding-top:1.25rem; border-top:1px solid var(--border)\">" +
        "<p class=\"post-meta\"><strong>Part of these trips:</strong></p><ul style=\"margin:0; padding-left:1.2rem;\">";
      related.forEach(function (id) {
        var sp = specialById[id];
        if (!sp) return;
        html += "<li><a href=\"#\" data-special-id=\"" + escapeHtml(id) + "\">" + escapeHtml(sp.title) + "</a></li>";
      });
      html += "</ul></div>";
      postEl.innerHTML += html;
      postEl.querySelectorAll("a[data-special-id]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          showSpecialPostById(a.getAttribute("data-special-id"));
        });
      });
    }

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

  function showContinent(continentKey, boundsOverride) {
    var c = mapData.continents[continentKey];
    if (!c) return;
    if (cityLayer) {
      map.removeLayer(cityLayer);
      cityLayer = null;
    }
    var bounds = boundsOverride || null;
    if (!bounds && c.bounds) {
      var b = c.bounds;
      bounds = L.latLngBounds([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
    }
    if (bounds) map.fitBounds(bounds, { maxZoom: 5, padding: [20, 20] });
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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>",
      maxZoom: 19,
    }).addTo(map);

    var accent = "#2d5a4a";
    if (typeof getComputedStyle !== "undefined") {
      var root = document.documentElement;
      var v = getComputedStyle(root).getPropertyValue("--accent");
      if (v && v.trim()) accent = v.trim();
    }
    var boundsStyle = {
      color: accent,
      fillColor: accent,
      fillOpacity: 0.2,
      weight: 2,
    };

    continentsGeo = continentsGeo || (typeof window.__CONTINENTS_GEOJSON__ !== "undefined" ? window.__CONTINENTS_GEOJSON__ : null);
    if (continentsGeo) {
      var layer = L.geoJSON(continentsGeo, {
        style: function () { return boundsStyle; },
        onEachFeature: function (feature, l) {
          var key = feature && feature.properties ? feature.properties.key : null;
          var label = feature && feature.properties ? feature.properties.label : null;
          if (label) l.bindTooltip(label, { permanent: false, direction: "center" });
          l.on("click", function () {
            if (!key) return;
            showContinent(key, l.getBounds());
          });
        }
      });
      layer.addTo(map);
      continentLayers.push(layer);
    }

    if (backBtn) backBtn.addEventListener("click", backToWorld);
  }

  function init() {
    var isFile = typeof location !== "undefined" && location.protocol === "file:";
    var hasInline = typeof window.__MAP_DATA__ !== "undefined" && typeof window.__POSTS__ !== "undefined";
    if (isFile && hasInline) {
      mapData = window.__MAP_DATA__;
      posts = (window.__POSTS__ && window.__POSTS__.posts) || [];
      specialPosts = (window.__SPECIAL_POSTS__ && window.__SPECIAL_POSTS__.posts) || [];
      continentsGeo = (window.__CONTINENTS_GEOJSON__) || null;
      buildSpecialIndexes();
      renderSpecialSidebar();
      initMap();
      return;
    }
    Promise.all([
      fetch("data/map-data.json").then(function (r) { return r.json(); }),
      fetch("data/posts.json").then(function (r) { return r.json(); }),
      fetch("data/special-posts.json").then(function (r) { return r.json(); }),
      fetch("data/continents.geojson").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      mapData = results[0];
      posts = (results[1].posts) || [];
      specialPosts = (results[2].posts) || [];
      continentsGeo = results[3];
      buildSpecialIndexes();
      renderSpecialSidebar();
      initMap();
    }).catch(function () {
      container.innerHTML = "<p>Could not load map. Check that data/map-data.json and data/continents.geojson exist.</p>";
      if (specialListEl) specialListEl.innerHTML = "<p class=\"post-meta\">Could not load special posts.</p>";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
