const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "facebook-reel-and-video-downloader.p.rapidapi.com";

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

function collectUrls(value, pathParts = [], out = []) {
  if (value == null) return out;

  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      out.push({
        key: pathParts[pathParts.length - 1] || "url",
        path: pathParts.join("."),
        url: value
      });
    }
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUrls(item, [...pathParts, String(index)], out));
    return out;
  }

  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectUrls(item, [...pathParts, key], out);
    }
  }

  return out;
}

function makeFormats(data) {
  const all = collectUrls(data);

  const preferred = all.filter((x) =>
    /download|video|hd|high|sd|low|source|url/i.test(`${x.path} ${x.key}`)
  );

  const unique = [];
  for (const item of [...preferred, ...all]) {
    if (!unique.some((x) => x.url === item.url)) unique.push(item);
  }

  return unique.slice(0, 8).map((item, index) => {
    const name = `${item.path} ${item.key}`;
    let label = `Download ${index + 1}`;

    if (/high|hd/i.test(name)) label = "High Quality";
    else if (/sd|low|standard/i.test(name)) label = "Standard Quality";

    return { label, url: item.url };
  });
}

app.post("/api/download", async (req, res) => {
  try {
    if (!RAPIDAPI_KEY) {
      console.error("RAPIDAPI_KEY is missing.");
      return res.status(500).json({
        error: "Downloader is not configured yet. Add RAPIDAPI_KEY in Render Environment Variables."
      });
    }

    const videoUrl = String(req.body?.url || "").trim();

    if (!videoUrl) {
      return res.status(400).json({ error: "Facebook URL is required." });
    }

    let parsed;
    try {
      parsed = new URL(videoUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL." });
    }

    const host = parsed.hostname.toLowerCase();

    if (
      host !== "facebook.com" &&
      !host.endsWith(".facebook.com") &&
      host !== "fb.watch"
    ) {
      return res.status(400).json({
        error: "Only Facebook URLs are supported."
      });
    }

    const apiUrl =
      `https://${RAPIDAPI_HOST}/app/main.php?url=${encodeURIComponent(videoUrl)}`;

    console.log("Calling Facebook downloader API...");

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST
      }
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log("RapidAPI status:", response.status);

    if (!response.ok) {
      console.error("RapidAPI error:", JSON.stringify(data).slice(0, 3000));
      return res.status(response.status).json({
        error: `RapidAPI returned HTTP ${response.status}. Check your RapidAPI subscription/key.`,
        details: data
      });
    }

    if (data?.success === false) {
      console.error("API returned success=false:", JSON.stringify(data).slice(0, 3000));
      return res.status(422).json({
        error: data?.message || "Facebook video could not be processed.",
        details: data
      });
    }

    const formats = makeFormats(data);

    if (!formats.length) {
      console.error("No video URL found in API response:", JSON.stringify(data).slice(0, 5000));
      return res.status(422).json({
        error: "The API responded, but no downloadable video URL was found.",
        details: data
      });
    }

    res.json({
      title: data?.title || "Facebook Video",
      thumbnail: data?.thumbnail || "",
      formats
    });
  } catch (error) {
    console.error("DOWNLOAD_ERROR:", error);
    res.status(500).json({
      error: error?.message || "Server error while processing the video."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`AURA LABIB running on port ${PORT}`);
});
