# Sangsters app (iOS / Android)

Expo app for guests, tenants, property owners, partners and staff. One sign-in for everyone;
the app opens the right home screen from the records linked to the person's email
(booking, tenancy, ownership, investment or staff account).

- Screens: `src/app` (welcome, sign-in, email code, password, home) and `src/screens` (one file per role)
- Data: the portal API at `https://app.sangstersgroup.com/api/app` (in this repo: `app/api/app`)
- Bundle ID: `com.sangstersgroup.sangster`

## First release to the App Store (run on a Mac, inside this `mobile` folder)

```
npm install
npx eas-cli@latest login            # Expo account (free)
npx eas-cli@latest init              # links the project, adds its ID to app.json
npx eas-cli@latest update:configure  # turns on over-the-air updates
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

Before submitting:
- Supabase → Authentication → Providers → Apple: enable it and add `com.sangstersgroup.sangster` as a client ID (for "Sign in with Apple").
- App Store Connect → App Review: add a demo login for each account type.

## Updates after release

- Design and text changes: `npx eas-cli@latest update --branch production --message "what changed"` (live in minutes, no review)
- New permissions, icon, app name or native modules: build and submit again (Apple review, 1–2 days)

## Run locally

```
npx expo start          # scan the QR code with Expo Go, or press w for web
npx tsc --noEmit        # typecheck
npx expo-doctor         # check config
```
