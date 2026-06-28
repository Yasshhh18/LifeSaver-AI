# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🌱 LifeSaver AI
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### An AI-Powered Productivity Companion That Proactively Helps Users Beat Deadlines Before They Beat Them.

**Hackathon:** Coding Ninjas × Google for Developers — VIBE 2 SHIP

**Developer:** [Your Name]

**Submission Date:** June 28, 2026

**Live URL:** https://lifesaver-ai-f6c8f.web.app

**GitHub:** https://github.com/Yasshhh18/LifeSaver-AI

📸 *[INSERT HERO SCREENSHOT — Landing Page with "Breathe Easy. Never Miss Another Deadline." tagline]*

---

# 📑 Table of Contents

1. Problem Statement Selected
2. Solution Overview
3. Key Features
4. Technologies Used
5. Google Technologies Utilized
6. Google AI Architecture
7. Application Workflow
8. Challenges Faced
9. Future Scope
10. Conclusion

---

# 1. 🎯 Problem Statement Selected

### Problem Statement 1 — The Last-Minute Life Saver

| The Problem | Why It Matters |
|---|---|
| Students miss assignment deadlines | 87% of students report deadline-related stress |
| Professionals ignore passive reminders | Notification fatigue causes 60%+ dismissal rates |
| Existing tools are reactive, not proactive | They tell you WHEN something is due, not HOW to get it done |
| No burnout awareness | Traditional apps push users to work harder, not smarter |

### Why Existing Solutions Fail

❌ **Passive Notifications** — Easy to swipe away, no actionable guidance

❌ **No Intelligence** — Cannot adapt when plans fall behind

❌ **No Wellness Awareness** — Push users toward burnout instead of preventing it

❌ **Static Scheduling** — Cannot dynamically restructure when priorities shift

### How LifeSaver AI Addresses This

✅ **Proactive AI Analysis** — Google Gemini continuously analyzes workload and provides intelligent recommendations

✅ **Adaptive Planning** — AI agents autonomously restructure goals when milestones are missed

✅ **Burnout Prevention** — Real-time wellness monitoring with actionable stress reduction advice

✅ **Emergency Recovery** — Minute-by-minute survival schedules when deadlines pile up

---

# 2. 💡 Solution Overview

LifeSaver AI is not a to-do list. It is an **intelligent productivity companion** that continuously analyzes user data through Google Gemini to provide personalized, context-aware guidance.

### System Workflow

```
👤 User
   ↓
🔐 Firebase Authentication (Google Sign-In)
   ↓
🗄️ Cloud Firestore (Tasks, Goals, Focus Sessions, Garden Stats)
   ↓
🧠 Google Gemini API (Context Assembly + AI Analysis)
   ↓
📊 AI Analysis Engine (Priority, Burnout, Roadmaps, Recovery)
   ↓
🏠 Personalized Dashboard
   ↓
✨ Proactive Productivity Assistance
```

📸 *[INSERT SCREENSHOT — Full Dashboard with AI Daily Briefing, Priority Tabs, and Stat Cards visible]*

> **💡 Key Differentiator:** Unlike traditional productivity apps that only store and remind, LifeSaver AI's `buildUserContext()` function aggregates ALL user data (tasks, goals, focus history, garden progress, settings) into a comprehensive context object that is passed to Google Gemini for every AI interaction. This means every recommendation is deeply personalized.

---

# 3. ✨ Key Features

Every feature below follows the same format: **Purpose → How Gemini Powers It → Benefits → Screenshots → Google Tech Used**

---

## 3.1 🌅 AI Daily Briefing

| | |
|---|---|
| **Purpose** | Greet the user with a personalized overview of their day the moment they log in |
| **How Gemini Powers It** | Gemini analyzes all pending Firestore tasks, calculates estimated workload hours, identifies the single highest-impact task, and generates a deadline risk score (0–100) |
| **Benefits** | Users immediately know what to focus on without manually scanning their task list |

📸 *[INSERT SCREENSHOT — AI Daily Briefing bar showing "LIVE" badge, workload estimate, recommended next task, and deadline risk score]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Generates personalized briefing content |
| 🗄️ Cloud Firestore — Stores and retrieves user's tasks, goals, and focus history |
| ⚡ Firebase Auth — Identifies the authenticated user for personalized context |

