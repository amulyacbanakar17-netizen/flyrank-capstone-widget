const fs = require("fs");
const path = require("path");

const URL = "https://books.toscrape.com/";

const cacheDir = path.join(__dirname, "..", "cache");
const cacheFile = path.join(cacheDir, "catalogue-page-1.html");

async function fetchPage() {
    if (fs.existsSync(cacheFile)) {
        console.log("CACHE HIT");
        return fs.readFileSync(cacheFile, "utf8");
    }

    console.log("FETCH");

    const response = await fetch(URL, {
        headers: {
            "User-Agent": "FlyRankInternshipA9/1.0"
        },
        signal: AbortSignal.timeout(10000)
    });

    if (response.status !== 200) {
        throw new Error(`Fetch failed with status ${response.status}`);
    }

    const html = await response.text();

    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, html);

    console.log(`Saved ${html.length} characters to cache.`);

    return html;
}

fetchPage()
    .then(() => console.log("Done"))
    .catch((error) => console.error("ERROR:", error.message));
