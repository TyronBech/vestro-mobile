# Vestro Mobile — Poverty Firewall Client

This is the mobile client for **Vestro**, a financial management application built around the **Poverty Firewall** philosophy. Built with React Native, Expo, and TypeScript, it offers a sleek, secure, and flat-minimalist user experience to help users configure budgets, manage credit card cycles, map cash routing trees, and protect their financial well-being.

---

## Architecture & Design System

### 1. Technology Stack
* **Framework**: React Native with [Expo SDK 55](https://docs.expo.dev/)
* **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
* **Styling**: [NativeWind (Tailwind CSS v4)](https://www.nativewind.dev/)
* **State Management**: [Zustand](https://github.com/pmndrs/zustand)
* **Animation**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
* **Database / Backend Sync**: Axios-based custom API client connecting to `vestro-backend` and Supabase Auth.

### 2. Vestro Design System (VDS) - Flat Minimalism
Vestro enforces a strict flat-minimalist design language.
* **Color Palette**:
  * Background: `#fdfefe`
  * Cards / Dark Elements: `#373737`
  * Action / Accent Red: `#ee4e43`
* **UI Rules**:
  * **Strictly NO glassmorphism**, excessive drop-shadows, or blurred translucency.
  * Flat, clean borders only (`border-gray-100` / `border-borderLight`).
  * Strict layout spacing and dimensions defined in `constants/sizes.ts`.
  * Core component styles (borders, shapes) utilize `rounded-2xl` corner rounding.
* **Interaction & Feedback**:
  * **Haptic Feedback**: Integrates `expo-haptics` to trigger physical vibrations on error occurrences, lock state changes, or major transaction updates.
  * **Validation Shake**: Input errors or authorization failures trigger a full-card horizontal shake animation.

### 3. Money Architecture (The Cents Rule)
To avoid JavaScript floating-point errors, all monetary amounts are managed as pure integers representing cents (e.g. ₱1,500.75 is stored/passed as `150075`).
* **Frontend Rule**: Divide on the way OUT (e.g., `amount / 100` before displaying to the user).
* **Backend Rule**: Multiply on the way IN (stored as cents in PostgreSQL).

---

## Key Features & Functionalities

### 1. Secure Authentication & Enclave Biometrics
* **Secure JWT Login**: Connects to the backend via short-lived JWT access tokens (15-minute expiry).
* **Supabase & Google OAuth**: Standardized Google logins using Supabase Auth, exchanging tokens for Vestro sessions.
* **Device Hardware Biometrics**: Leverages `expo-local-authentication` for FaceID/Fingerprint logins. Private keys are generated and stored in the mobile device's Secure Enclave (`expo-secure-store`), while the corresponding hash is stored in the database.
* **15-Min Inactivity Auto-Lock**: Checks JWT expiration every 5 seconds. If expired or inactive, it displays the full-screen `SessionLockScreen`.
* **Shake-to-Lock (Panic Mode)**: Listens to accelerometer shakes. If shaken, it instantly invalidates the session on the database and locks the client.

### 2. The Poverty Firewall Budgeting
* **Baseline Configuration**: Configure net salary baselines.
* **Baseline Allocation**: Distribute salary automatically according to the 50-30-10-10 allocation rule (Needs, Wants, Savings, Investments).

### 3. Credit Card Cycle Tracker
* **Cycle Tracking**: Visualize statement periods, cutoff days, and payment due dates.
* **Cycle Payments**: Submit mid-cycle partial payments directly to dynamically lower statements.

### 4. Cash Routing Trees (Core Network)
* **Visual Nodes**: Configure financial routers in a parent-child node hierarchy tree (e.g., "Payroll Catch" routing down into specific sub-vaults).
* **Transactional Logs**: Tracks cashflow logs, sweeps, and allocations per routing node.

### 5. Sinking Fund Sweeps
* **Dynamic Sweep**: Pulls leftover wants/sandbox funds out into savings accounts.
* **Logs & Audits**: View historical sweep runs in an easy-to-read list.

### 6. Push Notifications
* **Expo Push Tokens**: Obtains and registers device push tokens to receive server-driven warning triggers on payment due dates and locking states.

---

## Directory Structure

```
vestro-mobile/
├── app/                  # Expo Router Page Stack
│   ├── (tabs)/           # Tab layout container
│   │   ├── _layout.tsx   # Custom Tab Bar navigation
│   │   ├── home.tsx      # Dashboard main overview
│   │   ├── analytics.tsx # Credit Card and Budget analytics
│   │   ├── network.tsx   # Core Network routing tree visualization
│   │   └── profile.tsx   # User profile, biometrics & 2FA toggles
│   ├── _layout.tsx       # Root layout (Auth initialization, Watchdog, Modals)
│   ├── google-auth.tsx   # Google OAuth callback redirection page
│   ├── login.tsx         # Login credentials & 2FA verification forms
│   ├── register.tsx      # User registration form
│   └── forgot-password.tsx# Password reset credentials form
├── assets/               # Static icons, splash images, and SVGs
├── constants/            # Global UI tokens
│   ├── colors.ts         # Unified Vetro colors
│   ├── sizes.ts          # Dimension rules & safe areas
│   └── string.ts         # Centralized text copies and labels
├── src/
│   ├── components/       # Custom components (Card, modals, custom headers, locks)
│   ├── hooks/            # React Hooks (usePushNotifications, etc.)
│   ├── services/         # API Client layer
│   │   ├── api/          # Custom Axios fetch instance & config
│   │   │   ├── client.ts # Fetch core client with JWT token injection
│   │   │   ├── config.ts # API timeouts, URLs and SecureStore configurations
│   │   │   └── endpoints/# Endpoint modules (auth, credit-cards, sweeps, profile)
│   │   └── supabase.ts   # Supabase client credentials initialization
│   ├── store/            # Zustand Global Stores (auth-store, toast-store, ui-store)
│   ├── types/            # TypeScript Interface files
│   └── utils/            # Utilities (Result patterns, File Upload helpers, UUID)
├── tailwind.config.js    # Utility classes mapping
├── package.json          # Mobile client npm package configurations
└── app.json              # Expo application configurations
```