---

## 3.2 🚨 AI Priority Engine

| | |
|---|---|
| **Purpose** | Automatically categorize messy task lists into actionable urgency groups |
| **How Gemini Powers It** | Gemini evaluates each task's deadline proximity, estimated effort, and dependencies to sort them into three tabs: **Do Now 🚨**, **Do Today 📅**, and **Schedule Later ⏳** |
| **Benefits** | Eliminates "analysis paralysis" — users know exactly what to work on first |

📥 *[INSERT SCREENSHOT — Raw unsorted task list or "Add custom task" view]*

📤 *[INSERT SCREENSHOT — Tasks sorted into "Do Now 🚨" Tab]*
*Caption: Urgent and critical tasks prioritized by Gemini requiring immediate attention.*

📤 *[INSERT SCREENSHOT — Tasks sorted into "Do Today 📅" Tab]*
*Caption: Daily deliverables organized by Gemini to be completed within the next 24 hours.*

📤 *[INSERT SCREENSHOT — Tasks sorted into "Schedule Later ⏳" Tab]*
*Caption: Lower priority items automatically scheduled for subsequent days to reduce overwhelm.*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Intelligent priority classification |
| 🗄️ Cloud Firestore — Real-time task storage and retrieval |

---

## 3.3 🤔 "What Should I Do Now?" (Ask LifeSaver)

| | |
|---|---|
| **Purpose** | A global floating button available on every page that tells the user the single best task to work on right now |
| **How Gemini Powers It** | Gemini evaluates all incomplete tasks, their deadlines, current time of day, user's recent focus sessions, and energy patterns to recommend the optimal next action |
| **Benefits** | One-click decision making when the user feels overwhelmed |

📥 *[INSERT SCREENSHOT — The green floating "Ask LifeSaver" button in the bottom-right corner]*

