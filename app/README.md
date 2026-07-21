# MyRoots Mobile

Expo React Native mobile application for MyRoots.

## Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- Expo Router
- React Query
- React Hook Form and Zod
- Axios
- Expo SecureStore
- Expo Image Picker, Clipboard, Sharing, and Safe Area support

## Setup

```bash
cd app
npm install
cp .env.example .env
```

Set the API URL in `.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_PUBLIC_WEB_URL=http://localhost:5173
EXPO_PUBLIC_APP_ENV=development
```

For Android emulators, use the host-machine alias if your backend runs locally:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api
```

When `EXPO_PUBLIC_API_URL` uses `localhost`, the app automatically rewrites it on mobile to the Expo development host. This prevents login/signup network errors in Expo Go on physical Android and iOS devices, where `localhost` points to the phone instead of your computer.

## Run Commands

```bash
npm start
```

Starts Expo and shows the QR code for Expo Go.

```bash
npm run android
```

Runs the app on an Android emulator or connected Android device.

```bash
npm run ios
```

Runs the app on an iOS simulator or connected iOS device.

```bash
npm run dev
```

Starts Expo for a development build client.

## Create Native Project Commands

Use these only when you need generated native `android/` and `ios/` folders.

```bash
npx expo prebuild
```

Create both Android and iOS native projects.

```bash
npx expo prebuild --platform android
```

Create only the Android native project.

```bash
npx expo prebuild --platform ios
```

Create only the iOS native project.

## Build Commands

Install or use EAS CLI:

```bash
npx eas-cli login
```

Create a development build:

```bash
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
```

Create a staging build:

```bash
npx eas-cli build --profile staging --platform android
npx eas-cli build --profile staging --platform ios
```

Create a production build:

```bash
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

Build both platforms:

```bash
npx eas-cli build --profile production --platform all
```

Create local JavaScript bundle exports for verification:

```bash
npx expo export --platform android --output-dir dist-android
npx expo export --platform ios --output-dir dist-ios
```

## Validate

```bash
npm run typecheck
npm run lint
npx expo install --check
```

## Troubleshooting

If Metro reports a missing `scheduler/package.json` after upgrading dependencies, reinstall packages and clear the Expo cache:

```bash
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
```

If the issue appears only in an already-running Expo terminal, stop that terminal and start Expo again:

```bash
npm start -- --clear
```

## Environments

Example files are included for development, staging, and production:

- `.env.development.example`
- `.env.staging.example`
- `.env.production.example`

Expo exposes public variables with the `EXPO_PUBLIC_` prefix.

## Converted Features

- Login and signup with native forms and Zod validation
- Secure token storage with `expo-secure-store`
- Dashboard tree list, create tree, delete tree, and sharing
- Profile editing and sign out
- Invite acceptance route
- Authenticated and public tree views
- Native recursive tree browsing
- Add root, parent, child, and spouse flows
- Person details, gender updates, delete modes, and image upload
- Tree rename
- Public/native sharing using Clipboard and Share
- Assistant chat against the existing chat API

## Web Replacements

- `react-router-dom` -> Expo Router
- `localStorage` -> Expo SecureStore
- HTML inputs/forms -> React Native inputs, Picker, and React Hook Form controllers
- Tailwind/DOM layout -> React Native `StyleSheet`
- Browser clipboard/share APIs -> `expo-clipboard` and React Native `Share`
- Browser image file input -> `expo-image-picker`
- React Flow/Dagre tree canvas -> native recursive tree list for mobile
- Browser PDF/export helpers -> not included in mobile; use native sharing/link flows

The existing `frontend` web app is unchanged.
