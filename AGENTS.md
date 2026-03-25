# Repository Guidelines

## Project Structure & Module Organization
This repo is an npm workspace monorepo for `war-swarm`.

- `packages/client`: Vite + Phaser frontend (`src/` for game code, `public/assets/` for SVG art and effects).
- `packages/server`: Colyseus + Express backend (`src/index.ts` entry, `src/rooms/` for room logic and schema).
- `packages/shared`: Shared gameplay rules, constants, protocol types, and tests in `src/`.
- Root files: `package.json` orchestrates workspace scripts, `tsconfig.base.json` defines strict TypeScript defaults.

Keep shared game rules in `packages/shared` so client and server stay in sync.

## Build, Test, and Development Commands
- `npm install`: install workspace dependencies.
- `npm run dev`: start server and client together. Server runs on `http://localhost:2567`, client on `http://localhost:5173`.
- `npm run build`: compile shared, server, and client packages in dependency order.
- `npm run test`: run shared package tests with Node’s `tsx --test` runner.
- `npm run host`: build everything and serve the hosted build from the server.
- `npm run host:internet`: run hosted mode and expose port `2567` through `ngrok`.

## Coding Style & Naming Conventions
The codebase uses strict TypeScript with 2-space indentation, semicolons, and double quotes. Prefer named exports for shared utilities and keep modules focused by domain.

- `PascalCase` for classes and room/state types, for example `WarRoom`.
- `camelCase` for functions, variables, and methods, for example `getSpawnPoint`.
- `UPPER_SNAKE_CASE` for gameplay constants, for example `MAX_HUMAN_PLAYERS`.
- Use `.test.ts` suffix for tests, for example `gameplay.test.ts`.

There is no dedicated lint script yet, so match the existing style closely and rely on `tsc` for static checks.

## Testing Guidelines
Tests currently live in `packages/shared/src` and run with `tsx --test`. Add tests beside the shared logic they cover, especially for deterministic gameplay calculations, balance rules, and protocol-safe helpers.

Run `npm run test` before opening a PR. If you change shared rules, add or update a matching `.test.ts` file.

## Commit & Pull Request Guidelines
History is currently short and uses concise, imperative subjects such as `Implement War Swarm multiplayer prototype`. Follow that pattern.

- Keep commit titles short, imperative, and specific.
- Group related client/server/shared changes in one coherent commit.
- PRs should explain gameplay or networking changes, list commands run (`npm run build`, `npm run test`), and include screenshots or short clips for visible client changes.
