# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

bioERGOtech Foundation website — a Next.js (App Router) + TypeScript app
styled with Tailwind and a custom design system in `app/globals.css`
(Poppins, teal primary `#2EC4B6`, `.card` / `.badge` / `.btn-primary`
utilities). Supabase powers auth and the member portal.

## Writing style

- **No em-dashes.** Systematically avoid the em-dash (`—`) in any text we
  write. Replace it with a full stop (`.`) to start a new sentence, or a
  comma (`,`) to continue the sentence. For a list introduction a colon
  (`:`) is fine, and for a numeric range use the word "to" (e.g. "3 to 6
  months"). This applies to all user-facing copy, metadata, and content.
- Tone: direct and benefit-oriented, but measured and appropriate for an
  institution. Avoid blunt or boastful phrasing.
- The site is in English. Keep navigation and copy in English.

## Design system

- Keep the existing design system: fonts, colors, spacing, and the
  components/utilities already defined in `app/globals.css`.
- Primary color is teal `#2EC4B6`; use it for CTAs, icons, and accents
  rather than large filled blocks.
- Do not rename or delete already-indexed routes; update labels and hero
  copy instead.
