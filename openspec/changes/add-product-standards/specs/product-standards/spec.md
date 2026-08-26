# Product Standards — pizdato-net

## ADDED Requirements

### Requirement: Product standards document
The repository root contains a `product-standards.md` document written in English that
captures the project's product standards on four mandatory axes: unit economics,
North Star metric, quality gate, and definition of done.

#### Scenario: The document exists and is in English
- **GIVEN** the project is in promotion phase
- **WHEN** the repository root is inspected
- **THEN** a `product-standards.md` file exists that is written in English

#### Scenario: The document covers the four mandatory axes
- **GIVEN** a `product-standards.md` file at the repository root
- **WHEN** its content is reviewed
- **THEN** it includes unit economics, a North Star metric, a quality gate, and a definition of done

### Requirement: pizdato-net North Star and unit economics
The North Star metric for pizdato-net is audience growth of **+5–10 new subscribers per week**,
with view-rate (target order ~27–31% on small channels) as a secondary metric. Unit economics
are not monetized yet — the goal is audience, not revenue (promotion phase).

#### Scenario: North Star is audience growth
- **GIVEN** the product standards document for pizdato-net
- **WHEN** the North Star metric is read
- **THEN** it states +5–10 new subscribers per week, and view-rate as the secondary metric

#### Scenario: Unit economics reflect a non-monetized promotion phase
- **GIVEN** the product standards document for pizdato-net
- **WHEN** the unit-economics section is read
- **THEN** it states the project is not monetized yet and the goal is audience, not revenue

### Requirement: pizdato-net quality gate
Content quality is gated by the `living-humanity-gate` (live language), a post review by the PO
(Yennefer) before publishing, russian-grammar-check, the mixed-script watchdog, and tone per
platform per the style-guide.

#### Scenario: Quality gate is applied before publishing
- **GIVEN** a post is ready to publish
- **WHEN** it is checked against the quality gate
- **THEN** it passes the living-language gate and the PO review before it is published

### Requirement: Definition of Done
A pizdato-net post is considered done when it is published, clean in language and tone, free of
internal/service information, and moves the +5–10/week North Star (or documents the reason for
deviation).

#### Scenario: A post meets the definition of done
- **GIVEN** a published post
- **WHEN** it is evaluated against the definition of done
- **THEN** it is clean in language and tone, contains no internal/service info, and either moves
  the weekly growth goal or documents the reason for deviation