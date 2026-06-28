# LifeSaver AI 🌱

LifeSaver AI is a gamified, AI-powered productivity companion designed to save your deadlines, prevent burnout, and turn your daily tasks into a beautiful digital garden. It transforms the stressful experience of managing heavy workloads into an engaging, rewarding journey.

Built with **React**, **Vite**, **TailwindCSS**, **Firebase**, and **Google Gemini AI**.

## 🌟 Comprehensive Feature Breakdown

### 1. 🏠 Dashboard Page (The Command Center)
- **AI Daily Briefing Modal**: An automated, personalized daily popup that greets you with an estimated workload, your single top priority for the day, and a calculated burnout/deadline risk score based on your pending tasks.
- **AI Priority Engine**: Automatically categorizes your tasks into actionable tabs: **Do Now 🚨**, **Do Today 📅**, and **Schedule Later ⏳**, based on calculated urgency and AI suggestions.
- **Magic Whiteboard (OCR Scan)**: Click the camera icon to upload a photo of a whiteboard or handwritten notes. Gemini AI will instantly extract the tasks, assign them priorities, and add them to your to-do list.
- **Interactive Add Task Modal**: Click "Add custom task" to open a sleek popup where you can specify the task name and explicitly set its priority (Low, Medium, High, Critical).
- **Deadline Risk Meter**: Real-time gauge showing your risk of missing upcoming deadlines, with a direct 1-click jump to the "Save My Deadline" emergency mode.
- **Wellness & Burnout Check**: Evaluates your task load and recent focus sessions to give you a "Stress Level" and Burnout Score, including personalized signs of fatigue and reasons to take a break.
- **Deep Work Quickstart**: A prominent section to instantly jump into the Focus Room and enter flow state.
- **Dynamic Stat Cards**: Live, animated cards tracking Tasks Completed, Focus Time, Current Streak, and Garden Level.
- **Product Tour**: A guided onboarding tour introducing you to all dashboard features.

### 2. ⚡ The Top Navigation & Global Features
- **Global Search (`Cmd/Ctrl + K`)**: A beautifully animated spotlight search modal to instantly find tasks across any category.
- **Important Notifications**: A bell icon that opens a dropdown summarizing your "Critical" and "High" priority incomplete tasks.
- **AI Persona Switcher**: A dropdown menu right in the top bar to instantly switch your AI's coaching tone (Zen Mentor, No-Nonsense Coach, Calm Friend, Strict Manager) and your user profile (Student, Developer, Freelancer, Entrepreneur).
- **Global Ask LifeSaver Floating Button**: A magical FAB (Floating Action Button) available on every page. Click it to ask "What should I do now?"—the AI calculates the exact task you should do next to maximize your success probability.
- **Seed Mock Data Button**: A dedicated button (labeled with Sparkles) that instantly populates your account with rich, realistic mock data for testing purposes and forces an AI cache invalidation for instant testing.

### 3. 🎯 Goals Page
- **AI Goal Roadmaps**: Set a high-level goal (e.g., "Land a Software Engineering Internship") and the AI will auto-generate a structured, step-by-step roadmap with actionable sub-tasks.
- **Progress Tracking**: Visual progress bars mapping out how close you are to completing your overarching objectives.

### 4. 🎧 AI Focus Room (Deep Work)
- **Pomodoro & Deep Work Modes**: Choose your time block and start the timer.
- **Ambient Soundscapes**: Built-in background audio toggles for Lofi Beats, Cozy Rain, and Forest Birds to aid concentration.
- **Distraction Blocker UI**: A clean, immersive interface designed to keep you focused on the single task at hand.
- **Motivational AI Interventions**: The AI displays changing motivational quotes and tips while you work.
- **Session Logging**: Completed sessions automatically log minutes into your stats and grant XP to your garden.

### 5. 🌳 Progress Garden (Gamification)
- **Dynamic Digital Ecosystem**: A virtual garden that grows as you complete tasks and focus sessions.
- **Real-Time Weather & Time**: The garden visually changes based on the actual time of day (morning, afternoon, night) and live weather conditions (sun, rain, snow).
- **Leveling & XP System**: Earn XP for productivity. As you level up, you unlock new types of plants, bushes, and trees.
- **AI Gardener Insights**: Sage the AI Gardener analyzes your recent habits and provides botanical-themed productivity advice (e.g., "Your focus is growing strong roots!").

### 6. 📊 Analytics & AI Weekly Review
- **Comprehensive Statistics**: View total tasks done, focus hours, and goal completion rates.
- **AI-Generated Weekly Review**: A personalized, detailed report cached and dynamically regenerated. It assigns you an **Overall Grade** (e.g., A, B+), highlights your **Biggest Achievement**, identifies your **Most Productive Day**, and provides an actionable **Sage's Advice** paragraph to improve your next week.
- **Graceful Fallbacks**: The UI intelligently handles missing or brand-new data to ensure a smooth, crash-free experience.

### 7. 🚑 Emergency Room (Save My Deadline™)
- **Panic Mode**: For when everything is due tomorrow. Select the specific tasks you are behind on.
- **AI Survival Plan**: Gemini generates a structured, minute-by-minute rescue plan breaking down exactly how to tackle the emergency without burning out.
- **Time Simulator (Crystal Ball)**: Input a scenario (e.g., "What if I take a 2-hour nap?") and the AI will predict the consequences on your deadlines, stress levels, and success probability.

### 8. ⚙️ Settings Modal
- **Focus Timer Customization**: Set custom work, short break, and long break durations, and toggle auto-start options.
- **Danger Zone**: Reset your garden progress back to zero.
- **Theme Preferences**: Switch between Light, Dark, and Parchment themes.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion (for buttery-smooth animations)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend/Auth**: Firebase (Authentication, Firestore Database, Hosting)
- **AI Engine**: Google Gemini API (via `@google/genai`), highly structured JSON schemas for consistent UI integration.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase Project
- Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd ai-saver-2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your keys:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🧠 AI Architecture

LifeSaver AI uses a highly structured prompt engineering system via `geminiService.ts`. It builds a comprehensive `UserContext` by aggregating data from Firestore (Tasks, Goals, Focus Sessions, Garden Stats) and passes this context to Gemini, requesting strictly typed JSON schemas in return. 

Features like the **Daily Briefing** and **Weekly Review** utilize a smart caching layer in Firestore (`ai_cache` collection) to minimize API costs and ensure instant UI load times, while specialized triggers (like the "Seed Data" button) intelligently invalidate the cache when fresh calculations are needed.

## 📄 License
This project is open-source and available under the MIT License.
