(function () {
  const form = document.getElementById("add-post-form");
  const continentSelect = document.getElementById("continent");
  const regionSelect = document.getElementById("region");
  const citySelect = document.getElementById("city");

  if (!form || !continentSelect) return;

  let mapData = null;

  function loadMapData() {
    var isFile = typeof location !== "undefined" && location.protocol === "file:";
    var hasInline = typeof window.__MAP_DATA__ !== "undefined";
    if (isFile && hasInline) {
      mapData = window.__MAP_DATA__;
      return Promise.resolve(mapData);
    }
    return fetch("data/map-data.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        mapData = data;
        return data;
      });
  }

  function fillContinents() {
    continentSelect.innerHTML = "<option value=\"\">Select continent</option>";
    if (!mapData || !mapData.continents) return;
    Object.entries(mapData.continents).forEach(function ([key, c]) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = c.label;
      continentSelect.appendChild(opt);
    });
  }

  function fillRegions(continentKey) {
    regionSelect.innerHTML = "<option value=\"\">Select region</option>";
    citySelect.innerHTML = "<option value=\"\">Select city</option>";
    if (!continentKey || !mapData?.continents?.[continentKey]) return;
    Object.entries(mapData.continents[continentKey].regions).forEach(function ([key, r]) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = r.label;
      regionSelect.appendChild(opt);
    });
  }

  function fillCities(continentKey, regionKey) {
    citySelect.innerHTML = "<option value=\"\">Select city</option>";
    if (!continentKey || !regionKey || !mapData?.continents?.[continentKey]?.regions?.[regionKey]) return;
    (mapData.continents[continentKey].regions[regionKey].cities || []).forEach(function (city) {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });
  }

  continentSelect.addEventListener("change", function () {
    fillRegions(this.value);
  });

  regionSelect.addEventListener("change", function () {
    fillCities(continentSelect.value, this.value);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const msgEl = document.getElementById("form-message");
    msgEl.textContent = "";
    msgEl.className = "form-message";

    const continent = continentSelect.value.trim();
    const region = regionSelect.value.trim();
    const city = citySelect.value.trim();
    const title = (document.getElementById("title") && document.getElementById("title").value) || "";
    const content = (document.getElementById("content") && document.getElementById("content").value) || "";
    const date = (document.getElementById("date") && document.getElementById("date").value) || new Date().toISOString().slice(0, 10);

    if (!continent || !region || !city) {
      msgEl.textContent = "Please select a continent, region, and city.";
      msgEl.className = "form-message error";
      return;
    }
    if (!title.trim()) {
      msgEl.textContent = "Please enter a title.";
      msgEl.className = "form-message error";
      return;
    }

    const payload = {
      continent,
      region,
      city,
      title: title.trim(),
      content: content.trim(),
      date,
      images: [],
    };

    fetch("/.netlify/functions/add-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || r.status); });
        return r.json();
      })
      .then(function () {
        msgEl.textContent = "Post saved! It may take a minute to appear on the site after the site rebuilds.";
        msgEl.className = "form-message success";
        form.reset();
        fillContinents();
        fillRegions("");
      })
      .catch(function (err) {
        msgEl.textContent = "Could not save: " + (err.message || "please try again or add the post manually to data/posts.json.");
        msgEl.className = "form-message error";
      });
  });

  loadMapData().then(fillContinents);
})();
