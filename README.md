# Point of Sales

React, Vite, Tailwind CSS, and a small Node API backed by SQLite.

## Local Development

Install dependencies:

```bash
npm install
```

Run the API server:

```bash
npm run api
```

Run the frontend in another terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:4173`.

## Production

Build the frontend:

```bash
npm run build
```

Start the server:

```bash
npm start
```

The server exposes the API and serves the built frontend from `dist`.

## Online Deployment

This app can be deployed online to platforms that support persistent disks, such as Render, Railway, Fly.io, or a VPS.

Use these commands:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Port: use the platform-provided `PORT` environment variable

For a real production store, move from SQLite to a managed PostgreSQL database when multiple staff devices need to write data at the same time.
