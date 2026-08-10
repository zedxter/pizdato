#!/usr/bin/env node
/**
 * Hourly: pick the most absurd / funny / unusual *Russian* news item (not a
 * repeat of the last 24h), decide пиздато/хуёво from article text, write to
 * SQLite (news_items + votes). Does not post to channel and does not DM on
 * success (лента on the site is enough). Failures still notify the owner.
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
      console.log("hourly skip: no absurd/unique RU news this hour");
      return;
    }

    const { verdict, reason, notes, item: enriched } = await generateVerdict(item);
    const summary =
      (enriched?.articleText && enriched.articleText.slice(0, 1800)) ||
      item.summary ||
      "";
    const saved = insertNewsAndVote({
      title: item.title,
      url: enriched?.resolvedUrl || item.url,
      summary,
      source: item.source || null,
      telegram: item.telegram || null,
      imageUrl: enriched?.imageUrl || item.imageUrl || null,
      verdict,
      reason,
      score: item.score,
      clusterSize: item.clusterSize,
    });

    if (!saved.inserted) {
      console.log(`already stored id=${saved.id}, skip vote`);
      return;
    }

    console.log(
      `saved id=${saved.id} verdict=${verdict} voter=${saved.voterId} absurd=${item.absurdScore ?? "?"} notes=${notes.join("; ") || "—"}`,
    );
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
