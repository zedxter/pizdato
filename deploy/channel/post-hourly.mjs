#!/usr/bin/env node
/**
 * Hourly: pick one hot news item, decide пиздато/хуёво, write to SQLite
 * (news_items + votes), notify owner in Telegram. Does not post to channel.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureNewsTable, insertNewsAndVote, listNewsUrls } from "./lib/db.js";
import { loadPosterEnv } from "./lib/env.js";
import { generateVerdict } from "./lib/generate.js";
import { rankNews } from "./lib/news.js";
import { notifyOwner } from "./lib/telegram.js";

async function main() {
  loadPosterEnv();
  ensureNewsTable();

  try {
    const seen = listNewsUrls({ days: 60 });
    const candidates = await rankNews({ excludeUrls: seen });
    if (!candidates.length) throw new Error("no suitable news items");

    const item = candidates[0];
    console.log(
      `hourly pick score=${item.score} cluster=${item.clusterSize} :: ${item.title}`,
    );

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
      `score=${item.score} cluster=${item.clusterSize} id=${saved.id}`,
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
