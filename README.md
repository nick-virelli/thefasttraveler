# Travel blog

A minimal travel blog with a real interactive map (Leaflet + OpenStreetMap). Click a continent to zoom in, then click a city marker to read the post below. Add post is available at a **hidden URL** (not linked from the site) for editors.

## Run locally

**Option 1 (no install):** Double-click **index.html** to open it in your browser. The map works without a server (add-post form needs the deployed site to save).

**Option 2 (with Node.js):** Run `npx serve .` then open the URL shown (e.g. http://localhost:3000).

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
