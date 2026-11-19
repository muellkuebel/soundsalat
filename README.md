# Soundsalat

Soundsalat is a touch-first web app for children to build audio collages and little sound stories. The interface is in German. It is a landscape PWA for iPad (Safari) and Android tablets such as the Samsung Galaxy Tab (Chrome and Samsung Internet).

The live app is [https://muellkuebel.github.io/soundsalat/](https://muellkuebel.github.io/soundsalat/). Pushes to `main` build and deploy there with GitHub Pages.

Projects, clip edits, and microphone recordings stay in this browser (IndexedDB). Nothing is uploaded.

## Run it locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123/soundsalat/](http://127.0.0.1:43123/soundsalat/). The app is served under `/soundsalat/`, the same base path as GitHub Pages. The dev server listens on the local network as well.

```bash
npm test
npm run build
npm run preview
```

`preview` serves the production build, including the service worker, on the same port.

## Layout

The app fills the screen in landscape. There is no centered phone frame.

- iPad-style 4:3 (about 1024×768 or 1180×820) uses three project cards per row.
- Wider 16:10 tablets (about 1280×800) use four cards.
- 16:9 tablets (about 1920×1080) use five cards.
- The timeline is full width, so a wider screen shows more of the story at once.
- Category buttons, the record bar, and the top bar stretch across the width. Controls stay large touch targets and do not grow without a limit.

A short hint appears if the tablet is held in portrait.

## Install on an iPad

1. Put the iPad and the computer on the same Wi-Fi.
2. For a quick look, open `http://<computer-ip>:43123/soundsalat/` in Safari.
3. Microphone recording needs a secure page. Safari on iOS only allows the microphone on HTTPS (localhost counts, but the iPad is not localhost). Start the server with a local certificate:

   ```bash
   npm run dev:https
   ```

   Open `https://<computer-ip>:43123/soundsalat/`. Safari warns about the certificate. Show the details and visit the site anyway, then allow the microphone.
4. To install: the Share button, then **Zum Home-Bildschirm**. The icon name is Soundsalat. Open it from the home screen in landscape.
5. For an offline-capable install, build first so the service worker is active:

   ```bash
   npm run build
   HTTPS=1 npm run preview
   ```

   Load the page once while online, then add it to the home screen.

If playback is silent, switch off the iPad mute switch and raise the volume. Web Audio follows that switch.

## Install on a Samsung Galaxy Tab (Android)

Chrome and Samsung Internet install the PWA from the manifest: name **Soundsalat**, 192 and 512 icons including a maskable icon, `display: standalone`, `orientation: landscape`.

1. Use the same Wi-Fi as the computer.
2. The microphone needs HTTPS. A plain `http://192.168…` address is not a secure context on Android, so Chrome blocks `getUserMedia` there.

   ```bash
   npm run dev:https
   ```

   For the installable offline build:

   ```bash
   npm run build
   HTTPS=1 npm run preview
   ```

3. On the tablet, open `https://<computer-ip>:43123/soundsalat/`. The published app is [https://muellkuebel.github.io/soundsalat/](https://muellkuebel.github.io/soundsalat/).
4. Accept the certificate warning (Advanced, then proceed). Allow the microphone when asked.
5. Install:
   - **Chrome:** menu, then **Install app** or **Add to Home screen**. If the item is missing, use the app for a moment and open the menu again. The Eltern area also shows **App installieren** when Chrome fires the install event.
   - **Samsung Internet:** menu, **Add page to**, **Home screen**, or **Install**.
6. Open Soundsalat from the home screen. Android should open it standalone and prefer landscape.

On the computer itself, `http://127.0.0.1:43123/soundsalat/` is a secure context, so the microphone works there without the HTTPS script.

## How to play

- **Für Eltern** asks a short addition question, then lists projects to rename or delete. A long-press on a card opens the same rename and delete actions. Deleting asks the question first.
- Tap **+** to start a project, pick a picture, and name it.
- The bottom domes are sound trays. Drag a sound up onto a lane, or tap it to drop it at the playhead.
- Tap a clip to select it. The top bar takes its color: volume, preview, duplicate, lock, trim, delete.
- Drag clips between the four lanes. Drag the playhead to move through the story. The strip above the lanes is an overview.
- The red microphone dome records. The level meter moves while you record. The check mark saves the take into the microphone tray and onto the timeline.
- The scissors open the trim view. Drag the pink handles, then confirm. Trimming only stores start and end offsets.
- The share button mixes every lane and exports a WAV file. It uses the system share sheet when the browser can share files, and otherwise downloads the file.

## Sounds

Each category ships about eight or nine real sound effects, trimmed and saved as mono MP3. They are all **CC0** (public domain). Authors and source pages are in [CREDITS.md](CREDITS.md). If a file fails to load, that clip falls back to a short synthesized sound. The service worker caches the MP3s for offline use after the production build has been opened once.

To add more recordings:

1. Put a `.wav` or `.mp3` under `public/sounds/`, for example `public/sounds/halloween/eule.mp3`.
2. Add an entry to `public/sounds/manifest.json`:

```json
{
  "clips": [
    {
      "id": "eule",
      "name": "Eule",
      "category": "halloween",
      "icon": "bird",
      "file": "halloween/eule.mp3",
      "duration": 2.4
    }
  ]
}
```

`category` is one of `mic`, `halloween`, `castle`, `fire`, `princess`, `football`, `circus`, `pirates`, `space`, `skate`. `duration` is the length in seconds shown before the file is decoded. The file is added beside the procedural sounds. Use sounds you have the rights to use.

## Screenshots

`docs/screenshots/` has home, editor, recording, and trim captures at 1024×768, 1180×820, 1280×800, and 1920×1080.

## Limitations

- The bundled effects are CC0 recordings, not a commercial sample library. A missing file falls back to a short synthesized sound.
- Exports are uncompressed WAV, so longer stories make larger files.
- Trims do not rewrite the recording. They store start and end offsets.
- An iPad and an Android tablet do not share projects. Each browser profile has its own IndexedDB.
- Clearing the browser’s site data deletes the projects.
- The service worker caches the app after a visit. The dev server does not register it. Use `build` and `preview` to test offline mode and the install prompt.
- `npm run dev:https` uses a self-signed certificate. The tablet has to trust it before the microphone works.
- Installed apps ask for landscape, but the browser can still be rotated. Portrait shows a hint and keeps the same controls.
- A device with no microphone, or a denied permission, can still build stories from the built-in sounds. The record panel explains the problem in German.
