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

By default, SQLite is stored at `server/data/pos.sqlite`. For deployment, set `DATABASE_PATH` to a path inside a persistent disk:

```bash
DATABASE_PATH=/var/data/pos.sqlite npm start
```

## Online Deployment

This app can be deployed online to platforms that support persistent disks, such as Render, Railway, Fly.io, or a VPS.

Use these commands:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Port: use the platform-provided `PORT` environment variable
- Persistent disk mount path: `/var/data`
- Environment variable: `DATABASE_PATH=/var/data/pos.sqlite`

This repo includes `render.yaml` with a 1 GB persistent disk mounted at `/var/data`. If you deploy manually, create the disk in the hosting dashboard and use the same mount path.

For a real production store, move from SQLite to a managed PostgreSQL database when multiple staff devices need to write data at the same time.
