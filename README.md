# Point of Sales

React, Vite, Tailwind CSS, Capacitor for Android, and a small optional Node API backed by SQLite.

By default, the frontend stores POS data on the current device with browser/WebView local storage. The Android app works offline and keeps products, sales, and inventory changes on that Android device.

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

The default frontend data mode is local/offline. To use the Node API during development, start the API server and run Vite with:

```bash
VITE_DATA_MODE=remote npm run dev
```

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

To build the web app in local/offline mode:

```bash
npm run build
```

To build it for the Node API mode:

```bash
VITE_DATA_MODE=remote npm run build
```

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

## Android

This project uses Capacitor to package the Vite app as an Android application. Data is stored locally inside the Android WebView, so each installed app keeps its own offline POS data.

Install Android Studio first, including the Android SDK. Then make sure either `ANDROID_HOME` is set or `android/local.properties` contains your SDK path, for example:

```properties
sdk.dir=/Users/your-name/Library/Android/sdk
```

Build and sync the Android project:

```bash
npm run android:sync
```

Open it in Android Studio:

```bash
npm run android:open
```

Build a debug APK from the command line:

```bash
npm run android:build
```

The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.
