# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0 - 2026-02-16

- Initial public release.
- iOS-native toast presenter with queueing, variants, transitions, and dismiss controls.
- TypeScript-first API for Expo apps.
- Added `toast.configure` for global defaults and queue controls (`maxVisible`, `maxQueue`, `dropPolicy`).
- Added `toast.promise` and `toast.update` helper APIs.
- Added dedupe controls (`dedupeWindowMs`, `dedupeKey`) with bounded cache behavior.
- Added accessibility controls (`accessibilityLabel`, `announce`, `importance`).
- Added reduced-motion controls (`motion: 'system' | 'full' | 'minimal'`).
