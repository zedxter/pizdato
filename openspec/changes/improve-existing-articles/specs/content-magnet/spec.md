## ADDED Requirements

### Requirement: Magnet prose stays clear and single-threaded
Magnet article body copy MUST follow one clear argument line from hook through conclusion, MUST prefer concrete scenes over stacked metaphors, and MUST remain readable without moralizing or medical-treatment framing.

#### Scenario: Reader finishes a magnet
- **WHEN** a reader reaches the end of a magnet article
- **THEN** they can restate the article’s main point in one sentence without reconstructing a metaphor collage

### Requirement: Article SEO meta matches search intent
Each article’s `title` and meta `description` (and equivalent Open Graph / JSON-LD description fields derived from them) MUST name or clearly answer the primary RU search intent of that permalink, and MUST stay consistent with the current body after material edits.

#### Scenario: Query-shaped landing
- **WHEN** a searcher opens an article whose title reflects a known query (for example «что значит пиздато»)
- **THEN** the first screenful of content and the meta description address that query before brand digressions
