# Synced Habit Tracker - Setup Guide

## Step 1: Create Firebase Project (5 minutes)

1. Go to https://firebase.google.com/
2. Click "Get Started" or "Go to Console"
3. Sign in with Google (free account)
4. Click "Create a project"
5. Name it `habit-tracker` (or anything)
6. Disable Google Analytics (we don't need it)
7. Click "Create project" and wait

## Step 2: Set Up Firestore Database

Once your project is created:

1. In Firebase Console, click **Firestore Database** (left menu)
2. Click **Create Database**
3. Choose **Start in production mode**
4. Select your region (closest to you)
5. Click **Enable**

## Step 3: Enable Anonymous Authentication

1. Click **Authentication** (left menu under "Build")
2. Click **Set up sign-in method**
3. Find **Anonymous** and click it
4. Toggle **Enable** (switch to ON)
5. Click **Save**

## Step 4: Get Your Firebase Config

1. Click the gear icon ⚙️ → **Project Settings**
2. Scroll to **Your apps** section
3. Click the **Web** icon (</> symbol)
4. Register app name (can be blank, just click Register)
5. Copy the entire config object (looks like below)
6. Save it - you'll need it in the next step

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
};
```

## Step 5: Update Firestore Security Rules

1. In Firestore, click the **Rules** tab
2. Replace the entire content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/habits/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

This ensures only the user can access their own data (using anonymous auth).

## Step 6: Run the App

### Option A: Web (npx)

```bash
cd c:\Users\Atharv Raskar\Desktop\Self-improvement app
npx create-react-app . --template cra-template
npm install firebase
```

Then replace `src/App.jsx` with the code provided.

### Option B: Copy the Firebase Config

When you open the app, it will ask for your Firebase config on first visit. Just paste it.

---

**Next Steps**: Open the `HabitTracker-Firebase.jsx` file - all setup instructions are in the code!
