# 📱 Synced Habit Tracker - Phone & Web

A real-time synced habit tracker that works across your phone, tablet, and desktop. All changes sync instantly using Firebase.

## Features

✅ **Real-time Sync** - Changes sync instantly across all devices  
✅ **Phone + Web** - Works on any device with a browser  
✅ **Install as App** - Add to home screen on mobile (iOS/Android)  
✅ **7 Daily Habits** - Customizable with categories and colors  
✅ **Weekly Analytics** - Track completion, streaks, and progress  
✅ **Light/Dark Mode** - Eye-friendly in any lighting  
✅ **Offline Access** - Works without internet (syncs when back online)  
✅ **No Login Required** - Sync code based access  
✅ **Export Data** - Download weekly reports as .txt  

## Quick Start (5 minutes)

### Step 1: Set Up Firebase (Free)

1. Go to **https://firebase.google.com/**
2. Click **Get Started** → **Create a project**
3. Name it `habit-tracker`, then click **Create**
4. Wait ~30 seconds for your project to be created
5. In the console, go to **Build** → **Firestore Database**
6. Click **Create Database**
   - Choose **Start in production mode**
   - Select your region (closest to you)
   - Click **Enable**

### Step 2: Enable Anonymous Auth

1. Go to **Build** → **Authentication**
2. Click **Set up sign-in method**
3. Find **Anonymous** → Click it → **Enable** → **Save**

### Step 3: Get Your Firebase Config

1. Click the **⚙️ Settings** icon (top left)
2. Go to **Project settings**
3. Scroll to **Your apps**
4. Click the **Web** icon `</>`
5. Click **Register app**
6. Copy the entire config object that appears (starts with `const firebaseConfig = {`)
7. Save it somewhere safe - you'll need it next

### Step 4: Run the App

Choose one option:

#### Option A: Quick Setup (npm)

```bash
# Navigate to your project folder
cd "c:\Users\Atharv Raskar\Desktop\Self-improvement app"

# Install dependencies
npm install

# Start the app
npm start
```

The app will open at `http://localhost:3000`

#### Option B: From Scratch with Create React App

```bash
npx create-react-app habit-tracker
cd habit-tracker
npm install firebase
```

Then copy `HabitTrackerFirebase.jsx` to `src/HabitTrackerFirebase.jsx` and update `src/App.jsx`:

```jsx
import HabitTrackerFirebase from './HabitTrackerFirebase';

function App() {
  return <HabitTrackerFirebase />;
}

export default App;
```

Then run: `npm start`

### Step 5: Paste Firebase Config

When the app opens, you'll see a setup screen:

1. Click the text area labeled "Paste your Firebase config here"
2. Paste the Firebase config you copied
3. Click **✅ Connect to Firebase**

That's it! Your app is now synced. 🎉

## Using the App

### On Phone

1. Open the link in your phone browser
2. Tap **Share** → **Add to Home Screen**
3. It now works like a native app
4. Check habits anytime, anywhere

### On Web

1. Go to `http://localhost:3000` (or your deployed URL)
2. Same config needed on first visit

### Habit Tracking

- **Check habits**: Click any habit card to mark it done
- **Visual feedback**: Completed habits get a green border + strikethrough
- **Weekly view**: See all 7 days with completion rates
  - 🟢 Green = 7/7 (perfect day!)
  - 🟡 Yellow = 5-6/7
  - ⚪ Gray = <5 habits

### Progress Stats

- **Completed This Week**: Total habits across all 7 days
- **Perfect Days**: Days with 7/7 completion
- **Best Streak**: Longest consecutive good days (5+ habits)
- **Completion Rate**: Weekly percentage

### Export Data

Click **📥 Export** to download a `.txt` file with your weekly summary.

### Reset Week

Click **🔄 Reset** to clear all data for the week (asks for confirmation).

## Your 7 Habits

