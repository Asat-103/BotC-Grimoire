# Pocket Grimoire 2.0

An independent redesign of Skateside’s Pocket Grimoire. The working name is internal. The application retains the upstream GPL-3.0 license, notices and community attribution.

## Upstream inventory

- Symfony 6.4, Twig, Doctrine and Webpack Encore. Browser state flows through observers, `TokenStore`, `Pad` and the `pocket-grimoire` localStorage record.
- The compiled locale feed supplies script metadata, roles, reminders, night instructions, jinxes and player-count distributions. Custom scripts accept IDs and homebrew objects. Public sheets and QR sharing use script data. Homebrew registration and some imports use the server.
- Setup supports manual and random token selection, duplicates, concealed bag drawing, shuffle-and-add and configurable placements. The workspace supports drag, resize, death, ghost votes, reminders, travellers, fabled, bluffs, notes and export.
- Upstream presentation dialogs use an opaque backdrop. Custom information tokens use saved strings. Night order includes custom order, player names and display filters.
- App and character translations are separate. Artwork and locally bundled type are inherited assets. Keep the in-app credits and upstream attribution. The upstream manifest has no service worker.
- Baseline `npm run build` passes. A fresh clone needs generated locale feeds and role artwork to run the full app. There is a PHPStan configuration and no upstream automated browser suite. Mobile usability gaps include nested accordions, swipe-only night navigation and crowded player controls.

## Direction and rollout

Use dark felt, brass details, editorial serif headings and restrained burgundy. Provide a warm light theme and a compact, labelled navigation bar on small screens. Preserve original Twig partials and events as feature entry points. Keep presentation in an opaque modal with an explicit handback, and keep private state out of shared URLs and HTTP caches.

- [x] Establish responsive workspaces, a script-first home and appearance settings.
- [x] Add seating, role handover, night progress and a local game archive.
- [x] Add a two-sided information-token editor and an offline app shell.
- [x] Add private player notes and role history, favourites and recents, and a manual nomination log.
- [x] Add reusable custom reminders, player assignment and repositioning.
- [x] Add per-side artwork and optional haptics.
- [ ] Complete native Android and tablet hardware QA.
- [ ] Investigate individual-device delivery separately. A future implementation needs a secure private handoff per player.

Run `npm run build` after preparing assets as described in CONTRIBUTING.md. Run `vendor/bin/phpstan analyse --memory-limit=512M` and `bin/console lint:twig templates` after installing Composer dependencies.


New interface copy uses Symfony’s English fallback until translated. The original information phrases remain individual entries. The publisher’s glossary describes the tokens and leaves reverse-side pairings undocumented. [Clocktower glossary](https://wiki.bloodontheclocktower.com/Glossary)

The banner is an original generated illustration. Edition cards use representative character artwork from the upstream asset pipeline.

A first online visit is required for offline play. The worker caches the installed app’s visited locale and eligible same-origin assets. Public script publishing, remote imports and uncached remote artwork still require a connection. The worker does not cache private session state, which is stored locally with the existing game save.

The current Composer lock needs PHP 8.4 or newer. The upstream PHPStan run on the same toolchain reports 127 existing findings.
