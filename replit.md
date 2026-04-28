# Workspace

## Overview

Chat por Afinidade — a Brazilian Portuguese video chat web app that connects strangers based on shared topic interests. Users select a nickname, gender, and up to 5 topics of interest, then get matched with someone who shares the most topics.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Routing**: wouter

## Artifacts

- `chat-app` — Main web app at `/` (React + Vite)
- `api-server` — Express API server at `/api`

## Features

- User registration with nickname, gender, and up to 5 topic interests
- Matchmaking queue with affinity scoring (users matched by most common topics)
- WebRTC-based video chat (camera + microphone permissions)
- Text chat panel alongside video
- Controls: mute/unmute mic, enable/disable camera, skip to next user, disconnect
- Real-time polling for match status and chat messages
- Topic stats endpoint showing popular topics and online count

## Database Schema

- `users` — id, nickname, gender, topics[], createdAt, updatedAt
- `matches` — id, user1Id, user2Id, commonTopics[], affinityScore, status, createdAt, endedAt
- `messages` — id, matchId, senderId, senderNickname, content, sentAt

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Routes

- `GET /api/healthz` — health check
- `POST /api/users/register` — register/update user
- `GET /api/users/:userId` — get user by ID
- `POST /api/queue/join` — join matchmaking queue
- `POST /api/queue/leave` — leave queue
- `GET /api/queue/status/:userId` — get queue/match status
- `GET /api/matches/:matchId/messages` — get chat messages
- `POST /api/matches/:matchId/messages` — send message
- `POST /api/matches/:matchId/next` — skip to next user
- `POST /api/matches/:matchId/end` — end match
- `GET /api/stats/topics` — get topic stats and online count

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
