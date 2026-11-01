# App Store / TestFlight Setup Guide

Use this checklist to finish the Apple setup for the iOS app.

Current iOS bundle ID in this repo:

```text
com.palyjournalism.app
```

## What You Already Have

- `.p12` certificate
- `.p8` App Store Connect API key file
- Key ID
- Issuer ID
- iOS bundle ID set in `app.json`

## 1. Confirm Apple Access

1. Go to [Apple Developer](https://developer.apple.com/account/).
2. Make sure the account is enrolled in the paid Apple Developer Program.
3. Go to [App Store Connect](https://appstoreconnect.apple.com/).
4. Make sure you can access **Apps**.
5. If Apple asks you to accept agreements, accept them before continuing.

## 2. Register The Bundle ID

1. Open [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
2. Click **Identifiers**.
3. Click the **+** button.
4. Select **App IDs**.
5. Select **App**.
6. For **Description**, enter:

```text
PALY Press
```

7. For **Bundle ID**, choose **Explicit**.
8. Enter:

```text
com.palyjournalism.app
```

9. Enable only the capabilities the app actually uses.
10. Click **Continue**.
11. Click **Register**.

## 3. Create The App Store Connect App

1. Open [App Store Connect](https://appstoreconnect.apple.com/).
2. Go to **Apps**.
3. Click **+**.
4. Choose **New App**.
5. Fill in:

```text
Platform: iOS
Name: PALY Press
Primary Language: English
Bundle ID: com.palyjournalism.app
SKU: paly-journalism-ios
User Access: Full Access
```

6. Click **Create**.

## 4. Handle Signing

Easiest path: let EAS manage signing.

1. From this repo, run:

```bash
eas build -p ios --profile production
```

2. When EAS asks about credentials, choose the option to let EAS manage or generate credentials.
3. If EAS asks for Apple login, sign in with the Apple Developer account.
4. EAS should create or reuse the distribution certificate and provisioning profile.

Manual path if you want to use your existing `.p12`:

1. Make sure the `.p12` is an **Apple Distribution** certificate.
2. Make sure you know the `.p12` password.
3. Create an **App Store** provisioning profile for `com.palyjournalism.app`.
4. Download the `.mobileprovision` file.
5. Give EAS the `.p12`, password, and provisioning profile when prompted.

## 5. Build For TestFlight

Run:

```bash
eas build -p ios --profile production
```

Wait for the build to finish successfully.

## 6. Submit The Build

If EAS is configured with the App Store Connect API key, run:

```bash
eas submit -p ios --profile production
```

Use these when prompted:

```text
.p8 file
Key ID
Issuer ID
```

After upload, wait for Apple to process the build in App Store Connect.

## 7. Enable TestFlight

1. Open the app in App Store Connect.
2. Go to **TestFlight**.
3. Select the processed build.
4. Add internal testers.
5. Fill in any required test information.
6. Start testing.

## 8. Before Public App Store Release

Complete these in App Store Connect:

- App description
- Keywords
- Support URL
- Marketing URL, if available
- Screenshots
- App icon
- App privacy questionnaire
- Age rating
- Export compliance
- Review notes, if Apple needs login/test details
- Final build selected for release

## Quick Success Check

You are ready for TestFlight when all of these are true:

- `com.palyjournalism.app` is registered in Apple Developer.
- The App Store Connect app exists.
- EAS production iOS build succeeds.
- EAS submit succeeds.
- The build appears under TestFlight.
