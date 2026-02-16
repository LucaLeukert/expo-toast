# expo-toast Agent Guide

## Repository Overview
- `expo-toast` is an Expo Module that provides native-feeling toast notifications.
- Primary target is iOS (iOS 26+ behavior is the focus for native glass styling and motion).
- The module exposes a TypeScript-first API from `src/` and bridges to native iOS code in `ios/`.
- A runnable integration/demo app lives in `example/` and is used to validate UX, queue behavior, transitions, keyboard handling, and platform behavior.

## Structure
- `src/`: public JS/TS API, types, and native-module bindings.
- `ios/`: native queue, presenter, and toast view implementation.
- `example/`: Expo app for manual and integration testing.
- `tests/`: unit tests for TS runtime behavior and normalization logic.

## Workflow Rules
- Keep changes scoped and pragmatic; prefer native-first behavior for iOS UX details.
- Run project checks relevant to the change (`bun run lint`, `bun run build`, tests as needed).
- Keep `/Users/lucaleukert/src/expo-toast/README.md` and `/Users/lucaleukert/src/expo-toast/CHANGELOG.md` in sync with shipped behavior, API signatures, defaults, and platform constraints.
- **Commits are required before work is considered finished.**
- Use small, incremental commits with clear messages grouped by feature/fix area.
