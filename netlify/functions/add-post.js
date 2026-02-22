exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server not configured. Set GITHUB_TOKEN and GITHUB_REPO in Netlify.",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { continent, region, city, title, content, date, images } = body;
  if (!continent || !region || !city || !title) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing continent, region, city, or title" }),
    };
  }

  const path = "data/posts.json";
  const id =
    [continent, region, city].join("-").toLowerCase().replace(/\s+/g, "-") +
    "-" +
    Date.now();

  const newPost = {
    id,
    continent,
    region,
    city,
    title: String(title).trim(),
    content: String(content || "").trim(),
    date: date || new Date().toISOString().slice(0, 10),
    images: Array.isArray(images) ? images : [],
  };

  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: "token " + token,
    "Content-Type": "application/json",
  };

  let currentSha = null;
  let currentContent = { posts: [] };

  try {
    const getRes = await fetch(
      "https://api.github.com/repos/" + repo + "/contents/" + path + "?ref=" + branch,
      { headers }
    );

    if (getRes.ok) {
      const file = await getRes.json();
      currentSha = file.sha;
      const decoded = Buffer.from(file.content, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      currentContent = parsed.posts ? { posts: parsed.posts } : { posts: [] };
    }
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to read posts: " + (e.message || "unknown") }),
    };
  }

  currentContent.posts.push(newPost);
  const newJson = JSON.stringify(currentContent, null, 2);
  const contentBase64 = Buffer.from(newJson, "utf8").toString("base64");

  const putBody = {
    message: "Add post: " + title,
    content: contentBase64,
    branch,
  };
  if (currentSha) putBody.sha = currentSha;

  try {
    const putRes = await fetch(
      "https://api.github.com/repos/" + repo + "/contents/" + path,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(putBody),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      return {
        statusCode: putRes.status,
        body: JSON.stringify({ error: "GitHub API: " + err }),
      };
    }
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to save: " + (e.message || "unknown") }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, id: newPost.id }),
  };
};