📤 *[INSERT SCREENSHOT — The popup showing Sage's specific task recommendation]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Context-aware next-action recommendation |
| 🗄️ Cloud Firestore — Full task and goal context retrieval |

---

## 3.4 🤖 Sage AI Companion

| | |
|---|---|
| **Purpose** | A conversational AI coach that provides context-aware productivity guidance |
| **How Gemini Powers It** | Gemini receives the full user context (tasks, goals, progress, settings) and responds as a personalized productivity coach. The system prompt dynamically adapts based on the selected AI personality |
| **Benefits** | Users get advice that is specifically tailored to their current workload, not generic tips |

**Key Capabilities:**
- ✅ Context-aware responses based on real Firestore data
- ✅ Personalized coaching aligned to user's profile (Student, Developer, Freelancer, Entrepreneur)
- ✅ Multiple switchable AI personalities

📸 *[INSERT SCREENSHOT — Sage AI Companion chat interface with a personalized response]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Conversational AI with dynamic system prompts |
| 🗄️ Cloud Firestore — User context assembly |

---

## 3.5 🎭 AI Personality Modes

| | |
|---|---|
| **Purpose** | Let users customize how their AI coach communicates |
| **How Gemini Powers It** | The system prompt passed to Gemini is dynamically modified based on the selected persona. Each persona has a distinct communication style, tone, and vocabulary |
| **Benefits** | Users can choose the coaching style that motivates them most |

| Persona | Style | Example Response |
|---|---|---|
| 🧘 **Zen Mentor** | Calm, philosophical, nature metaphors | *"Take a breath. Your next step is clear..."* |
| 💪 **No-Nonsense Coach** | Direct, results-focused, commanding | *"Stop overthinking. Open the IDE. Code now."* |
| 😊 **Calm Friend** | Supportive, encouraging, empathetic | *"Hey, you've got this! Let's tackle it together."* |
| 📋 **Strict Manager** | Professional, deadline-focused, structured | *"You have 3 hours until deadline. Here's the plan."* |

📸 *[INSERT SCREENSHOT — AI Persona dropdown in the top navigation bar showing the four options]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Dynamic prompt engineering per persona |

---

## 3.6 📸 Magic Whiteboard Scanner (OCR)

| | |
|---|---|
| **Purpose** | Convert physical handwritten notes, whiteboards, or sticky notes into structured digital tasks |
| **How Gemini Powers It** | Gemini's multimodal capabilities analyze the uploaded image, extract all readable text, identify actionable items, assign priorities (low/medium/high/critical), estimate duration, and return structured JSON |
| **Benefits** | Bridges the physical-digital gap — no manual data entry needed |

📥 *[INSERT SCREENSHOT — Clicking "Magic Scan" button on the dashboard]*

📤 *[INSERT SCREENSHOT — Newly created tasks with "AI-Scanned" tags appearing in the task list]*

> **💡 Technical Detail:** The image is converted to base64, sent to Gemini via the `@google/genai` SDK with `inlineData`, and the response is parsed as a typed JSON array of `ExtractedTask` objects.

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Multimodal image-to-text extraction + task structuring |
| 🗄️ Cloud Firestore — Automatic storage of extracted tasks |

---

## 3.7 🎯 AI Goal Roadmap Planner

| | |
|---|---|
| **Purpose** | Break down high-level goals into structured, actionable 4-week roadmaps |
| **How Gemini Powers It** | Gemini receives the goal title, category, target date, and user profile type, then generates a JSON roadmap with 4 themed weeks, each containing 3–4 specific sub-tasks. It also calculates an initial success probability (0–100%) |
| **Benefits** | Users no longer stare at a vague goal — they get a clear, week-by-week action plan |

📥 *[INSERT SCREENSHOT — Goal creation form with title and category]*

📤 *[INSERT SCREENSHOT — Generated 4-week roadmap timeline with progress bars and sub-tasks]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Structured roadmap generation with probability scoring |
| 🗄️ Cloud Firestore — Persistent roadmap and milestone storage |

---

## 3.8 🧠 Adaptive Roadmap Agent

| | |
|---|---|
| **Purpose** | Autonomously restructure a goal's roadmap when the user falls behind schedule |
| **How Gemini Powers It** | Gemini receives the original weekly plan, the list of completed milestones, and missed milestones. It then **reasons** about the delay, redistributes missed work into future weeks, updates the success probability, and provides recovery suggestions |
| **Benefits** | The plan is never static — it evolves with the user's real progress |

📥 *[INSERT SCREENSHOT — Goal page showing "behind schedule" banner with "Adapt Roadmap" button]*

📤 *[INSERT SCREENSHOT — Adapted Roadmap panel showing updated weeks with colored status badges (completed/behind/adjusted) and new success probability]*

> **💡 Agentic Behavior:** This is a true autonomous agent. It doesn't just answer a question — it evaluates state, reasons about causes, makes decisions, and restructures the future plan without human intervention.

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Autonomous reasoning and plan restructuring |
| 🗄️ Cloud Firestore — Milestone progress tracking |

---

## 3.9 🚑 Save My Deadline™ Emergency Room

| | |
|---|---|
| **Purpose** | Generate a structured survival plan when deadlines are critically close |
| **How Gemini Powers It** | Gemini analyzes the task name, deadline proximity, and estimated effort to generate a step-by-step minute-by-minute rescue schedule with built-in break intervals to prevent burnout |
| **Benefits** | Turns panic into a structured action plan |

📥 *[INSERT SCREENSHOT — Emergency page with task name and deadline input fields]*

📤 *[INSERT SCREENSHOT — Generated rescue plan showing time-blocked schedule]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Recovery plan generation with time-blocking |

---

## 3.10 🔮 AI Time Simulator (Crystal Ball)

| | |
|---|---|
| **Purpose** | Predict the consequences of hypothetical decisions on deadlines and stress |
| **How Gemini Powers It** | Gemini receives the user's current task state and a "what if" scenario (e.g., *"What if I sleep for 4 hours?"*), then simulates the timeline impact, predicting changes in success probability, stress levels, and deadline risk |
| **Benefits** | Users can make informed scheduling decisions instead of guessing |

📥 *[INSERT SCREENSHOT — Time Simulator input field with a typed scenario]*

📤 *[INSERT SCREENSHOT — Simulation results showing projected impact on deadlines and stress]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Scenario simulation and predictive analysis |
| 🗄️ Cloud Firestore — Current task state retrieval |

---

## 3.11 🩺 Burnout Detection & Wellness Check

| | |
|---|---|
| **Purpose** | Monitor user fatigue and prevent burnout before it happens |
| **How Gemini Powers It** | Gemini evaluates the user's task volume, recent focus session hours, deadline density, and completion rates to calculate a burnout score, identify warning signs, and recommend specific wellness actions |
| **Benefits** | The app cares about user health, not just productivity metrics |

📸 *[INSERT SCREENSHOT — Burnout/Wellness indicator on the dashboard showing stress level and recommendations]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Burnout score calculation and wellness recommendations |
| 🗄️ Cloud Firestore — Historical focus session and task data |

---

## 3.12 📊 AI Weekly Review

| | |
|---|---|
| **Purpose** | Generate a comprehensive performance report grading the user's productivity |
| **How Gemini Powers It** | Gemini aggregates a full week of Firestore data (tasks completed, focus hours, goals progressed, streaks) and generates a structured review with an overall grade (A, B+, C, etc.), biggest achievement, most productive day, and actionable advice |
| **Benefits** | Users receive professional-grade performance insights automatically |

📸 *[INSERT SCREENSHOT — Weekly Review section on Analytics page showing grade, achievements, and Sage's advice]*

> **💡 Smart Caching:** Weekly reviews are cached in Firestore's `ai_cache` collection with a TTL to minimize API costs. Cache is intelligently invalidated when new data arrives.

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Performance analysis and grading |
| 🗄️ Cloud Firestore — Data aggregation + review caching |

---

## 3.13 🎧 AI Focus Room

| | |
|---|---|
| **Purpose** | A distraction-free deep work environment with AI motivation |
| **How Gemini Powers It** | During active Pomodoro sessions, Gemini generates contextual motivational quotes and focus tips that rotate on-screen |
| **Benefits** | Maintains concentration and provides encouragement during difficult work blocks |

**Built-in Features:**
- ⏱️ Pomodoro Timer (customizable work/break intervals)
- 🎵 Ambient Soundscapes (Lofi Beats, Cozy Rain, Forest Birds)
- 🧘 Distraction Blocker UI
- ⚡ Automatic XP logging to the Progress Garden

📸 *[INSERT SCREENSHOT — Focus Room with active timer, ambient sound toggles, and AI motivational text]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — Dynamic motivational content generation |
| 🗄️ Cloud Firestore — Focus session logging and XP tracking |

---

## 3.14 🌳 Progress Garden (Gamification)

| | |
|---|---|
| **Purpose** | Transform productivity into a visually rewarding game |
| **How Gemini Powers It** | Sage the AI Gardener analyzes garden stats, XP progress, and recent activity to provide botanical-themed productivity insights |
| **Benefits** | Makes productivity genuinely fun — users are motivated by watching their garden grow |

**Gamification Mechanics:**

| Action | XP Reward |
|---|---|
| Complete a Task | +20 XP |
| Complete a Focus Session | +50 XP |
| Complete a Goal | +200 XP |
| Water the Tree | +500 XP |

**Dynamic Environment:**
- 🌤️ Sky changes based on real-time time of day (morning, afternoon, night)
- 🌧️ Weather effects match actual local conditions (sun, rain, snow)
- 🦋 Garden residents (butterflies, birds, rabbits, deer, fox, owl) appear as you level up

📸 *[INSERT SCREENSHOT — Progress Garden showing the tree, plants, animals, weather effects, and XP/Level cards]*

| Google Technologies Used |
|---|
| 🧠 Google Gemini API — AI Gardener insights |
| 🗄️ Cloud Firestore — Garden state, XP, and level persistence |

---

# 4. 🛠️ Technologies Used

| Category | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 | Component-based UI |
| **Language** | TypeScript | Type-safe development |
| **Build Tool** | Vite | Fast development server and bundler |
| **Styling** | Tailwind CSS | Utility-first responsive design |
| **Animations** | Framer Motion | Smooth micro-interactions |
| **Charts** | Recharts | Productivity analytics visualization |
| **Icons** | Lucide React | Consistent icon system |
| **AI Engine** | Google Gemini API | Core intelligence for all AI features |
| **Authentication** | Firebase Auth | Secure user sign-in |
| **Database** | Cloud Firestore | Real-time NoSQL data storage |
| **Hosting** | Firebase Hosting | Production deployment with SSL |

---

# 5. 🔥 Google Technologies Utilized

> This section demonstrates how LifeSaver AI is built **entirely** on the Google ecosystem.

---

## 5.1 🧠 Google Gemini API

Google Gemini is the **primary intelligence engine** powering every AI feature in LifeSaver AI.

| Feature | Gemini Capability Used |
|---|---|
| AI Daily Briefing | Text generation with structured JSON output |
| AI Priority Engine | Task classification and urgency scoring |
| Magic Whiteboard Scanner | **Multimodal image analysis** (vision + text extraction) |
| Ask LifeSaver | Context-aware next-action recommendation |
| Sage AI Companion | Conversational AI with dynamic system prompts |
| Goal Roadmap Planner | Structured 4-week plan generation |
| Adaptive Roadmap Agent | Autonomous reasoning and plan restructuring |
| Save My Deadline™ | Recovery schedule generation |
| Time Simulator | Hypothetical scenario simulation |
| Burnout Detection | Wellness score calculation |
| Weekly Review | Performance grading and insight generation |
| AI Focus Room | Motivational content generation |
| AI Gardener | Botanical-themed productivity insights |

> **💡 Implementation Detail:** All Gemini calls go through a centralized `AIManager.ts` that handles provider health monitoring, response caching, automatic retry logic, and JSON sanitization. For JSON-specific tasks, Gemini is prioritized first due to its native `responseMimeType: 'application/json'` support.

📸 *[INSERT SCREENSHOT — Google AI Studio or Gemini API console]*

---

## 5.2 🔐 Firebase Authentication

- Secure user authentication with Google Sign-In
- Personalized sessions tied to `user.uid`
- Every Firestore query is scoped to the authenticated user

📸 *[INSERT SCREENSHOT — Login/Sign-up page with Google Sign-In button]*

---

## 5.3 🗄️ Cloud Firestore

LifeSaver AI stores ALL user data in Cloud Firestore:

| Collection | Data Stored |
|---|---|
| `tasks` | User tasks with priorities, deadlines, and status |
| `goals` | High-level goals with progress tracking |
| `focus_sessions` | Pomodoro session logs with duration and XP |
| `user_settings` | Profile type, AI persona, timer preferences |
| `ai_cache` | Cached AI responses with TTL for cost optimization |

📸 *[INSERT SCREENSHOT — Firebase Console showing Firestore collections]*

---

## 5.4 🌐 Firebase Hosting

- Production deployment with automatic SSL provisioning
- Global CDN for fast content delivery
- Deployed via `firebase deploy --only hosting`

**Live URL:** https://lifesaver-ai-f6c8f.web.app

📸 *[INSERT SCREENSHOT — Firebase Console showing Hosting dashboard with deployment history and download stats]*

---

## 5.5 🧪 Google AI Studio

- Used for iterating on prompt engineering during development
- Tested structured JSON output schemas
- Optimized temperature and token settings for each feature
- Validated multimodal image inputs for the Magic Whiteboard Scanner

---

# 6. 🏗️ Google AI Architecture

```
┌─────────────────────────────────────────────────┐
│                  👤 USER                         │
└──────────────────────┬──────────────────────────┘
                       ↓
┌──────────────────────┴──────────────────────────┐
│           🔐 Firebase Authentication             │
│              (Google Sign-In)                    │
└──────────────────────┬──────────────────────────┘
                       ↓
┌──────────────────────┴──────────────────────────┐
│              ⚛️ React Frontend                   │
│     (TypeScript + TailwindCSS + Framer Motion)   │
└───────┬──────────────────────────────┬──────────┘
        ↓                              ↓
┌───────┴───────┐              ┌───────┴───────┐
│  🗄️ Cloud     │              │  🧠 Google    │
│  Firestore    │◄────────────►│  Gemini API   │
│               │   Context    │               │
│ • Tasks       │   Assembly   │ • Text Gen    │
│ • Goals       │              │ • JSON Mode   │
│ • Sessions    │              │ • Vision/OCR  │
│ • Settings    │              │ • Reasoning   │
│ • AI Cache    │              │               │
└───────────────┘              └───────────────┘
                       ↓
┌──────────────────────┴──────────────────────────┐
│            🌐 Firebase Hosting                   │
│         (SSL + CDN + Global Delivery)            │
│    https://lifesaver-ai-f6c8f.web.app            │
└─────────────────────────────────────────────────┘
```

---

# 7. 🔄 Application Workflow

```
1. 👤 User logs in via Firebase Authentication
                    ↓
2. 🏠 Dashboard loads with AI Daily Briefing
                    ↓
3. ➕ User creates tasks (manual or Magic Scan)
                    ↓
4. 🗄️ Tasks stored in Cloud Firestore
                    ↓
5. 🧠 Gemini analyzes tasks → AI Priority Engine sorts them
                    ↓
6. 🎯 User sets Goals → Gemini generates 4-week Roadmaps
                    ↓
7. 🎧 User enters Focus Room → Completes Pomodoro sessions
                    ↓
8. 🌳 XP earned → Garden grows → Level up
                    ↓
9. 🚑 Deadline risk detected → Emergency Room activated
                    ↓
10. 📊 End of week → Gemini generates Weekly Review
```

---

# 8. ⚡ Challenges Faced

| Challenge | How We Solved It |
|---|---|
| **Prompt Engineering** | Iterated extensively in Google AI Studio to craft structured JSON prompts that produce consistent, parseable outputs |
| **JSON Response Reliability** | Built a sanitization layer in `AIManager.ts` that strips markdown wrappers, removes trailing commas, and retries on parse failures |
| **Context-Aware AI** | Developed a `buildUserContext()` function that aggregates ALL Firestore data into a single context string for every Gemini call |
| **Real-time Firestore Sync** | Used event-driven architecture with `window.dispatchEvent` to trigger UI updates when Firestore data changes |
| **Burnout Detection Accuracy** | Combined multiple signals (task volume, focus hours, deadline density, completion rate) for reliable stress scoring |
| **API Cost Optimization** | Implemented an `ai_cache` collection in Firestore with TTL-based invalidation to minimize redundant Gemini calls |
| **Responsive UI** | Used Tailwind CSS with custom breakpoints and Framer Motion for smooth cross-device experiences |
| **Animation Performance** | Replaced heavy `AnimatePresence` height animations with simple conditionals where they caused rendering issues |

---

# 9. 🚀 Future Scope

| Feature | Description |
|---|---|
| 📅 **Google Calendar Integration** | Sync tasks and deadlines directly with Google Calendar |
| ⌚ **Wear OS Support** | Push notifications and quick actions on smartwatches |
| 🔮 **AI Habit Prediction** | Predict productivity patterns and suggest optimal work times |
| 👥 **Collaborative Productivity** | Shared goals and team accountability features |
| 🤖 **Smarter AI Agents** | Multi-step autonomous agents that can create, schedule, and complete tasks |
| 📱 **Cross-Device Sync** | Seamless experience across mobile, tablet, and desktop |
| 📡 **Offline Mode** | Service worker caching for offline task management |
| 🎤 **Voice Commands** | Full voice-enabled task creation and AI interaction |

---

# 10. 🏆 Conclusion

LifeSaver AI is more than a task manager.

It is an **intelligent, AI-powered productivity companion** built entirely on the Google ecosystem that:

✅ **Proactively analyzes** workload through Google Gemini to provide personalized daily briefings

✅ **Autonomously adapts** goal roadmaps when users fall behind schedule

✅ **Prevents burnout** by monitoring stress levels and recommending breaks

✅ **Bridges the physical-digital gap** by scanning handwritten notes into structured tasks using Gemini's multimodal vision

✅ **Makes productivity fun** through a gamified, weather-reactive digital garden

✅ **Handles emergencies** with minute-by-minute survival schedules and "what if" time simulation

Every feature in LifeSaver AI is powered by **Google Gemini API**, stored in **Cloud Firestore**, secured by **Firebase Authentication**, and deployed on **Firebase Hosting**.

> **LifeSaver AI doesn't just remind you about deadlines. It actively helps you beat them.**

---

*Built with ❤️ for the Coding Ninjas × Google for Developers: VIBE 2 SHIP Hackathon*
