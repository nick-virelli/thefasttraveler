# Travel blog

A minimal travel blog with an interactive map (continent → region → city) and an **Add post** form at `/add-post` so new posts can be added without editing code.

## Run locally

**Option 1 (no install):** Double-click **index.html** to open it in your browser. The map and add-post form work without a server.

**Option 2 (with Node.js):** From this folder, run `npx serve .` then open the URL shown (e.g. http://localhost:3000).

## Deploy on Netlify

1. Push this project to a GitHub repo.
2. In [Netlify](https://app.netlify.com), add a new site and connect that repo.
3. Build settings: leave **Build command** empty; set **Publish directory** to `.` (or leave default if it already publishes the root).
4. Add environment variables (Site settings → Environment variables):
   - **GITHUB_TOKEN** — A [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope (so the add-post function can commit `data/posts.json`).
   - **GITHUB_REPO** — Your repo in the form `username/repo-name` (e.g. `jane/travel-blog`).
   - **GITHUB_BRANCH** — Optional; defaults to `main` if not set.

After deployment, **Add post** at `yoursite.com/add-post` will save new posts to the repo and trigger a new deploy so the post appears on the site.

## Pages

- **/** — Home: intro + map; click continent → region → city to show the post below.
- **/about.html** — About (edit the text in the file).
- **/contact.html** — Contact (add your email or form link).
- **/add-post.html** — Form to add a post: choose continent, region, city, then title and content.

## Adding more cities or regions

Edit **data/map-data.json**: add cities under the right region, or add new regions under a continent. When you edit it, update **data/map-data.js** too so the map works when you open index.html directly (file://). Copy the JSON content into map-data.js as `window.__MAP_DATA__ = <paste>;`.
