# The Fast Traveler

A lightweight travel blog that behaves like a mini web app: an interactive world map (Leaflet + OpenStreetMap tiles) drives navigation. Click a continent to zoom, then click a city marker to render the post inline. “Stories & Guides” highlights longer-form or multi-city content.

This README is intentionally **migration- and LLM-friendly**: it documents the full project structure, data schemas, and the GitHub-backed publishing workflow so you can move to another platform (or re-implement the backend) without reverse-engineering the code.

## Quick tour (what it does)

- **Map-driven browsing**: world view → continent zoom → city markers → post rendered below the map.
- **Special posts**: “Stories & Guides” sidebar lists curated posts (e.g., lists, multi-city trips). City posts can link back to relevant special posts.
- **Light/dark theme**: toggle stored in `localStorage`, respects `prefers-color-scheme`.
- **Editor-only publishing**: a hidden “Add post” page can publish new city posts via a Netlify serverless function that commits to GitHub.

## Tech stack / architecture

- **Frontend**: static HTML + CSS + vanilla JavaScript (no framework build step).
- **Interactive map**: [Leaflet](https://leafletjs.com/) with OpenStreetMap/CARTO tiles.
- **World geometry source**: TopoJSON from `world-atlas` CDN (primary) with a local GeoJSON fallback.
- **Hosting**: any static host works (Netlify recommended here).
- **Serverless publishing** (optional): a Netlify Function (`netlify/functions/add-post.js`) writes new posts to `data/posts.json` via the GitHub REST API.

## Run locally

### Option A (no install): open the files directly

- Double-click `index.html` to open it in your browser.
- The map and posts work **without a server** because the project includes “inline” data files:
  - `data/map-data.js`
  - `data/posts.js`
  - `data/special-posts.js`
  - `data/continents.js`

Note: the editor publish flow (Add Post → Netlify Function) requires an actual deployed site (or a local server + serverless emulator).

### Option B (recommended): run a local static server

With Node.js installed:

```bash
npx serve .
```

Open the URL it prints (for example, `http://localhost:3000`).

When served over HTTP, the homepage loads “real” JSON files via `fetch()`:

- `data/map-data.json`
- `data/posts.json`
- `data/special-posts.json`
- `data/continents.geojson` (if present; see note below)

## Project layout (files that matter)

### Pages (static)

- `index.html`: homepage (map + posts + “Stories & Guides” sidebar)
- `about.html`: about page content
- `contact.html`: contact page content
- `add-post.html`: editor-only page to publish a new city post

### Frontend logic

- `js/map.js`: map initialization, continent click → zoom, marker rendering, post rendering, “special posts” sidebar and linking
- `js/theme.js`: theme selection (prefers-color-scheme + persisted toggle)
- `js/add-post.js`: editor form UI, cascading selects (continent → region → city), submit to serverless endpoint

### Styling

- `css/style.css`: responsive layout, map container styles, sidebar cards, theme via CSS variables

### Data (content + map metadata)

- `data/map-data.json`: canonical continent/region/city structure (plus optional bounds metadata)
- `data/posts.json`: canonical city posts (rendered below the map)
- `data/special-posts.json`: curated “Stories & Guides” posts (sidebar + related-city linking)

### Inline data (for file:// mode)

These files mirror the JSON data so the site can run by simply opening `index.html` from disk:

- `data/map-data.js` defines `window.__MAP_DATA__`
- `data/posts.js` defines `window.__POSTS__`
- `data/special-posts.js` defines `window.__SPECIAL_POSTS__`
- `data/continents.js` defines `window.__CONTINENTS_GEOJSON__` (simplified continent polygons)

### Serverless publishing (optional)

- `netlify/functions/add-post.js`: Netlify Function that appends a new post to `data/posts.json` by calling the GitHub Contents API.
- `netlify.toml`: points Netlify at the publish directory and functions directory.

## Data schemas (migration-friendly)

### `data/map-data.json`

High-level shape:

```json
{
  "continents": {
    "<continentKey>": {
      "label": "Human readable name",
      "bounds": [[south, west], [north, east]],
      "regions": {
        "<regionKey>": {
          "label": "Region label",
          "cities": [
            { "name": "City Name", "lat": 0, "lon": 0 }
          ]
        }
      }
    }
  }
}
```

Notes:

- `continentKey` / `regionKey` are stable identifiers (e.g. `"europe"`, `"western-europe"`).
- `bounds` is optional metadata (useful for migration or alternative implementations). The current map UI computes zoom bounds from city coordinates and/or the clicked continent geometry.
- Cities can be stored as objects with coordinates; the UI expects `name`, `lat`, `lon`.

### `data/posts.json`

```json
{
  "posts": [
    {
      "id": "string",
      "continent": "<continentKey>",
      "region": "<regionKey>",
      "city": "City Name",
      "title": "Post title",
      "content": "Text with lightweight formatting",
      "date": "YYYY-MM-DD",
      "images": []
    }
  ]
}
```

Rendering rules (frontend):

- `content` supports a minimal Markdown-like subset:
  - `**bold**`
  - `*italics*`
  - newlines become `<br>`
  - `![caption](https://url)` renders as an inline image (hosted URLs only)
- HTML is escaped before formatting to reduce injection risk.

### `data/special-posts.json`

```json
{
  "posts": [
    {
      "id": "string",
      "title": "Special post title",
      "date": "YYYY-MM-DD",
      "type": "list | multi-city-trip | <any string>",
      "content": "Text with lightweight formatting",
      "relatedCities": [
        { "continent": "<continentKey>", "region": "<regionKey>", "city": "City Name" }
      ]
    }
  ]
}
```

Linking rule:

- If a city post matches an entry in `relatedCities`, the city post will display “Part of these trips:” links to those special posts.

## Editor workflow (hidden “Add post” page)

The editor page lives at `add-post.html`. It is **intentionally not linked** from the public homepage; it’s meant to be accessed directly (bookmark/share privately).

How it works:

1. `add-post.html` loads `data/map-data.json` (or `window.__MAP_DATA__` in file mode).
2. The form populates cascading dropdowns: **continent → region → city**.
3. On submit, the browser sends JSON to:

   - `POST /.netlify/functions/add-post`

4. The serverless function appends a new post to `data/posts.json` in your GitHub repo.
5. Netlify triggers a new deploy; the post appears once the deploy finishes.

## Netlify + GitHub configuration (publishing backend)

### Netlify settings

This repo is designed for Netlify static hosting with functions:

- `Publish directory`: `.`
- `Functions directory`: `netlify/functions` (also declared in `netlify.toml`)
- `Build command`: none

### Required environment variables

In Netlify → Site settings → Environment variables:

- `GITHUB_TOKEN`: GitHub Personal Access Token with permission to write to the repo (classic token with `repo` scope works; fine-grained tokens can also work if they include contents read/write).
- `GITHUB_REPO`: `owner/repo` (example: `username/the-fast-traveler`)
- `GITHUB_BRANCH` (optional): defaults to `main`

### What the function does (high level)

`netlify/functions/add-post.js`:

- Validates request method and required fields (`continent`, `region`, `city`, `title`)
- Reads `data/posts.json` from GitHub (Contents API)
- Appends a new post object with a generated `id`
- Writes the updated JSON back to GitHub as a commit

## Migration guide (move off Netlify/GitHub)

This project is intentionally split into:

- **Static frontend** (portable anywhere)
- **Optional publishing backend** (replaceable)

### If you just want a static blog (no editor publishing)

You can ignore:

- `add-post.html`
- `js/add-post.js`
- `netlify/functions/add-post.js`
- Netlify environment variables

Instead, manage content by editing `data/posts.json` and `data/special-posts.json` directly and redeploying.

### If you want to keep the “Add post” experience elsewhere

Re-implement the endpoint that `js/add-post.js` calls:

- **Request**: `POST /add-post` (or equivalent)
- **Body**: `{ continent, region, city, title, content, date, images }`
- **Response**: JSON `{ ok: true, id: "<new id>" }` on success

Backend options:

- Write to a database (SQLite/Postgres)
- Write to object storage + rebuild
- Use another Git provider (GitLab/Bitbucket) with a similar “commit file” API

### If you move to a framework (Next.js, Astro, etc.)

Keep your data as-is and port in stages:

1. Preserve the JSON schemas in `data/*.json`.
2. Reuse map logic from `js/map.js` (or rewrite it in the framework).
3. Keep the Netlify Function as-is, or replace it with a platform equivalent (Vercel/Cloudflare/AWS Lambda).

## Notes / known behaviors

- The homepage supports two modes:
  - **file:// mode** (loads `window.__*` inline data)
  - **http(s) mode** (loads `data/*.json` via `fetch()`)
- Continent shapes are loaded in this order:
  - **Primary**: fetch TopoJSON from `world-atlas` CDN (`countries-110m.json`) and merge country geometries into continent shapes (requires `topojson-client`).
  - **Fallback**: if the CDN request fails, load `data/continents.geojson`.
  - **file:// mode**: use `data/continents.js` (`window.__CONTINENTS_GEOJSON__`).
- If you add new continents/regions/cities, update `data/map-data.json` (canonical) and optionally `data/map-data.js` (for file:// mode).

---

## Content creation workflow

New posts are written by a dedicated Claude project that has its own instructions covering post structure, required fields, formatting rules, and image syntax. When a post is ready, the `.md` file is uploaded to Claude Code, which inserts it into `data/posts.json` and `data/posts.js`, then commits, pushes, and deploys on request.

## Contributing / customization checklist

- **Branding**: update names in the HTML `<title>` tags and header (`The Fast Traveler`).
- **About/Contact**: edit copy in `about.html` and `contact.html`.
- **Content**:
  - Add city posts in `data/posts.json`
  - Add special posts in `data/special-posts.json`
  - Add/adjust cities in `data/map-data.json`

## Deploy on Netlify

1. Push this project to a GitHub repo.
2. In [Netlify](https://app.netlify.com), add a new site and connect that repo.
3. Build settings: leave **Build command** empty; set **Publish directory** to `.`.
4. Add environment variables (Site settings → Environment variables):
   - **GITHUB_TOKEN** — A [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope.
   - **GITHUB_REPO** — Your repo (e.g. `username/repo-name`).
   - **GITHUB_BRANCH** — Optional; defaults to `main`.

After deployment, the hidden **Add post** form at `yoursite.com/add-post.html` (bookmark it; not linked in the UI) can save new posts when GITHUB_TOKEN and GITHUB_REPO are set.

## Pages

- **/** — Home: real map; click a continent rectangle to zoom in, then click a city marker to show the post below. Use “Back to world” to return.
- **/about.html** — About (edit the text in the file).
- **/contact.html** — Contact (add your email or form link).
- **/add-post.html** — Hidden form to add a post (intentionally not linked from the public site).

## Adding more cities or regions

Edit **data/map-data.json**: each city is an object `{"name": "City Name", "lat": 0, "lon": 0}`. Add a `bounds` array per continent for the clickable area: `[[south, west], [north, east]]`. Update **data/map-data.js** the same way (as `window.__MAP_DATA__ = ...`) if you open the site from file.
