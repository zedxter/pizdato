# Promotion Strategy

> **Status:** Current-phase promotion strategy (live site, Telegram channel launched).
> **Last updated:** 2026-09-02
> **Issue:** [#68](https://github.com/zedxter/pizdato/issues/68)
> **North Star:** +5–10 new Telegram subscribers per week.
> **Phase:** Promotion — audience growth, not revenue.

## Channels

### 1. Telegram (@pizdato_net) — primary growth channel

The Telegram channel is the retention loop and the primary audience growth engine.
Every site visitor should become a Telegram subscriber; every subscriber sees
daily content that keeps pizdato top-of-mind.

**Content cadence:**

| Post type | Frequency | Purpose |
|-----------|-----------|---------|
| Morning stats (daily) | Every day | Share the current pizdato%/huyevo% split + a wisdom quote → ritual habit |
| News verdict posts | 3–5x/week | Pick an absurd/interesting news story, give it a pizdato/huyevo verdict + wisdom → shareable content|
| Article teaser | When publishing | Link to new magnet article on the site → SEO + site traffic loop |

**Current metrics (as of Sept 2026):**

| Metric | Value | Target | Gap |
|--------|-------|--------|-----|
| Subscribers | ~5 | 50 (phase 1) | Cross-promotion and SEO not yet pulling |
| Views per post | 3–4 | 15–25 (30–50% of subs) | Content is new; organic discovery hasn't ramped |
| Posts published | ~50+ | Steady | Rhythm is good |
| Posting consistency | Daily | Daily | Achieved |

**Tactics for Telegram growth:**

| Tactic | Priority | Effort | Expected impact |
|--------|----------|--------|----------------|
| Cross-promotion with adjacent TG channels (humor, absurd news, language, culture — 500–5000 subs) | **High** | Medium | +20–100 subs per successful swap |
| Telegram SEO — channel name/keywords in description for discoverability | **High** | Low | Incremental organic search joins |
| Welcome flow / pinned post explaining the channel value | **High** | Low | Improve retention of newcomers from cross-promo |
| Test Telegram Ads (sponsored messages) after 200 organic subs | Low | High | Only when free channels are saturated |
| Referral mechanic / unique invite link per source | Medium | Medium | Attribution for cross-promotion ROI |

### 2. Content magnets (SEO) — inbound discovery channel

Article attractors target high-interest Russian-language queries related to
the word "пиздато" and adjacent cultural/psychological topics.

**Published magnets:**

| Topic | Publish date | Target query |
|-------|-------------|-------------|
| Синдром отложенной жизни | 2026-08-12 | "синдром отложенной жизни", "отложенная жизнь" |
| Тонкая грань между пиздато и пиздец | 2026-08-11 | "пиздато и пиздец", "отличие пиздато от пиздеца" |
| (planned) What is pizdato (/pizdato page) | — | "что значит пиздато", "пиздато это" |

**SEO performance indicators:**

| Metric | Current | Target |
|--------|---------|--------|
| Yandex indexed pages | TBD | All public pages |
| Organic visits/month | TBD | 100+ (phase 1) |
| Vote conversion from article | TBD | 5%+ of article visitors |
| TG subscription from article | TBD | 2%+ of article visitors |

**Tactics:**

- Maintain minimum 1 magnet per week cadence (per [content-magnet spec](/openspec/specs/content-magnet/spec.md))
- Ensure every article has dual CTA (vote + TG subscribe)
- Yandex.Metrica goals for vote_success and telegram_click (per [growth-measurement spec](/openspec/specs/growth-measurement/spec.md))
- Monitor Yandex Webmaster — submit sitemap, request indexing on new articles
- Target long-tail queries: "почему я откладываю жизнь", "что значит слово пиздато", etc.

### 3. Direct/sharing — viral mechanic

The share flow ("Кинь другу") surfaces a wisdom quote from the current rotation.
This is intended to work as a low-friction social proof mechanic.

**Current state:** Quote carousel exists post-vote; share panel is implemented
but the viral loop is not yet instrumented or optimised.

**Next steps:**
- Add unique share link per quote so shares can be attributed
- Track share → vote conversion via Yandex.Metrica
- Test if screenshots of stat bars ("61% пиздато сегодня") drive more shares
  than text-only quotes

### 4. Cross-promotion (Telegram)

**Target partners:** Telegram channels in adjacent niches:
- Humor / absurd news (e.g., "странные новости", wtf channels)
- Language / culture (русский язык, этимология)
- Psychology / self-reflection (in the "синдром отложенной жизни" space)
- Satirical commentary (ирония, сарказм, "мнение")

**Format:** Classic shoutout exchange — each channel publishes a mention of the
other with a link and brief description.

**Condition for starting:** Channel should reach 50–100 organic subscribers first
(so partners have a reason to trade).

**Measurement:** Each cross-promotion deal gets its own invite link for
attribution.

## KPIs and Success Metrics

### North Star Metric

> **+5–10 new Telegram subscribers per week** (per product-standards spec).

### Supporting metrics

| Category | Metric | Current | Target (phase 1, Q3 2026) |
|----------|--------|---------|-----------------------------|
| Reach | TG subscribers | ~5 | 200 |
| | TG views per post | 3–4 | 60–100 (30–50% of subs) |
| Engagement | Vote completion rate | TBD | >50% of site visitors |
| | TG post engagement (reactions) | TBD | 5%+ of views |
| Content | Magnets published/week | ~1 | ≥1/week |
| | Article index coverage | 2 articless | 6+ articles |
| SEO | Yandex-indexed pages | TBD | All public pages |
| | Organic search visits/month | TBD | 100+ |
| Growth | Net subscriber growth/week | TBD | +5–10 |
| | Cross-promotion deals/month | 0 | 2–4 |

## What's Working

1. **Daily posting rhythm is established.** Morning stats + news verdicts =
  consistent output without burnout.
2. **Brand voice is distinctive.** "Дядя Миша" narrator persona, wisdom quotes,
  ironic tone resonate with the target audience.
3. **Content magnet quality is high.** Articles are original, well-researched,
  linguistically aware — not generative filler.
4. **Tech stack is solid.** One-click vote, no registration, fast load, clean UX.

## What Needs Imrovement

1. **Subscriber growth is near zero.** The channel has ~5 subscribers; no
  acquisition engine is active (no cross-promotion, no ads, SEO not yet ranked).
2. **SEO has not shipped results yet.** Articles were published recently; organic
  traffic from Yandex takes weeks to months.
3. **No attribution.** Invite links per source are not yet implemented, so we
  don't know what drives joins.
4. **Cross-promotion hasn't started.** The channel is below the threshold where
  partners would trade. Need to bootstrap to 50–100 first.
5. **Share/viral mechanic not instrumented.** The "Кинь другу" flow exists but
  there's no tracking on shares.

## Next Steps (Priority Order)

### Immediate (weels 1–2)

1. **Bootstrap Telegram channel to 50–100.** Options:
   - Personal network invite (Danil's contacts, team, friends)
   - One paid placement in a small adjacent TG channel (via Telega.in or direct
     DM — budget <$50)
   - Pin a "share the vote" CTA on the site home
2. **Instrument yourtracking:**
   - Unique invite links per source before any cross-promotion
   - Yandex.Meticaa goals for vote_success and telegram_click (per spec)
3. **Pinned post on TG channel** explaining what the channel is and why to stay.
4. **Continue 1 magnet/week cadence.** Double down on queries that have search
   volume and low competition.

### Short-term (weels 3–6)

5. **First cross-promotion round.** Target 3–5 channels (500–5000 subs) in
   adjacent niches. Offer a value-first proposal — share their post, then ask
   for a return mention.
6. **Monitor Yandex Webmaster.** Submit new articles individually; check
   indexing status.
7. **Add share tracking to "Кинь другу"** — unique per-quote share URLs so we
   know if / what people share.

### Medium-term (moths 2–3)

8. **Scale cross-promotion to 2–4 deals/month.** Build a repeatable partner
   pipeline.
9. **Optimise.** Based on earliest conversion data: which articles drive votes,
   which cross-promotion partners deliver the best retention, what posting time
   maximizes TG engagement.
10. **Evaluate Telegram Ads** if organic + cross-promotion is below target.

## Budget

Current phase operates at **zero monetary budget** — all growth is organic
(content, cross-promotion, SEO). A small paid budget ($50–100) may accelerate
the initial TG bootstrap if organic discovery takes too long, but is not required.