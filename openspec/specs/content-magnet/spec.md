# content-magnet Specification

## Purpose

Define the content-magnet publishing model that attracts Russian-language search demand, preserves pizdato brand voice, and converts readers into votes and Telegram subscribers.

## Requirements

### Requirement: Magnets answer external demand then pivot to pizdato
A content magnet article MUST address a recognizable non-brand RU topic or language question and MUST include a clear pivot to the pizdato evaluation gesture (feeling / saying пиздато in the present), without turning the piece into a medical treatment guide.

#### Scenario: Reader arrives from a topic query
- **WHEN** a reader opens a magnet article expecting the topic named in the title
- **THEN** the article covers that topic substantively before and alongside the pizdato pivot

### Requirement: Dual CTA on every magnet
Every magnet article MUST offer two outbound actions: cast a vote on the site home (or equivalent vote entry) and visit or subscribe to the Telegram channel `@pizdato_net`, using brand voice rather than bureaucratic marketing copy.

#### Scenario: End of article
- **WHEN** a reader reaches the end of a magnet
- **THEN** both vote and Telegram paths are visible and linked

### Requirement: Weekly magnet cadence
The publishing system (process + site) MUST support at least one new magnet article per week without breaking SEO shells, sitemap, or hero image conventions used by existing articles.

#### Scenario: Weekly publish
- **WHEN** editors publish the week’s magnet
- **THEN** the article is live under `/articles/<slug>`, listed on `/articles`, and linked from the Telegram teaser ritual

### Requirement: Telegram teaser accompanies each magnet
Each new magnet MUST be announced in `@pizdato_net` with a short teaser, canonical article URL (with link preview), and the standard home CTA lines used by the channel voice.

#### Scenario: Magnet goes live
- **WHEN** a magnet is published on the site
- **THEN** a corresponding channel post is published the same day pointing at the article and the home vote URL

### Requirement: Brand voice constraints
Magnet copy MUST remain ironic and lightly roasting, MUST keep the word пиздато where it carries meaning, MUST NOT moralize, and MUST NOT use war or military comedy framing.

#### Scenario: Tone check
- **WHEN** a draft magnet is reviewed against channel/site voice
- **THEN** it matches the above constraints before publish
