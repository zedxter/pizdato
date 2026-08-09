#!/usr/bin/env node
/**
 * Hourly: pick the most absurd / funny / unusual news item (not a repeat of
 * the last 24h), decide пиздато/хуёво, write to SQLite (news_items + votes),
 * notify owner. Does not post to channel.
 *
 * If nothing suitable is found — exit 0 without DB write or vote.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureNewsTable,
  insertNewsAndVote,
  listNewsUrls,
  listRecentNewsItems,
} from "./lib/db.js";
import { loadPosterEnv } from "./lib/env.js";
import { generateVerdict } from "./lib/generate.js";
import { pickHourlyAbsurdNews } from "./lib/news.js";
import { notifyOwner } from "./lib/telegram.js";

async function main() {
  loadPosterEnv();
  ensureNewsTable();

  try {
    const seen = listNewsUrls({ days: 60 });
    const recent = listRecentNewsItems({ hours: 24 });
    const item = await pickHourlyAbsurdNews({
      excludeUrls: seen,
      recentItems: recent,
    });

    if (!item) {
      console.log("hourly skip: no absurd/unique news this hour");
      return;
    }

    const { verdict, reason, notes } = await generateVerdict(item);
    const saved = insertNewsAndVote({
      title: item.title,
      url: item.url,
      summary: item.summary || "",
      source: item.source || null,
      telegram: item.telegram || null,
      verdict,
      reason,
      score: item.score,
      clusterSize: item.clusterSize,
    });

    if (!saved.inserted) {
      console.log(`already stored id=${saved.id}, skip vote`);
      return;
    }

    const label = verdict === "pizdato" ? "пиздато" : "хуёво";
    console.log(`saved id=${saved.id} verdict=${verdict} voter=${saved.voterId}`);

    const dm = [
      `${item.title}`,
      item.url,
      "",
      `Вердикт: ${label}`,
      `Почему: ${reason}`,
      "",
      `absurd=${item.absurdScore ?? "?"} score=${item.score} cluster=${item.clusterSize} id=${saved.id}`,
    ];
    if (notes.length) {
      dm.push("", `tech: ${notes.join("; ")}`);
    }

    await notifyOwner(dm.join("\n"), "📰 hourly news");
  } catch (err) {
    console.error(err);
    try {
      await notifyOwner(
        `Hourly news FAILED.\n\n${err?.stack || err}`,
        "📰 hourly news",
      );
    } catch (e) {
      console.warn("owner notify failed:", e.message);
    }
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
