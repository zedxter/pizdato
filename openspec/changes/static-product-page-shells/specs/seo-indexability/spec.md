## ADDED Requirements

### Requirement: Critical product pages expose main text in initial HTML
The homepage `/` and other critical product URLs listed in the public sitemap (`/pizdato`, `/lenta`, `/articles`, `/faq`, `/issledovanie`) MUST include primary page copy in the initial HTML response inside the document’s main content container (not only inside `<noscript>` and not only after client JavaScript execution), along with title and canonical URL already present for those pages.

#### Scenario: Yandex-style fetch of homepage without JavaScript
- **WHEN** a crawler requests `https://pizdato.net/` and does not execute JavaScript
- **THEN** the HTML body still contains extractable Russian prose describing the product (vote / пиздато vs хуёво) outside of `<noscript>` alone

#### Scenario: Other thin product URLs without JavaScript
- **WHEN** a crawler requests `/pizdato`, `/lenta`, `/articles`, `/faq`, or `/issledovanie` without executing JavaScript
- **THEN** each response still contains extractable main copy for that page outside of `<noscript>` alone

## MODIFIED Requirements

### Requirement: Yandex can be guided to render JS where needed
Until all critical pages reach static content parity, the operator MUST configure Yandex Webmaster JavaScript rendering so the bot prefers full page content, and MUST verify representative URLs with Webmaster page check. After product-page static shells land, the operator MUST re-check `/` (and optionally one magnet) in Webmaster; JS rendering MAY remain enabled as a safety net for any remaining thin or dynamic surfaces.

#### Scenario: Thin shell detected
- **WHEN** Webmaster page check shows missing main content without JS on a critical URL
- **THEN** either static content is added for that URL or forced JS rendering remains enabled until parity is reached

#### Scenario: Homepage re-check after static shell deploy
- **WHEN** static `#root` content for `/` has been deployed
- **THEN** the operator re-runs Webmaster page check (or site availability check) for `/` and confirms the “document contains no text” / homepage-unavailable failure is cleared or no longer attributed to empty document text
