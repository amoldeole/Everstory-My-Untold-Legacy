# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Writing** — Markdown editor with autosave, keyboard shortcuts, live word count, server-rendered preview, and per-entry metadata (chapter, date, place, mood, status, visibility).
- **Chapters** — 15 default chapters with per-chapter progress; create, rename and delete your own.
- **Prompts** — 90 guided questions across 15 chapters, with answered/unanswered tracking and filters.
- **Timeline** — dated entries and explicit milestones merged into one chronological view.
- **People** — tag the people in your story; see every memory they appear in.
- **Photos** — upload and attach images, stored on local disk or any S3-compatible service.
- **Sharing** — private by default; publish a single entry with an unguessable, revocable link.
- **Legacy contacts** — name the people who should read the entries you mark "legacy".
- **Export** — EPUB 3, print-ready HTML, Markdown and a complete JSON archive.
- **Auth** — email and password (scrypt), optional Google and GitHub sign-in, and a single-user mode.
- **Theming** — light and dark, following the system until you choose.
- **Tooling** — `npm run doctor` for environment diagnostics, `npm run smoke` for post-deploy checks.
- **CI/CD** — Ubuntu/macOS/Windows matrix, a real-Postgres job, and multi-architecture Docker images published to GHCR.

### Changed

- Nothing yet — this is the first release.

### Security

- Passwords hashed with scrypt using per-password salts.
- Session tokens are opaque and stored only as SHA-256 hashes.
- All rendered Markdown is sanitised server-side.
- Uploads are served exclusively through an authorising route handler.