1. **Protein at every meal** 🥗 - All meals
2. **Phone-free hour** 📵 - 1 uninterrupted hour
3. **One conversation** 💬 - Real talk with parent
4. **Hair routine** 💇 - Oil or conditioner
5. **No random snacking** 🚫 - Only planned meals
6. **Eye contact practice** 👀 - 5-7 second windows
7. **Bed by 11 PM** 🛏️ - Lights off, phone away

## Customizing Habits

Open `HabitTrackerFirebase.jsx` and find the `HABITS` array:

```jsx
const HABITS = [
  {
    id: 1,
    title: 'Your habit here',
    description: 'Description',
    category: 'Category',
    color: '#10b981',
  },
  // Add more...
];
```

Edit titles, descriptions, categories, or colors. Then save and refresh the app.

## Multi-Device Sync

Once you're logged in on one device, opening the app on another device with the same Firebase config will automatically sync all your data.

### Syncing Across Devices

**Same Google Account:**
- The app uses Firebase anonymous auth
- Each device gets a unique ID
- BUT - to sync between devices, you need to manually configure them with the same Firebase project

**Better Option - Share URL:**
1. Deploy the app to a URL (see "Deployment" section)
2. Open that URL on all your devices
3. Paste the same Firebase config on each device
4. All changes sync in real-time!

## Deployment (Optional)

Deploy to the web so you can access from anywhere:

### Deploy to Vercel (Easiest)

1. Push your code to GitHub
2. Go to **https://vercel.com**
3. Click **Import Project** → **Import Git Repository**
4. Select your repo
5. Click **Deploy**
6. Your app is live! Share the URL

### Deploy to Netlify

1. Push to GitHub
2. Go to **https://netlify.com**
3. Click **New site from Git**
4. Connect GitHub
5. Select your repo
6. Build command: `npm run build`
7. Publish directory: `build`
8. Click **Deploy**

### Deploy to GitHub Pages

```bash
# Add to package.json:
# "homepage": "https://yourusername.github.io/habit-tracker"

npm run build
npx gh-pages -d build
```

Then access at: `https://yourusername.github.io/habit-tracker`

## Troubleshooting

### "Firebase config not found"

You need to paste your Firebase config on first visit. Get it from **Project Settings** → **Your apps** → Web app config.

### Changes not syncing

1. Check your internet connection
2. Look for the sync status badge (top right) - should say "✓ Synced"
3. If it says "⚠ Error", check your Firebase config is correct

### App won't open

Make sure you've:
1. Created a Firebase project
2. Enabled Firestore Database
3. Enabled Anonymous Authentication
4. Pasted the correct config

### Lost data

Your data is stored in Firebase, not your phone. As long as your Firebase project exists, your data is safe.

## File Structure

```
Self-improvement app/
├── src/
│   ├── App.jsx                     # Main app wrapper
│   ├── HabitTrackerFirebase.jsx    # Main component (Firebase synced)
│   ├── index.jsx                   # React entry point
│   └── index.css                   # Global styles
├── public/
│   ├── index.html                  # HTML template
│   └── manifest.json               # PWA manifest
├── package.json                    # Dependencies
├── FIREBASE_SETUP.md               # Setup guide
└── README.md                        # This file
```

## Technical Stack

- **React 18** - UI framework
- **Firebase** - Backend + real-time sync
- **Firestore** - Cloud database
- **PWA** - Install as app on mobile

## Tips for Success

1. **Set a daily reminder** - Check habits at the same time each day
2. **Start small** - Even if you miss one, keep checking
3. **Export weekly** - Backup your data
4. **Share your progress** - Tell someone about your streak
5. **On mobile** - Add to home screen for quick access

## Privacy & Security

- Your data is stored in your own Firebase project
- Only you can access your data (anonymous auth)
- Data never leaves your devices
- Firebase uses encryption in transit

## Questions?

- Firebase Docs: https://firebase.google.com/docs
- React Docs: https://react.dev
- PWA Guide: https://web.dev/progressive-web-apps/

---

**Built to help you build better habits, one day at a time.** 🎯
