# Habit Tracker App

A beautiful, production-ready React habit tracking application with local data persistence, weekly analytics, and data export.

## Features

✅ **Daily Habit Checklist** - 7 customizable habits with visual feedback  
✅ **Weekly Overview** - See completion rates for each day (color-coded)  
✅ **Progress Tracking** - Total completed, perfect days, weekly streaks, completion %  
✅ **Data Persistence** - All data stored in browser localStorage  
✅ **Light/Dark Mode** - Toggle between themes with CSS variables  
✅ **Export Data** - Download weekly summaries as .txt files  
✅ **Reset Week** - Clear data with confirmation dialog  
✅ **Responsive Design** - Works on mobile, tablet, and desktop  
✅ **Motivation Quotes** - Daily inspiration at the top of the page  

## Quick Start

### Option 1: Open HTML File (Easiest)
1. Open `index.html` in your browser
2. Start tracking habits immediately
3. Data persists across browser sessions

### Option 2: React Project Setup
If you have a React project already:

1. Copy `HabitTracker.jsx` to your `src` folder
2. Import in your `App.jsx`:
```jsx
import HabitTracker from './HabitTracker';

function App() {
  return <HabitTracker />;
}

export default App;
```

### Option 3: Create React App (From Scratch)
```bash
npx create-react-app habit-tracker
cd habit-tracker
cp HabitTracker.jsx src/
```

Then update `src/App.jsx`:
```jsx
import HabitTracker from './HabitTracker';

function App() {
  return <HabitTracker />;
}

export default App;
```

Run the app:
```bash
npm start
```

## Your 7 Habits

1. **Protein at every meal** (Nutrition) - Breakfast + lunch + evening + night
2. **Phone-free hour** (Phone) - 1 hour without phone touching
3. **One conversation** (Communication) - 10 min talk with parent (real, no phone)
4. **Hair routine** (Health) - Oil massage or leave-in conditioner
5. **No random snacking** (Nutrition) - Only planned meals, no biscuits/coffee
6. **Eye contact practice** (Communication) - 5-7 sec windows with someone
7. **Bed by 11 PM** (Sleep) - Lights off, phone away

## How to Use

### Checking Off Habits
- Click on any habit card to mark it complete
- Checked habits get a strikethrough and highlight with their category color
- Visual confirmation helps maintain motivation

### Viewing Your Week
- See the **Weekly Overview** section showing all 7 days
- Color coding:
  - 🟢 **Green** = 7/7 habits completed (perfect day!)
  - 🟡 **Yellow** = 5-6/7 completed
  - ⚪ **Gray** = Less than 5 completed

- Click any day to jump to that date

### Tracking Progress
- **Completed This Week** - Total habits done across all 7 days
- **Perfect Days** - Count of days with 7/7 completion
- **Best Streak** - Longest consecutive streak of 5+ habit days
- **Completion Rate** - Percentage for the week

### Exporting Data
Click **📥 Export Data** to download a `.txt` file with:
- Weekly summary (dates, totals)
- Daily breakdown
- Which habits were completed each day

### Resetting Week
Click **🔄 Reset Week** to clear all data for the week
- Confirmation dialog prevents accidental deletion
- Once confirmed, all data is cleared (cannot be undone)

### Dark Mode
Click the 🌙 button in the top-right to toggle dark mode
- Persists in localStorage
- Clean, readable interface in both modes

## Customization

### Edit Habit List
Open `HabitTracker.jsx` and modify the `HABITS` array:

```jsx
const HABITS = [
  {
    id: 1,
    title: 'Your habit here',
    description: 'Description of the habit',
    category: 'Category',
    color: '#10b981', // Hex color
  },
  // ... more habits
];
```

### Add More Habits
Simply add new objects to the `HABITS` array. The app scales to any number of habits.

### Change Colors
Each habit has a `color` property (hex code). Update it to change the category color.

### Edit Motivation Quotes
Update the `MOTIVATION_QUOTES` array to your own inspiring messages:

```jsx
const MOTIVATION_QUOTES = [
  'Your custom quote here',
  'Another quote',
  // ...
];
```

## Data Storage

All data is stored in **browser localStorage** under the key `habitTrackerData`:
- Format: `{ "YYYY-MM-DD": { habitId: true/false, ... }, ... }`
- Persists across browser sessions
- Works offline
- ~5MB limit per domain (plenty for years of data)

## Browser Compatibility

✅ Chrome/Edge (latest)  
✅ Firefox (latest)  
✅ Safari (latest)  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Tips for Success

1. **Start Small** - Keep checking even if you miss habits. Streaks are motivating.
2. **Check Daily** - Set a reminder to check habits at the same time each day
3. **Export Weekly** - Download your data every week for backup
4. **Customize Later** - Add new habits or change descriptions as you grow
5. **Mobile Access** - Open on your phone for easy checking throughout the day

## File Structure

```
Self-improvement app/
├── index.html              # Standalone version (open in browser)
├── HabitTracker.jsx        # Main React component
├── App.jsx                 # App wrapper
└── README.md               # This file
```

## Technical Stack

- **React 18** - UI framework
- **Hooks** - State management (useState, useEffect)
- **localStorage** - Data persistence
- **CSS-in-JS** - Inline styling (no external CSS needed)
- **CSS Grid** - Responsive layout

## No Dependencies

This app has **zero external dependencies** (except React). Everything is built with vanilla React and CSS.

## Advanced Customizations (Future Ideas)

- Add habit streak counters
- Notes/journal field for each day
- Import/export CSV format
- 4-week trend dashboard
- Goal setting (e.g., "target 5/7 this week")
- Share weekly stats
- Recurring habit templates

## Troubleshooting

**Data not persisting?**
- Check if localStorage is enabled in your browser
- Try clearing cache and reloading
- Check browser DevTools (F12) → Application → Storage → localStorage

**Page looks broken?**
- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Try refreshing the page
- Clear browser cache

**Habits not showing?**
- Check that `HABITS` array is properly formatted in the code
- Ensure no syntax errors in the component

## License

Free to use and modify for personal use.

---

**Made with ❤️ for building better habits**
