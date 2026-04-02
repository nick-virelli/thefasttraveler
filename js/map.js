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

  // ISO 3166-1 numeric IDs per continent key (world-atlas countries-110m.json)
  var CONTINENT_IDS = {
    "north-america": [
      124, 484, 840, 304,
      28, 44, 52, 60, 84, 92, 136, 188, 192, 212, 214, 222, 308, 312,
      320, 332, 340, 388, 474, 500, 531, 533, 534, 535, 558, 591,
      630, 652, 659, 660, 662, 663, 666, 670, 780, 796, 850
    ],
    "south-america": [32, 68, 76, 152, 170, 218, 238, 239, 254, 328, 600, 604, 740, 858, 862],
    "europe": [
      8, 20, 40, 56, 70, 100, 112, 191, 203, 208, 233, 234, 246, 248,
      250, 276, 292, 300, 336, 348, 352, 372, 380, 428, 438, 440, 442,
      470, 492, 498, 499, 528, 578, 616, 620, 642, 643, 674, 688, 703,
      705, 724, 744, 752, 756, 804, 807, 826, 831, 832, 833
    ],
    "africa": [
      12, 24, 72, 86, 108, 120, 132, 140, 148, 174, 175, 178, 180, 204,
      226, 231, 232, 262, 266, 270, 288, 324, 384, 404, 426, 430, 434,
      450, 454, 466, 478, 480, 504, 508, 516, 562, 566, 624, 638, 646,
      654, 678, 690, 694, 706, 710, 716, 728, 729, 732, 768, 788, 800,
      818, 834, 854, 894
    ],
    "asia": [
      4, 31, 48, 50, 64, 96, 104, 116, 144, 156, 196, 268, 275, 344, 356,
      360, 364, 368, 376, 392, 398, 400, 408, 410, 414, 417, 418, 422,
      446, 458, 462, 496, 512, 524, 586, 608, 626, 634, 682, 702, 704,
      760, 762, 764, 784, 792, 795, 860, 887
    ],
    "oceania": [
      36, 90, 162, 166, 184, 242, 258, 296, 316, 334, 520, 540, 548,
      554, 570, 574, 580, 581, 583, 584, 585, 598, 612, 772, 776, 798, 882, 876
    ]
  };

  var CONTINENT_LABELS = {
    "north-america": "North America",
    "south-america": "South America",
    "europe": "Europe",
    "africa": "Africa",
    "asia": "Asia",
    "oceania": "Oceania"
  };

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

  function getContinentsWithPosts() {
    var visited = {};
    posts.forEach(function (p) {
      if (p.continent) visited[p.continent] = true;
    });
    return visited;
  }

  function getVisitedCityBounds() {
    var visitedContinents = getContinentsWithPosts();
    var lats = [], lons = [];
    Object.keys(mapData.continents).forEach(function (ck) {
      if (!visitedContinents[ck]) return;
      getCitiesForContinent(ck).forEach(function (city) {
        lats.push(city.lat);
        lons.push(city.lon);
      });
    });
    if (!lats.length) return null;
    return L.latLngBounds(
      [Math.min.apply(null, lats) - 5, Math.min.apply(null, lons) - 15],
      [Math.max.apply(null, lats) + 5, Math.max.apply(null, lons) + 15]
    );
  }

  function getContinentBloggedBounds(continentKey) {
    var bloggedCities = {};
    posts.forEach(function (p) {
      if (p.continent === continentKey) bloggedCities[p.city] = true;
    });
    var cities = getCitiesForContinent(continentKey).filter(function (c) {
      return bloggedCities[c.name];
    });
    if (!cities.length) cities = getCitiesForContinent(continentKey);
    if (!cities.length) return null;
    var lats = cities.map(function (c) { return c.lat; });
    var lons = cities.map(function (c) { return c.lon; });
    return L.latLngBounds(
      [Math.min.apply(null, lats) - 3, Math.min.apply(null, lons) - 5],
      [Math.max.apply(null, lats) + 3, Math.max.apply(null, lons) + 5]
    );
  }

  function buildContinentGeoFromTopology(topology) {
    var features = [];
    Object.keys(CONTINENT_IDS).forEach(function (key) {
      var ids = CONTINENT_IDS[key];
      var geos = topology.objects.countries.geometries.filter(function (g) {
        return ids.indexOf(+g.id) !== -1;
      });
      if (!geos.length) return;
      try {
        var merged = topojson.merge(topology, geos);
        if (!merged) return;
        features.push({
          type: "Feature",
          properties: { key: key, label: CONTINENT_LABELS[key] },
          geometry: merged
        });
      } catch (_) {}
    });
    return { type: "FeatureCollection", features: features };
  }

  function showContinent(continentKey) {
    var c = mapData.continents[continentKey];
    if (!c) return;
    if (cityLayer) {
      map.removeLayer(cityLayer);
      cityLayer = null;
    }

    var bounds = getContinentBloggedBounds(continentKey);
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] });

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
    var bounds = getVisitedCityBounds();
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      map.setView([20, 0], 2);
    }
    if (controlsEl) controlsEl.style.display = "none";
  }

  function initMap(geoData) {
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

    var visitedContinents = getContinentsWithPosts();

    if (geoData) {
      var layer = L.geoJSON(geoData, {
        style: function () {
          return {
            color: "#aaa",
            fillColor: "transparent",
            fillOpacity: 0,
            weight: 0.5,
            opacity: 0.5
          };
        },
        onEachFeature: function (feature, l) {
          var key = feature && feature.properties ? feature.properties.key : null;
          var label = feature && feature.properties ? feature.properties.label : null;
          var isVisited = key && visitedContinents[key];

          if (label) l.bindTooltip(label, { permanent: false, direction: "center" });

          l.on("mouseover", function () {
            l.setStyle({
              fillColor: isVisited ? accent : "#888",
              fillOpacity: isVisited ? 0.22 : 0.10,
              color: isVisited ? accent : "#999",
              weight: isVisited ? 1.5 : 0.5,
              opacity: isVisited ? 0.8 : 0.5
            });
          });

          l.on("mouseout", function () {
            l.setStyle({
              fillColor: "transparent",
              fillOpacity: 0,
              color: "#aaa",
              weight: 0.5,
              opacity: 0.5
            });
          });

          l.on("click", function () {
            if (!key) return;
            showContinent(key);
          });
        }
      });
      layer.addTo(map);
      continentLayers.push(layer);
    }

    var initialBounds = getVisitedCityBounds();
    if (initialBounds) {
      map.fitBounds(initialBounds, { padding: [40, 40] });
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
      var geoFallback = (window.__CONTINENTS_GEOJSON__) || null;
      buildSpecialIndexes();
      renderSpecialSidebar();
      initMap(geoFallback);
      return;
    }

    var topoPromise = fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(function (r) { return r.json(); })
      .catch(function () {
        return fetch("data/continents.geojson").then(function (r) { return r.json(); });
      });

    Promise.all([
      fetch("data/map-data.json").then(function (r) { return r.json(); }),
      fetch("data/posts.json").then(function (r) { return r.json(); }),
      fetch("data/special-posts.json").then(function (r) { return r.json(); }),
      topoPromise
    ]).then(function (results) {
      mapData = results[0];
      posts = (results[1].posts) || [];
      specialPosts = (results[2].posts) || [];
      var topoOrGeo = results[3];

      var geoData = null;
      if (topoOrGeo && topoOrGeo.type === "Topology" && typeof topojson !== "undefined") {
        geoData = buildContinentGeoFromTopology(topoOrGeo);
      } else if (topoOrGeo && topoOrGeo.type === "FeatureCollection") {
        geoData = topoOrGeo;
      }

      buildSpecialIndexes();
      renderSpecialSidebar();
      initMap(geoData);
    }).catch(function () {
      container.innerHTML = "<p>Could not load map. Check that data/map-data.json exists.</p>";
      if (specialListEl) specialListEl.innerHTML = "<p class=\"post-meta\">Could not load special posts.</p>";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
