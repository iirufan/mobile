# Daily Reminder (Android app)

Prayer times, a **Qibla** compass, morning/evening **Azkār**, a **Tasbīḥ** counter (with a floating button), and a **How to pray** guide — the same app you've been using, built as an installable Android app with **background prayer-time notifications**: the adhān reminders fire even when the app is closed. It comes with its own mosque app icon.

Built with Capacitor. The screen is the web app in `www/`; background notifications use Android's own alarm system through `@capacitor/local-notifications`. The app icon is in `native/res/` and is installed by the setup script.

## What you need

- [Node.js](https://nodejs.org) 18 or newer
- [Android Studio](https://developer.android.com/studio) with an Android SDK
- A phone with USB debugging on (Settings → About phone → tap **Build number** 7 times → Developer options → **USB debugging**)

## Build it

```bash
npm install
npm run android
```

`npm run android` creates the Android project, adds the notification plugin, and opens Android Studio. Wait for the Gradle sync, plug in your phone, and press **Run ▶**.
For an APK file: **Build → Build App Bundle(s) / APK(s) → Build APK(s)** → `android/app/build/outputs/apk/debug/app-debug.apk`.

After editing anything in `www/`, run `npm run setup` and press Run again.

## First launch — let it remind you in the background

1. When the app asks, **allow notifications**.
2. **Android 12 and newer need exact-alarm permission** for reminders to fire on time: Settings → Apps → Salah Bell → **Alarms & reminders** (sometimes under "Special app access") → allow. Without it, reminders may be late or skipped.
3. **Battery:** set Salah Bell to **unrestricted** (Settings → Apps → Salah Bell → Battery). On Xiaomi / Oppo / Vivo / Realme / Huawei, also turn on **Autostart** and lock the app in Recents. These phones aggressively kill background alarms otherwise.

Then open the app once, set your **island and calculation method**, and fine-tune the times if needed. The app schedules the next 7 days of prayers as notifications; opening it now and then keeps them topped up.

## Good to know

- **Background notifications use your phone's default notification sound.** The custom adhān audio file you can pick inside the app plays only while the app is open — Android won't play a user-picked file for a background notification.
- Reminders reschedule automatically when you change location, method, time adjustments, or the before-reminder, and whenever you reopen the app.
- Everything (settings, Azkār counts, Tasbīḥ totals) stays on the phone.
- Azkār reminders (morning at sunrise, evening at ʿAsr) are included when you turn them on in Settings.

## Files

| Path | What it is |
|---|---|
| `www/index.html` | The whole app (Prayer, Azkār, Tasbīḥ) |
| `www/native.js` | Schedules the background prayer notifications |
| `native/res/drawable/ic_stat_bell.xml` | The small notification icon |
| `scripts/setup-android.js` | Builds the Android project and wires the plugin |

To change the app icon, replace the launcher icons in `android/app/src/main/res/mipmap-*` (Android Studio: right-click `res` → New → Image Asset).
