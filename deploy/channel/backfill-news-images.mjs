#!/usr/bin/env node
/**
 * One-shot: fill news_items.image_url from og:image for rows that lack it.
 * Safe to re-run.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { getDb, ensureNewsTable } from "./lib/db.js";
import { loadPosterEnv } from "./lib/env.js";
import { fetchArticleBody } from "./lib/news.js";

async function main() {
  loadPosterEnv();
  ensureNewsTable();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, url FROM news_items
       WHERE image_url IS NULL OR trim(image_url) = ''
       ORDER BY id DESC`,
    )
    .all();

  console.log(`backfill images: ${rows.length} rows`);
  const update = db.prepare(`UPDATE news_items SET image_url = ? WHERE id = ?`);

  let ok = 0;
  let miss = 0;
  for (const row of rows) {
    try {
      const fetched = await fetchArticleBody(row.url, { maxChars: 400 });
      if (fetched.imageUrl) {
        update.run(fetched.imageUrl, row.id);
        ok += 1;
        console.log(`id=${row.id} ok ${fetched.imageUrl.slice(0, 90)}`);
      } else {
        miss += 1;
        console.log(`id=${row.id} miss ${row.url}`);
      }
    } catch (e) {
      miss += 1;
      console.warn(`id=${row.id} fail: ${e.message}`);
    }
  }
  console.log(`done ok=${ok} miss=${miss}`);
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
