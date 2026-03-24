# 📱 Boltwallet Mobile

The mobile version of Boltwallet, built using Expo and React Native.

## 🚀 Getting Started

### Prerequisites
- Node.js & pnpm
- [Expo Go](https://expo.dev/go) app installed on your phone.

### Development
1. Install dependencies from the root:
   ```bash
   pnpm install
   ```
2. Start the Expo server:
   ```bash
   pnpm start --filter @boltwallet/mobile
   ```
3. Scan the QR code with your phone (Expo Go).

## 📦 Deployment

### Building for iOS/Android
We use [EAS (Expo Application Services)](https://expo.dev/eas) for native builds.

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
2. **Login**:
   ```bash
   eas login
   ```
3. **Build**:
   ```bash
   eas build --platform ios
   # OR
   eas build --platform android
   ```

## 🎨 Branding
The app uses the `0logov3.png` hero logo for the app icon and splash screen, configured in `app.json`.
