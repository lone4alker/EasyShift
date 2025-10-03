# EasyShift Mobile App Development Guide

## Overview
This guide will help you build and deploy the EasyShift mobile app using Capacitor. Your Next.js app has been configured to work as a mobile app for both Android and iOS platforms.

## Prerequisites

### For Android Development:
1. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)
2. **Java Development Kit (JDK)** - Version 11 or later
3. **Android SDK** - Will be installed with Android Studio

### For iOS Development (macOS only):
1. **Xcode** - Download from Mac App Store
2. **CocoaPods** - Install with: `sudo gem install cocoapods`
3. **iOS Developer Account** (for App Store deployment)

## Quick Start Commands

### Build and Open Android Project:
```bash
npm run cap:android
```

### Build and Open iOS Project:
```bash
npm run cap:ios
```

### Build and Sync (without opening IDE):
```bash
npm run cap:build
```

### Test in Browser:
```bash
npm run cap:serve
```

## Step-by-Step Instructions

### 1. Development Workflow

After making changes to your Next.js app:
```bash
# Build the app and sync to mobile platforms
npm run cap:build

# Or manually:
npm run build
npx cap sync
```

### 2. Android Development

1. **Open Android Project:**
   ```bash
   npm run cap:android
   ```

2. **In Android Studio:**
   - Wait for Gradle sync to complete
   - Connect an Android device or create an emulator
   - Click "Run" button or press `Ctrl+R`

3. **Build APK for Testing:**
   - In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
   - APK will be in: `android/app/build/outputs/apk/debug/`

4. **Build Release APK:**
   - In Android Studio: Build > Generate Signed Bundle / APK
   - Follow the signing process
   - Upload to Google Play Store

### 3. iOS Development (macOS only)

1. **Install CocoaPods (if not already installed):**
   ```bash
   sudo gem install cocoapods
   cd ios/App
   pod install
   ```

2. **Open iOS Project:**
   ```bash
   npm run cap:ios
   ```

3. **In Xcode:**
   - Select your development team in Project Settings
   - Choose a device or simulator
   - Click "Run" button or press `Cmd+R`

4. **Build for App Store:**
   - Product > Archive
   - Follow the App Store upload process

### 4. Live Reload During Development

For faster development, you can use live reload:

1. **Start your Next.js dev server:**
   ```bash
   npm run dev
   ```

2. **Update capacitor.config.ts temporarily:**
   ```typescript
   const config: CapacitorConfig = {
     appId: 'com.easyshift.app',
     appName: 'EasyShift',
     webDir: 'out',
     server: {
       url: 'http://localhost:3000', // Add this line
       cleartext: true
     }
   };
   ```

3. **Sync and run:**
   ```bash
   npx cap sync
   npx cap run android
   # or
   npx cap run ios
   ```

**Important:** Remove the server URL before building for production!

## Configuration Files

### capacitor.config.ts
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easyshift.app',
  appName: 'EasyShift',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### next.config.mjs
```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  images: {
    unoptimized: true
  }
};
```

## Troubleshooting

### Common Issues:

1. **"Could not find gradle wrapper"**
   - Make sure Android Studio is installed
   - Open the `android` folder in Android Studio first

2. **iOS build fails**
   - Run `cd ios/App && pod install`
   - Make sure Xcode command line tools are installed: `xcode-select --install`

3. **App shows white screen**
   - Check if the build was successful: `npm run build`
   - Ensure all paths in your app use relative URLs
   - Check browser console in the mobile app for errors

4. **App won't load data**
   - Ensure your API endpoints use HTTPS in production
   - Check network security configurations for your domain

### Useful Commands:

```bash
# Check Capacitor doctor for issues
npx cap doctor

# Clean and rebuild
npx cap sync --deployment

# View device logs
npx cap run android -l
npx cap run ios -l

# Copy web assets only
npx cap copy

# Update plugins
npx cap update
```

## Native Features

To add native device features, install Capacitor plugins:

```bash
# Camera
npm install @capacitor/camera

# Geolocation
npm install @capacitor/geolocation

# Push notifications
npm install @capacitor/push-notifications

# Local notifications
npm install @capacitor/local-notifications
```

After installing plugins, sync:
```bash
npx cap sync
```

## App Store Deployment

### Android (Google Play Store):
1. Build signed APK or AAB in Android Studio
2. Create developer account at [play.google.com/console](https://play.google.com/console)
3. Upload your app and follow the review process

### iOS (App Store):
1. Build and archive in Xcode
2. Upload via Xcode or Application Loader
3. Create app in App Store Connect
4. Submit for review

## Support

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Android Developer Guides](https://developer.android.com/guide)
- [iOS Developer Documentation](https://developer.apple.com/documentation/)

## Your App Details

- **App ID:** com.easyshift.app
- **App Name:** EasyShift
- **Vercel URL:** https://easy-shift-seven.vercel.app/
- **Platforms:** Android, iOS
- **Build Output:** `out/` directory