(function () {
  let mapData = null;
  let posts = [];
  let stack = [];
  const container = document.getElementById("map-container");
  const postEl = document.getElementById("post-display");

  if (!container) return;

  function renderLevel(items, level, keyAttr) {
    container.innerHTML = "";
    const levelEl = document.createElement("div");
    levelEl.className = "map-level";
    levelEl.setAttribute("data-level", level);

    if (stack.length > 0) {
      const back = document.createElement("button");
      back.type = "button";
      back.className = "map-item map-back";
      back.textContent = "← Back";
      back.addEventListener("click", function () {
        stack.pop();
        const prev = stack[stack.length - 1];
        if (prev) renderLevel(prev.items, prev.level, prev.keyAttr);
        else loadContinents();
      });
      levelEl.appendChild(back);
    }

    items.forEach(function (item) {
      const btn = document.createElement("button");
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
