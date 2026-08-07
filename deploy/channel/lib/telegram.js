import { TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions/index.js";
import { channelPeer } from "./env.js";
import { join } from "node:path";
import { homedir } from "node:os";

export function sessionConfig() {
  const accountId = process.env.TELEGRAM_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("TELEGRAM_ACCOUNT_ID missing (set in pizdato-channel.env)");
  }
  const sessionCwd = process.env.TELEGRAM_SESSION_CWD || process.cwd();
  const sessionName =
    process.env.TELEGRAM_SESSION_NAME ||
    join(homedir(), ".telegram-agent/sessions", accountId);
  return { accountId, sessionCwd, sessionName };
}

export async function withClient(fn) {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "", 10);
  const apiHash = process.env.TELEGRAM_API_HASH || "";
  if (!apiId || !apiHash) {
    throw new Error("TELEGRAM_API_ID / TELEGRAM_API_HASH missing");
  }

  const { accountId, sessionCwd, sessionName } = sessionConfig();
  process.chdir(sessionCwd);
  const client = new TelegramClient(new StoreSession(sessionName), apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  if (!(await client.isUserAuthorized())) {
    throw new Error(`Telegram session not authorized for ${accountId}`);
  }
  try {
    return await fn(client);
  } finally {
    await client.disconnect();
  }
}

export async function sendChannel(text, { linkPreview = true } = {}) {
  const peer = channelPeer();
  await withClient(async (client) => {
    await client.sendMessage(peer, { message: text, linkPreview });
  });
}

export async function notifyOwner(message, prefix = "🛠 pizdato evening cron") {
  const peer = process.env.PIZDATO_OWNER_PEER || "me";
  await withClient(async (client) => {
    await client.sendMessage(peer, {
      message: `${prefix}\n\n${message}`.slice(0, 3500),
      linkPreview: false,
    });
  });
}
