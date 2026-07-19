# Disasters – Emergency & Public Safety Platform

Disasters is a responsive web/PWA and Android application for reporting emergencies and civic issues, AI-assisted triage, configurable authority routing, real-time status tracking, and incident messaging.

## Included applications

- Citizen web/PWA: reporting, media uploads, geolocation, tracking, messaging and notifications.
- Authority operations: queue filters, assignment, status workflow, dispatch and audit events.
- `/admin`: role-based access, email invitations, per-user permissions, authority endpoints, AI providers, organization themes, SLA and APK settings, and audit logs.
- Android wrapper: Capacitor app loading the secured Vercel deployment, with a GitHub Actions APK build/release workflow.

## Free service architecture

- Firebase Authentication and Cloud Firestore on the Spark plan.
- Vercel Hobby deployment and Vercel Blob Hobby media storage.
- OpenStreetMap links for mapping without a paid maps key.
- Gemini through the supplied server-side key, three selectable free local Ollama models, and an always-available deterministic rules fallback.

Firebase Cloud Storage is intentionally not used because new projects require the Blaze plan. API keys and Vercel Blob credentials remain server-side and are excluded from Git.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`. Email/password Authentication must be enabled in the linked Firebase project.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Android

The committed `android/` project is generated with Capacitor. Update `CAPACITOR_SERVER_URL`, run `npm run cap:sync`, and build with Android Studio or the included GitHub workflow. Tagged releases attach `Disasters.apk`, which is linked from the app’s Settings page.

## Safety boundary

The app prominently directs life-threatening emergencies to India’s 112 service. AI only recommends category and urgency; critical or uncertain cases require human review. External authority automation works when an administrator configures an agency-supported webhook, email, phone number, or internal dashboard route.
