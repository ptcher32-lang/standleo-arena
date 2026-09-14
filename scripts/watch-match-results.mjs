import { mkdir, readdir, readFile, rename } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const inbox = path.join(projectRoot, "match-results");
const siteUrl = process.env.SITE_URL ?? "http://127.0.0.1:3001";
const token = process.env.MATCH_IMPORT_TOKEN;

if (!token) {
  console.error("MATCH_IMPORT_TOKEN is required.");
  process.exit(1);
}

await mkdir(inbox, { recursive: true });
console.log(`Watching ${inbox}`);
console.log(`Import endpoint: ${siteUrl}/api/matches/import`);

async function importFile(fileName) {
  const source = path.join(inbox, fileName);
  const payload = JSON.parse(await readFile(source, "utf8"));
  const response = await fetch(`${siteUrl}/api/matches/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Import failed (${response.status}): ${message}`);
  }

  await rename(source, path.join(inbox, `processed-${Date.now()}-${fileName}`));
  console.log(`Imported ${fileName}`);
}

async function scan() {
  const files = (await readdir(inbox)).filter((file) => file.endsWith(".json") && !file.startsWith("processed-"));
  for (const file of files) {
    try {
      await importFile(file);
    } catch (error) {
      console.error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

await scan();
setInterval(scan, 2000);
