# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

HiBuddy — a MERN social/chat app (feed, stories, friends/relationships, groups, real-time 1:1 and group chat with E2EE, WebRTC voice/video calls). Two independent apps in one repo, each with its own `package.json` and `node_modules`:

- `BackEnd/` — Express + Mongoose + Socket.IO API server.
- `frontend/` — Create React App (React 18, Redux Toolkit, React Router 6, Bootstrap).

The root `package.json` is not a workspace root; it only holds one stray devDependency. Always `cd` into `BackEnd/` or `frontend/` before running scripts.

## Commands

### Backend (`BackEnd/`)
```
npm run dev        # nodemon server.js — starts API + Socket.IO on $PORT (default 5500)
```
There is no lint/test/build script defined for the backend.

### Frontend (`frontend/`)
```
npm start                # react-scripts start (dev server on :3000)
npm run build             # production build (NODE_ENV=production)
npm run build:staging     # staging build
npm run build:dev         # development-flavored build
npm test                  # react-scripts test (Jest + RTL, interactive watch)
npm test -- --watchAll=false --testPathPattern=App   # single-file / CI-style run
```
Linting is whatever `react-app`/`react-app/jest` eslint config reports inline during `start`/`build` — no standalone `npm run lint`.

### Environment
Both apps load config from a `.env` file in their own directory (`BackEnd/.env`, `frontend/.env`) — not committed. Backend needs at least `MONGO_URI`, `JWT_SECRET`, `AUTH_PEPPER`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, AWS S3 creds (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`). Frontend needs `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL`.

## Backend architecture

- **Entry point**: `server.js` creates the `http.Server`, attaches Socket.IO (`socket/socket.js`), wires a catch-all error handler, and starts listening. `app.js` builds the Express app (CORS allowlist, body-parser, cookie-parser, mounts every route module) and is required by `server.js` — keep route registration in `app.js`, keep process/server lifecycle in `server.js`.
- **Route mounting** (`app.js`): `router.js` at `/`, then `authRoutes` → `/auth`, `profileRoutes` → `/profile`, `postRoutes` → `/post`, `storyRoutes` → `/stories`, `notificationRoutes` → `/notifications`, `messageRoutes` → `/messages`, `groupRoutes` → `/group`, `relationships` → `/relationships`, `conversationRoutes` → `/conversations`, `userRoutes` → `/users`.
- **Auth**: JWT stored in an `httpOnly` cookie named `token` (see `cookieOptions` in `authRoutes.js`), verified by `routes/verifyToken.js` (`req.cookies.token` → `req.decoded`). Supports email/password (bcrypt) and Google OAuth (Passport `GoogleStrategy`, configured inline in `authRoutes.js`). There is **no bearer-token refresh endpoint on the backend** (`/auth/refresh-token` referenced by the frontend's `authService.js` doesn't exist server-side) — the cookie-based flow via `api.js` is the one actually in use.
- **Two parallel user models**: `Modules/Muser.js` (`mongoose.model("Muser", ...)`) is the real, actively-used user schema (friends, onboarding, keys, profile fields). `Modules/User.js` (`mongoose.model("user", ...)`) is a vestigial two-field schema — don't build on it.
- **Two parallel messaging systems** — know which one you're touching:
  - *Legacy*: `routes/router.js` (`/sendMessage`, `/:userId/messages`, `/updateMessageStatus`, `/deleteChat`) stores messages as an embedded map (`Muser.messages[otherUserId] = [...]`) directly on the user document. No Socket.IO involvement.
  - *Current*: `Modules/Messages.js` (`messages` collection) + `Modules/conversations.js` (`Conversation`, tracks `participants`, `lastMessage`, per-user `unreadCount` map) via `routes/messageRoutes.js` (`/messages/postMessage`, `/messages/getMessages`, etc.) and real-time delivery/read-receipts/reactions/typing/WebRTC signaling in `socket/socket.js`. `routes/router.js` also has a second, overlapping `/postMessage` + `/getMessages/:chatId` implementation against the same `Messages` model — when adding message features, prefer `messageRoutes.js` + `socket/socket.js` and treat `router.js`'s message endpoints as legacy.
- **Real-time (`socket/socket.js`)**: presence tracked in an in-memory `onlineUsers` Map (`userId -> socket.id`); each socket also `join()`s a room named after its own `userId`, so server code emits to a user via `io.to(userId)`. Client must emit `user:init` with the user's `_id` right after connecting (done in `contexts/UserContext.js`). Also handles typing indicators, message read receipts, reactions, and WebRTC call signaling (`call:start/offer/answer/ice_candidate/end/reject`) with an in-memory `activeCalls` Map — none of this presence/call state survives a server restart or scales across multiple instances.
- **E2E encryption key storage**: `Modules/keysModel.js` stores each user's `encryptedMasterKey`/`salt`/`iv` (uploaded via `/auth/upload-keys`, fetched via `/auth/user-keys`); `Muser.publicKey` holds the per-user public key (`/auth/public-key` PATCH). Message `content` in `Modules/Messages.js` is the E2EE ciphertext — the server never sees plaintext.
- **File uploads**: `multer` with memory storage feeding `utils/s3Upload.js` (AWS S3) for posts, stories, profile pictures, and message attachments; `BackEnd/uploads/stories` is a leftover local-disk path from an older flow.

## Frontend architecture

- **Entry/routing**: `src/App.js` defines all routes with `react-router-dom` v6; most pages are lazy-loaded. Route guarding relies on `isLoggedIn` from `UserContext`, not a router loader/guard component (`ProtectedRoute.js` exists but isn't wired into every route above).
- **Global state is split across two systems** — pick the right one:
  - `contexts/UserContext.js` (React Context) owns the current `user`, the live `socket` instance, presence (`activeUsers`), and incoming-call state. It creates the socket via `utils/socket.js` (`initializeSocket`, a module-level singleton) and emits `user:init` on connect.
  - `store/store.js` (Redux Toolkit) owns `auth`, `chat`, and `notifications` slices (`store/userSlice.js`, `store/chatSlice.js`, `store/notificationSlice.js`). Chat UI components (`ChatUi.js`, `GroupChatUi.js`) primarily read/write Redux; call/presence UI reads Context.
- **Two HTTP clients exist — use `src/api.js`, not `src/services/apiClient.js`**: `api.js` is `axios` with `withCredentials: true` (cookie-based auth, matches the backend) plus centralized 401/403/404/500 redirect handling and an auth-route allowlist that skips the redirects on login/register screens. `services/apiClient.js` is a separate Bearer-token axios instance (`Authorization` header + `refreshToken()`) that assumes a `/auth/refresh-token` endpoint the backend doesn't implement — it's effectively dead/broken; new HTTP calls should go through `services/*.js` files that wrap `api.js` (e.g. `authService.js`, `profileService.js`, `messageService.js`).
- **E2EE**: `services/keyse2e.js` (public key exchange endpoints) and `utils/CryptoUtils.js` (client-side crypto helpers, `crypto-js`) implement encrypt/decrypt around the master key delivered via the OAuth/login redirect `seed` query param (see `authRoutes.js` `symmetricSeed`) and consumed on `pages/AuthSuccess.js` / `components/Onboarding.js`.
- **Sockets in components**: components that need real-time chat events pull the shared socket via `useContext(UserContext).socket` rather than reconnecting — `utils/socket.js`'s `initializeSocket`/`getSocket`/`disconnectSocket` intentionally maintain a single module-level socket.
- **Styling**: Bootstrap 5 + `react-bootstrap` globally, plus hand-written CSS per feature under `src/css/` (not CSS modules — plain global stylesheets imported per component/page).
Project: Chat Application

Stack:
- React frontend
- Express backend
- MongoDB
- Socket.IO

Rules:
- Use JavaScript, not TypeScript.
- Follow existing code style.
- Ask before installing packages.
- Explain changes before modifying files.