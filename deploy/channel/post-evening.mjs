#!/usr/bin/env node
/**
 * Evening channel post: pick a hot news item and discuss it as пиздато vs хуёво.
 * Posts to @pizdato_net via the existing mcp-telegram StoreSession.
 *
 * Text generation (preferred): cursor-agent --print --mode ask
 * Fallback: OPENROUTER/GROQ/OPENAI key in ~/.config/pizdato-channel.env
 * Last resort: local template
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPosterEnv } from "./lib/env.js";
import { generatePost } from "./lib/generate.js";
import { pickNews, savePostedState } from "./lib/news.js";
import { notifyOwner, sendChannel } from "./lib/telegram.js";

async function main() {
  loadPosterEnv();

  try {
    const { item, state } = await pickNews();
    const { text, notes } = await generatePost(item);

    await sendChannel(text);
    state.postedUrls.push(item.url);
    savePostedState(state);
    console.log(`posted evening take on: ${item.title}`);
    console.log(text);

    if (notes.length) {
      try {
        await notifyOwner(
          `Пост в канал ушёл, но были тех. замечания:\n\n• ${notes.join("\n• ")}\n\nНовость: ${item.title}\n${item.url}`,
        );
      } catch (e) {
        console.warn("owner notify failed:", e.message);
      }
    }
  } catch (err) {
    console.error(err);
    try {
      await notifyOwner(`Вечерний пост НЕ опубликован.\n\n${err?.stack || err}`);
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
