(function () {
  let mapData = null;
  let posts = [];
  let stack = [];
  const container = document.getElementById("map-container");
  const postEl = document.getElementById("post-display");

  if (!container) return;

  var svgTemplate = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" class="world-map-svg"><g><path id="north-america" class="continent" d="M 180 120 L 240 100 L 280 110 L 300 140 L 290 170 L 270 200 L 250 220 L 220 230 L 200 220 L 180 200 L 170 170 L 165 140 Z"><title>North America</title></path><path id="south-america" class="continent" d="M 260 240 L 280 230 L 290 260 L 285 310 L 270 350 L 250 380 L 235 370 L 240 320 L 250 280 Z"><title>South America</title></path><path id="europe" class="continent" d="M 480 110 L 520 100 L 550 115 L 545 150 L 520 170 L 500 165 L 480 150 Z"><title>Europe</title></path><path id="africa" class="continent" d="M 500 180 L 530 175 L 545 210 L 540 270 L 520 320 L 500 340 L 490 300 L 495 240 Z"><title>Africa</title></path><path id="asia" class="continent" d="M 550 90 L 650 80 L 750 100 L 780 150 L 770 200 L 720 240 L 650 230 L 580 210 L 550 160 Z"><title>Asia</title></path><path id="oceania" class="continent" d="M 720 340 L 780 320 L 820 340 L 810 370 L 760 380 L 720 365 Z"><title>Oceania</title></path></g></svg>';

  function renderLevel(items, level, keyAttr) {
    container.innerHTML = "";

    if (level === "continent") {
      var mapWrap = document.createElement("div");
      mapWrap.className = "map-visual";
      mapWrap.innerHTML = svgTemplate;
      container.appendChild(mapWrap);
      var svg = mapWrap.querySelector(".world-map-svg");
      var paths = svg ? svg.querySelectorAll(".continent") : [];
      paths.forEach(function (path) {
        path.style.cursor = "pointer";
        path.addEventListener("click", function () {
          var key = path.getAttribute("id");
          var item = items.find(function (i) { return i.key === key; });
          if (item && item.children) {
            stack.push({ items: items, level: level, keyAttr: keyAttr });
            renderLevel(item.children, item.nextLevel, item.nextKey);
          }
        });
      });
      var btnWrap = document.createElement("div");
      btnWrap.className = "map-buttons";
      btnWrap.innerHTML = "<p style=\"margin:0;font-size:0.9rem;color:var(--text-muted)\">Or choose a continent:</p>";
      var btnGrid = document.createElement("div");
      btnGrid.className = "map-level";
      btnGrid.setAttribute("data-level", "continent");
      items.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "map-item";
        btn.textContent = item.label;
        btn.addEventListener("click", function () {
          if (item.children) {
            stack.push({ items: items, level: level, keyAttr: keyAttr });
            renderLevel(item.children, item.nextLevel, item.nextKey);
          }
        });
        btnGrid.appendChild(btn);
      });
      btnWrap.appendChild(btnGrid);
      container.appendChild(btnWrap);
      return;
    }

    var levelEl = document.createElement("div");
    levelEl.className = "map-level";
    levelEl.setAttribute("data-level", level);

    var back = document.createElement("button");
    back.type = "button";
    back.className = "map-item map-back";
    back.textContent = "← Back";
    back.addEventListener("click", function () {
      stack.pop();
      var prev = stack[stack.length - 1];
      if (prev) renderLevel(prev.items, prev.level, prev.keyAttr);
      else loadContinents();
    });
    levelEl.appendChild(back);

    items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "map-item";
      btn.textContent = item.label;
      btn.setAttribute(keyAttr, item.key);
      btn.addEventListener("click", function () {
        if (item.children) {
          stack.push({ items: items, level: level, keyAttr: keyAttr });
          renderLevel(item.children, item.nextLevel, item.nextKey);
        } else {
          selectCity(item.continent, item.region, item.key);
        }
      });
      levelEl.appendChild(btn);
    });

    container.appendChild(levelEl);
  }

  function loadContinents() {
    stack = [];
    const continents = Object.entries(mapData.continents).map(function ([key, c]) {
      return {
        key,
        label: c.label,
        nextLevel: "region",
        nextKey: "data-region",
        children: Object.entries(c.regions).map(function ([rKey, r]) {
          return {
            key: rKey,
            label: r.label,
            nextLevel: "city",
            nextKey: "data-city",
            continent: key,
            region: rKey,
            children: (r.cities || []).map(function (city) {
              return {
                key: city,
                label: city,
                continent: key,
                region: rKey,
              };
            }),
          };
        }),
      };
    });
    renderLevel(continents, "continent", "data-continent");
  }

  function selectCity(continent, region, city) {
    const post = posts.find(function (p) {
      return p.continent === continent && p.region === region && p.city === city;
    });
    if (!postEl) return;
    if (!post) {
      postEl.innerHTML = "<p class=\"post-meta\">No post for " + city + " yet. <a href=\"add-post.html\">Add one</a>.</p>";
      postEl.classList.add("post-display");
      return;
    }
    const d = post.date ? new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
    postEl.innerHTML =
      "<h2>" + escapeHtml(post.title) + "</h2>" +
      "<p class=\"post-meta\">" + escapeHtml(city) + (d ? " · " + d : "") + "</p>" +
      "<div class=\"post-content\">" + formatContent(post.content) + "</div>";
    postEl.classList.add("post-display");
    postEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function escapeHtml(s) {
    if (!s) return "";
    const div = document.createElement("div");
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

  function init() {
    var isFile = typeof location !== "undefined" && location.protocol === "file:";
    var hasInline = typeof window.__MAP_DATA__ !== "undefined" && typeof window.__POSTS__ !== "undefined";
    if (isFile && hasInline) {
      mapData = window.__MAP_DATA__;
      posts = (window.__POSTS__ && window.__POSTS__.posts) || [];
      loadContinents();
      return;
    }
    Promise.all([
      fetch("data/map-data.json").then(function (r) { return r.json(); }),
      fetch("data/posts.json").then(function (r) { return r.json(); }),
    ]).then(function ([data, data2]) {
      mapData = data;
      posts = data2.posts || [];
      loadContinents();
    }).catch(function () {
      container.innerHTML = "<p>Could not load map. Check that data/map-data.json and data/posts.json exist.</p>";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
