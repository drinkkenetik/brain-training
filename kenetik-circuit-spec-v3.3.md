
KENETIK CIRCUIT
Platform Specification v3.3
Brain Score + Training + Gamification + Rewards
April 2026
KENETIK


v3.3 Change Summary (from v3.2)
New: 5.4.1 (First Screen), 5.5 (Post-Session Budget), 5.6 (Zero-Decision Flow), 8.5 (Notification Tone), 11.8 (Return After Absence)
Revised: 6.2 (Level Titles), 6.3 (Recovery Session), 7.2 (Micro-Reward), 9.2 (Log Moved Post-Session), 14 (Session Length Target)
Brand voice pass: "Brain Points" renamed to "Fuel Points" throughout. Level titles revised ("Fully Lit" to "Full Clarity," "Neural Networker" to "Steady Hand"). First screen CTA and subhead rewritten. "Speed Demon" badge renamed "Quick Read." Notification and whisper copy tightened.
This is the complete, standalone spec. No references to prior versions.


# 1. Executive Summary

This specification defines Kenetik Circuit, a unified brain training and retention platform that combines Peter’s branded Brain Score tests (Stroop and DSST), Brandon’s adaptive training program (Flanker, N-back, Task Switching, Neural Priming), 10 new engagement-focused cognitive games, and a rewards system powered by the existing Shopify tech stack. The goal is to create a daily habit engine that brings customers back to drinkkenetik.com every day to train, compete, earn real rewards, and make Kenetik part of their 1 to 3 servings per day routine.
Kenetik Circuit integrates with six existing Shopify apps: LoyaltyLion (points and rewards), Klaviyo (email/SMS automation), Shopify Flow (automation triggers), ACF Metafields (customer data), Recharge (subscription upsells), and Gorgias (support routing). No new Shopify apps are required.
Architecture: Static HTML frontend hosted on GitHub Pages or Shopify, lightweight Supabase backend for training data, leaderboards, and game state. LoyaltyLion handles all points accounting and reward fulfillment. Klaviyo handles all lifecycle marketing. Kenetik Circuit simply fires events to both systems.

# 2. What Exists Today


## 2.1 Brain Score Tests (Peter’s, brain-score-preview repo)

Two branded cognitive assessments hosted on GitHub Pages with Kenetik’s visual identity (museo-slab headings, Avenir body, coral #E84B63 accents, 680px container).
Key strengths: Polished brand design, returning user detection (welcome-back banner), Brain Score CSS system. Key gaps: Stroop lacks Klaviyo integration, no device latency normalization, no training program, no gamification.

## 2.2 Brandon’s Brain Training App (brain-training repo)

A comprehensive single-file HTML application (122K characters) with registration, baseline testing, adaptive training across 4 exercise types, Neural Priming protocol, and a Kenetik consumption protocol.
Key strengths: Adaptive difficulty engine (adjusts based on 65%/85% accuracy thresholds), device latency normalization, comprehensive Neural Priming with scenario presets. Key gaps: No Kenetik brand styling, no gamification layer, no backend persistence, no leaderboards.

## 2.3 Current Gap Analysis

Five core exercises exist but research shows this is insufficient for daily retention. Leading brain training platforms (Lumosity, Peak, Elevate) offer 40 to 60 games. The minimum viable game library for a daily habit appears to be 15 to 20 exercises, enough that users can rotate 3 to 4 per session without repeating the same exercise for nearly a week. Additionally, the existing exercises are all clinical-grade cognitive assessments. They measure real skills but feel like tests, not games. The platform needs exercises that are inherently fun while still training legitimate cognitive abilities.


# 3. Visual Design System

Kenetik Circuit must look and feel like a native extension of drinkkenetik.com, not a separate app. Every screen, exercise, and results view follows the Kenetik visual identity. This section defines the design parameters for the development team.

## 3.1 Typography

Note: The existing Brain Score tests (Peter’s repo) use Museo Slab for headings and Avenir for body text. These must be updated to Futura during the Phase 1 merge to align with the current brand standard.


| Role | Typeface | Weight | Notes |
| --- | --- | --- | --- |
| Headlines / Hero Text | Futura | Bold | All section headers, score displays, level-up announcements, Brain Score number |
| Subheadings | Futura | Medium | Exercise names, category labels, leaderboard headers |
| Body Text / UI | Futura | Book / Light | Instructions, descriptions, button labels, streak counts |
| Web Fallback Stack | Century Gothic, Arial, system-ui | Match weight | When Futura is unavailable |
| Monospaced (Scores/Timers) | Futura or system monospace | Bold | Countdown timers, reaction time displays, point tallies |


## 3.2 Color Palette

The platform uses Kenetik’s official brand palette. The UI should feel warm, clean, and premium, not clinical or dark.
Color distribution rule: 60% white or warm off-white backgrounds, 30% Blackberry navy for premium sections and headers, 10% accent colors for interactive elements and data visualization. Never use dark backgrounds as the primary UI surface.


| Color | Hex | Usage in Platform |
| --- | --- | --- |
| Black | #000000 | Primary text, high-contrast UI elements. NOT dominant backgrounds. |
| White | #FFFFFF | Page backgrounds, card backgrounds, breathing space |
| Clean (Soft Blue) | #A3C3D9 | Secondary backgrounds, inactive states, light accents |
| Blackberry (Navy) | #13286D | Premium sections, modal overlays, header bars, footer |
| Strawberry (Red) | #E03D1A | Primary CTAs, streak warnings, personal bests, alerts |
| Blueberry (Blue) | #269DD2 | Processing speed domain, trust indicators, info states |
| Berry (Pink) | #D01483 | Memory domain accent, badge highlights, celebration moments |
| Peach (Orange) | #F06925 | Attention domain accent, streak fire icons, energy states |
| Pineapple (Gold) | #FBB11B | Points earned, level-up, rewards, achievement unlocks |
| Warm Off-White | #F5F0E8 | Exercise area backgrounds, results cards, soft panels |


## 3.3 Layout and Spacing

Container width: 680px max (matching existing Brain Score tests) centered on desktop, full-width with 16px padding on mobile. All exercise areas use a consistent 680px container. Spacing follows an 8px grid: 8, 16, 24, 32, 48, 64px increments. Card components use 16px internal padding, 8px border-radius, and subtle shadow (0 2px 8px rgba(0,0,0,0.08)) for depth without heaviness.

## 3.4 Exercise UI Pattern

Every exercise screen follows the same structure for consistency and muscle memory: Header bar (exercise name + timer/progress + domain icon) in Blackberry navy, Exercise area (white or warm off-white background, centered content, clean negative space), Input zone (large tap targets for mobile, 48px minimum, Strawberry red for primary action), Results overlay (score, points earned, Brain Score change, animated with subtle easing). Transitions between exercises use a 300ms fade, not hard cuts. Loading states show the Kenetik chevron pattern as a subtle animated element.

## 3.5 Data Visualization

Brain Score history charts, domain radar charts, and streak visualizations use the brand accent colors mapped to cognitive domains: Blueberry for processing speed, Berry for memory, Peach for attention, Pineapple for executive function, Clean blue for cognitive flexibility, Strawberry for spatial reasoning. Charts use warm off-white backgrounds, thin 1px grid lines in #E0E0E0, and Futura labels. No 3D effects, no gradients on chart fills (use solid colors at 80% opacity). The Brain Score number itself should be large (48px+), bold Futura, displayed prominently on the dashboard.

## 3.6 Shareable Brain Score Card Design

The auto-generated share card follows Kenetik’s branded composite style: warm off-white background with a single diagonal chevron stripe (matching the can’s chevron pattern) in one accent color at 60 to 80% opacity. Brain Score number in large bold Futura. Domain scores in a clean horizontal bar chart. Current level, streak count, and up to 3 badge icons. Kenetik logo and tagline (“Clarity and Focus on Demand”) at the bottom. Two formats: Instagram Stories (1080x1920) and Twitter/X (1200x675). The card should feel like a premium, designed artifact that people are proud to share, not a generic app screenshot.

## 3.7 Mobile-First Responsive Rules

The majority of training sessions will happen on mobile. Design mobile-first, then scale up. Exercise tap targets are 48px minimum. Score displays and timers are visible without scrolling. The daily session flow is a single scrollable view with no navigation required between exercises. Streak and points are always visible in a persistent top bar. On desktop, the 680px container centers with generous warm negative space on either side.

## 3.8 Animation and Motion

Motion should feel smooth and intentional, never frenetic. Use 200 to 400ms ease-out for state transitions. Points earned animate upward (floating +25 in Pineapple gold). Level-up uses a brief full-screen overlay with the chevron pattern expanding outward. Streak milestones get a subtle confetti burst (brand accent colors only, not rainbow). Avoid: shaking, bouncing, flashing, or any motion that creates urgency or anxiety. Kenetik Circuit should feel like calm momentum, not a slot machine.

## 3.9 Visual “Never” List

- Dark mode as default (the brand is light-filled and warm)
- Neon colors, glow effects, or energy drink aesthetics
- Aggressive gamification visuals (explosions, lightning bolts, extreme animations)
- Cool or blue-toned color grading on any photography used
- Generic stock imagery anywhere in the UI
- Cluttered layouts or screens with more than one focal point
- Serif fonts or decorative typefaces
- Flat, lifeless white backgrounds without warmth (use #F5F0E8 off-white instead of pure #FFFFFF for large surfaces)
- Any visual element that makes Kenetik Circuit feel like a medical device or clinical tool


# 4. Expanded Game Library (15 Total)

Kenetik Circuit combines 5 existing exercises with 10 new games designed for engagement and retention. Each new game trains a scientifically validated cognitive skill while feeling like entertainment, not assessment. All games feature adaptive difficulty (5 levels), 60 to 90 second sessions, and Brain Score integration.

## 4.1 Existing Exercises (Carried Forward)


| # | Exercise | Cognitive Domain | Source | Format |
| --- | --- | --- | --- | --- |
| 1 | Stroop Color Word Test | Executive function, inhibition | Peter (branded) | 20 trials, name the ink color |
| 2 | DSST Digit Symbol | Processing speed | Peter (branded) | 90 sec, match symbols to digits |
| 3 | Flanker Task | Response inhibition | Brandon (adaptive) | Identify center arrow among distractors |
| 4 | N-back | Working memory | Brandon (adaptive) | Match current item to N items ago |
| 5 | Task Switching | Cognitive flexibility | Brandon (adaptive) | Alternate between shape and color rules |


## 4.2 New Games (To Build)

Approval required: Brandon Dyksterhouse should validate the cognitive science accuracy of each new game description, confirm the claimed cognitive domains are correct, and approve the adaptive difficulty progression model (5 levels per game with 65%/85% accuracy thresholds) before development begins.
Developer Notes (Approved by Brandon Dyksterhouse, April 3 2026):
Cognitive science validated. All 10 game descriptions are scientifically accurate and cognitive domain assignments are correct. The adaptive difficulty model (65%/85% thresholds, 5 levels) is approved. Three implementation notes for the dev team:
- Go/No-Go vs. Flanker — do not treat as interchangeable in daily rotation. Flanker measures interference control (filtering conflicting information), while Go/No-Go measures action inhibition (withholding a prepotent response). Both fall under “Executive Function / Inhibition” but they train different sub-skills. The exercise selection algorithm should not treat one as a substitute for the other.
- Adaptive threshold window — use a rolling window of 10–20 trials before adjusting difficulty. Do not recalculate the 65%/85% accuracy thresholds on every single trial. A window that is too small causes volatile difficulty swings; a window that is too large feels unresponsive.
- Asymmetric difficulty adjustment — only lower difficulty between sessions, not mid-session. Dropping difficulty mid-game feels deflating and signals failure to the user. Raising difficulty mid-session is fine and feels rewarding. Implement downward adjustments only at session boundaries to protect engagement.


| # | Game | Cognitive Domain | Mechanic | Why It Works |
| --- | --- | --- | --- | --- |
| 6 | Speed Match | Processing speed + working memory | Does the current card match the previous one? Tap yes/no as fast as possible. | Lumosity’s most popular game. Simple, fast, addictive. |
| 7 | Pattern Matrix | Pattern recognition | Identify the missing piece in a visual pattern grid (like Raven’s Progressive Matrices). | Strong far-transfer. Feels like a puzzle, not a test. |
| 8 | Mental Rotation | Spatial reasoning | Rotate 3D shapes to determine if two objects are the same or mirror images. | One of the strongest transfer effects in cognitive science. |
| 9 | Dual Focus | Divided attention | Track a moving object while answering rapid-fire questions about its properties. | Maps to Kenetik’s performance-under-pressure positioning. |
| 10 | Word Sprint | Language processing + executive function | Generate words from a set of letters before time runs out. Bonus for longer words. | Activates language, memory, and executive function simultaneously. |
| 11 | Number Sense | Numerical cognition + estimation | Quick estimation and arithmetic under time pressure. | Trains processing speed through a different modality. |
| 12 | Visual Search | Selective attention | Find the target shape among increasingly complex fields of distractors. Timed. | Like a fast-paced abstract Where’s Waldo. Naturally competitive. |
| 13 | Sequence Memory | Short-term memory | Remember and reproduce increasingly long sequences of colors, positions, or sounds. | Classic Simon-style mechanic. Universally understood. |
| 14 | Go/No-Go | Impulse control + sustained attention | Respond to target stimuli, withhold response to non-targets. Speed increases with accuracy. | Faster-paced and more intuitive than Flanker. |
| 15 | Trail Connect | Processing speed + cognitive flexibility | Connect dots in alternating numerical/alphabetical order (1-A-2-B-3-C...) as fast as possible. | Well-validated neuropsychological test that naturally feels game-like. |


## 4.3 Cognitive Domain Coverage Map


| Cognitive Domain | Games | Count |
| --- | --- | --- |
| Processing Speed | DSST, Speed Match, Number Sense, Trail Connect | 4 |
| Working Memory | N-back, Speed Match, Sequence Memory | 3 |
| Executive Function / Inhibition | Stroop, Flanker, Go/No-Go | 3 |
| Cognitive Flexibility | Task Switching, Trail Connect, Dual Focus | 3 |
| Attention | Visual Search, Go/No-Go, Dual Focus | 3 |
| Spatial Reasoning | Mental Rotation, Pattern Matrix | 2 |
| Language | Word Sprint | 1 |
| Numerical Cognition | Number Sense | 1 |


# 5. Daily Session Engine

Research shows 10 to 15 minute daily sessions produce the best retention and cognitive outcomes. Kenetik Circuit serves a personalized daily workout of 3 to 4 exercises, algorithmically selected for variety, cognitive coverage, and engagement.

## 5.1 Session Structure


| Component | Duration | Purpose |
| --- | --- | --- |
| Warm-up (optional) | 60 seconds | Quick reaction game to activate focus (Speed Match or Go/No-Go) |
| Exercise 1 | 60 to 90 seconds | Primary training exercise |
| Exercise 2 | 60 to 90 seconds | Different cognitive domain than Exercise 1 |
| Exercise 3 | 60 to 90 seconds | Third domain or challenge exercise |
| Results + Rewards | 30 seconds | Consolidated results screen (see Section 5.5) |


## 5.2 Exercise Selection Algorithm

The daily rotation algorithm selects exercises based on three factors weighted equally: recency (deprioritize exercises done in the last 2 days), weakness (prioritize domains where the user scores lowest relative to their overall Brain Score), and enjoyment (track which exercises have the highest completion rates per user and include at least one favorite). This ensures variety, targeted improvement, and fun in every session.
Weekly Challenge exercises override the algorithm. When a Weekly Challenge is active (e.g., “Beat your Stroop PR”), that exercise is guaranteed to appear in at least one session during the challenge window.

## 5.3 Brain Score Composite Formula

Brain Score is Kenetik Circuit’s central metric. It appears on the dashboard, leaderboards, shareable cards, and in every Klaviyo event. This section defines how it is calculated so that two developers independently computing a Brain Score from the same data always get the same result.
5.3.1 Domain Scores
Kenetik Circuit tracks six cognitive domains. Each domain’s score is derived from the user’s best score on any exercise in that domain within a rolling 7-day window. If a user has not completed any exercise in a domain within the last 7 days, the domain uses the most recent score available, subject to the decay rule below.


| Domain | Contributing Exercises | Weight |
| --- | --- | --- |
| Processing Speed | DSST, Speed Match, Number Sense, Trail Connect | 1.0 |
| Working Memory | N-back, Speed Match, Sequence Memory | 1.0 |
| Executive Function / Inhibition | Stroop, Flanker, Go/No-Go | 1.0 |
| Cognitive Flexibility | Task Switching, Trail Connect, Dual Focus | 1.0 |
| Attention | Visual Search, Go/No-Go, Dual Focus | 1.0 |
| Spatial / Language / Numerical | Mental Rotation, Pattern Matrix, Word Sprint, Number Sense | 1.0 |


All domains are weighted equally (1.0) at launch. Brandon Dyksterhouse may recommend differential weighting after analyzing baseline data from the first 1,000 users. Any weight change requires Devon’s approval and a spec version bump.
5.3.2 Score Normalization
Exercises use different scoring mechanics. Accuracy-based exercises (N-back, Pattern Matrix, Sequence Memory) produce a 0–100 accuracy percentage directly. Reaction-time-based exercises (Stroop, DSST, Flanker, Go/No-Go, Speed Match, Visual Search, Trail Connect) produce a raw millisecond value that must be mapped to 0–100 using a sigmoid normalization curve.
Sigmoid normalization formula: score = 100 / (1 + e^(k * (rt - midpoint))), where rt is the user’s normalized reaction time average, midpoint is the population median for that exercise at that difficulty level, and k is a steepness constant. Starting values: k = 0.02, midpoint = per-exercise defaults seeded from Brandon’s existing baseline data. Both parameters are configurable in engine.js and should be refined using aggregate data after 500+ sessions per exercise.
Mixed exercises (those scored on both accuracy and speed, such as Word Sprint and Number Sense) use a weighted blend: 60% accuracy component + 40% speed component, each independently normalized to 0–100 before blending.
5.3.3 Composite Calculation
Brain Score = mean of all six domain scores, rounded to the nearest integer. Range: 0–100. The score cannot exceed 100 and cannot fall below 0.
If a user has completed exercises in fewer than three domains (common during the first few days), Brain Score is calculated from available domains only, with a visual indicator on the dashboard: “Based on [N] of 6 domains — keep training to unlock your full Brain Score.”
5.3.4 Score Decay
If a domain has not been tested in more than 14 days, its score decays by 3% per week (compounding). Decay is calculated at session start, not continuously. This creates a gentle pull to return without punishing short breaks. A single session in the decayed domain resets the decay clock and uses the new score.
Decay is visible in the UI: decayed domain scores show in a muted color with a small downward arrow icon and the label “Rusty — train to refresh.” The Brain Score Decay Klaviyo event (defined in Section 8.1) fires when composite Brain Score drops 10%+ over a rolling 7-day window.
5.3.5 Implementation Notes
The scores table in Supabase stores raw, unnormalized values. Brain Score is computed client-side in engine.js using the normalization and composite logic above. The computed Brain Score is written back to the users table (brain_score column) and to ACF Metafields via the existing Shopify Flow integration. Leaderboards rank by the stored brain_score value, not by recomputing at query time.


## 5.4 First-Week Onramp (Days 1–7)

The exercise selection algorithm (Section 5.2) governs daily sessions from Day 8 onward. During the first 7 days, sessions are curated to maximize variety, build habit momentum, and showcase Kenetik Circuit’s range before the algorithm takes over.


| NEW IN v3.3 — Arrival experience defined |
| --- |

5.4.1 First Screen (New User Arrival)
The single most important screen in Kenetik Circuit. A new visitor — whether from a referral link, a social share, an ad, or direct traffic — should go from arrival to first exercise in under 15 seconds. No registration, no tutorial, no explanation of the point system.
The first screen contains three elements:
- Headline: “Train your brain in under 10 minutes.”
- Subhead: “See how your brain performs across 6 cognitive skills.”
- One button: “Start Training” (Strawberry red, 48px+ tap target)

Nothing else. No signup form, no email field, no explanation of points or rewards, no Kenetik branding pitch. The user is anonymous at this point (Section 11.6). Their only job is to tap one button and start the Stroop test.
For visitors arriving via referral link or social share who may have no context on Kenetik: a single line below the button in muted text: “Powered by Kenetik. Metabolic brain fuel.” This is a brand whisper, not a pitch. The product sells itself through the experience, not the landing screen.
What this replaces: Brandon’s existing app collects 10 health goal attributes and demographic data before the first exercise. All registration data collection is deferred to after the baseline assessment. Health goal attributes are collected optionally during the first-week onramp (Day 3 or later), not as a gate.

5.4.2 Curated Session Schedule


| Day | Session Content | Design Intent |
| --- | --- | --- |
| Day 1 (Baseline) | Stroop + DSST + N-back. Results screen shows initial Brain Score with 3-of-6 domains note. | Establish baseline. Give the user a number to care about. |
| Day 2 | Flanker + Speed Match (unlocked early) + Task Switching. Post-session: “You just trained 3 new cognitive skills.” | Show variety immediately. Prove this isn’t just two tests. |
| Day 3 | User’s best-scoring exercise from Days 1–2 + Visual Search (unlocked early) + one new domain exercise. | Include a favorite for engagement. Show progress trajectory. |
| Day 4 | Algorithm selects 2 exercises, 1 curated (Pattern Matrix or Sequence Memory). Brief explainer: “Your daily workout is now personalized.” | Transition to algorithmic selection. Cover untested domains. |
| Day 5 | Algorithm selects all 3 exercises. Post-session: “All 6 cognitive domains tested. Your full Brain Score is live.” | Full Brain Score unlocked. First major milestone. |
| Day 6 | Algorithm session. Post-session: streak callout + preview of Day 7 weekly recap. | Build anticipation for the weekly milestone. |
| Day 7 | Algorithm session + Weekly Recap: Brain Score trend, strongest/weakest domains, total points, streak celebration. | First retention milestone. Social sharing prompt. |


5.4.3 Early Game Unlocking During Onramp
The level system (Section 6.2) gates game access behind point thresholds. During the first-week onramp, Speed Match and Visual Search are temporarily available regardless of level, because the curated schedule needs them on Days 2 and 3. Once the user reaches Level 2 (500 points, typically by Day 3–4), the standard unlock rules take over.
5.4.4 Klaviyo Alignment
The onboarding email flow (Section 8.2) aligns with the in-app onramp. Day 0: Welcome + how it works. Day 1: “Your first Brain Score is [X]. Here’s what it means.” Day 3: Tips for higher scores. Day 5: “Your full Brain Score is live.” Day 7: Week 1 Recap email with embedded Brain Score trend chart.


| NEW IN v3.3 — Post-session screen budget |
| --- |


## 5.5 Post-Session Experience

The post-session experience is budgeted at 30 seconds maximum. Every element that appears after the final exercise is designed into a single, consolidated results screen — not a sequence of overlays, interstitials, or separate pages.
5.5.1 The Results Screen (One Screen, One View)
After the final exercise fades, the user sees a single results screen with four zones, all visible without scrolling on mobile:
- Score zone (top): Brain Score (large, 48px+ Futura bold), change indicator (+3 or -1 from last session), and domain breakdown as a compact radar or bar chart. If a personal best was achieved, the score pulses once in Pineapple gold.
- Session summary (middle): Three exercise tiles showing name, score, and difficulty level. Points earned for this session displayed as a single total (e.g., “+175 Fuel Points”), not animated per-exercise.
- Progress zone (lower): Streak count (with fire icon if 7+), and a progress bar toward the next reward tier showing points remaining. This replaces the separate reward-available notification — the progress bar is always visible and communicates proximity without a popup.
- Single action prompt (bottom): At most ONE of the following, selected by priority hierarchy: (1) Consumption log, if opted in and not yet logged today. (2) Restock prompt, if estimated days remaining < 5. (3) Sharing prompt, if a significant milestone was hit (personal best, streak milestone, level up). (4) Nothing. If none of these conditions are met, the bottom zone shows a simple “See you tomorrow” with the next session’s date.

The single-action-prompt rule is absolute: the results screen never shows more than one ask. No stacking a sharing prompt on top of a restock prompt on top of a referral nudge. One ask or zero.
5.5.2 Celebration Moments (Inline, Not Interstitial)
Level-ups, badge unlocks, and streak milestones are displayed inline on the results screen, not as separate full-screen overlays. Implementation: when a celebration event fires, the results screen adds a celebration banner between the score zone and the session summary. The banner shows the achievement (e.g., “Level 3: Sharp — Pattern Matrix and Sequence Memory unlocked”) with a brief chevron animation (300ms, not blocking). The user does not have to tap “Continue” or dismiss anything. The banner is part of the results screen, not on top of it.
Exception: the Day 7 Weekly Recap (Section 5.4.2) is the one post-session experience that expands beyond the standard results screen, because it contains a 7-day trend chart and a sharing prompt. This is acceptable because it occurs once in the user’s first week and is the primary retention milestone.


| NEW IN v3.3 — Zero-decision daily flow |
| --- |


## 5.6 Default Daily Flow (Zero Decisions)

From Day 8 onward, the daily session is fully automatic. The busy professional’s experience:
- Open the app. Dashboard loads instantly (service worker cached). Shows: Brain Score, streak count, today’s queued exercises (preview, not selectable), and a single “Start” button.
- Tap Start. First exercise begins immediately. No warm-up by default after Day 7 (see below). No consumption log before the session.
- Complete 3 exercises. Transitions between exercises are automatic (300ms fade). No decision points between exercises.
- Results screen appears. 30 seconds. One action prompt or none.
- Done. User closes the app or taps “See you tomorrow.”

Total time from open to done: 5–8 minutes. No decisions except “Start.”
5.6.1 Warm-up Handling
The warm-up (60-second Speed Match or Go/No-Go) is on by default during the first-week onramp and off by default from Day 8 onward. Users can toggle it in settings. When off, the session starts directly with Exercise 1. The warm-up is not a decision point — it’s a setting, toggled once, not asked every session.
5.6.2 Dashboard Composition
The dashboard is designed for a 3-second glance. Three primary elements, all above the fold on mobile:
- Brain Score (center, dominant): Large number (48px+ Futura bold), change indicator from last session, partial-domain note if applicable.
- Streak (left of Brain Score): Day count with fire icon. Muted if no active streak. No guilt language if streak is broken — just the number.
- Next reward (below Brain Score): Progress bar showing points toward next reward tier. Label shows the reward name (e.g., “340 pts to Free Can”). This replaces any separate reward notification.

Secondary elements (below the fold, scrollable): domain breakdown chart, recent session history, weekly challenge status (if active), leaderboard rank preview.
Today’s exercises are shown as three compact tiles below the Start button: exercise name and domain icon only. The user sees what’s coming but cannot change it. This is preview without decision. Advanced users at Level 6+ (“Custom daily workout builder” unlock) can tap a tile to swap an exercise. For everyone else, the tiles are informational only.


# 6. Gamification Engine


## 6.1 Fuel Points (XP System)

Fuel Points are the universal currency. They are earned through training activities and tracked in LoyaltyLion (not a custom system). Kenetik Circuit fires activity events to LoyaltyLion’s Admin API, which handles all points math, tier management, and redemption.


| Activity | Points | LoyaltyLion Rule Name |
| --- | --- | --- |
| Complete daily session (3+ exercises) | 100 | brain_daily_session |
| Complete a single exercise | 25 | brain_exercise_complete |
| Beat personal best on any exercise | 50 bonus | brain_personal_best |
| Complete baseline Brain Score assessment | 200 | brain_baseline_complete |
| 7-day streak | 150 bonus | brain_streak_7 |
| 30-day streak | 500 bonus | brain_streak_30 |
| Level up | 100 per level | brain_level_up |
| Weekly challenge completed | 200 | brain_weekly_challenge |
| Refer a friend who completes baseline | 300 | brain_referral_complete |
| Share Brain Score card to social | 50 | brain_share |


## 6.2 Levels and Titles

Game unlocking at levels 2 through 5 serves dual purposes: it prevents overwhelming new users with too many choices, and it gives them something new to look forward to every few days of training. By level 5, all 15 exercises are available and the daily rotation algorithm has a full library to draw from.


| REVISED IN v3.3 — Level titles rewritten to reflect user aspiration |
| --- |


| Level | Title | Points Required | Unlock |
| --- | --- | --- | --- |
| 1 | First Sip | 0 | Access to 5 core exercises |
| 2 | Morning Clarity | 500 | Speed Match + Visual Search unlocked |
| 3 | Deep Worker | 1,500 | Pattern Matrix + Sequence Memory unlocked |
| 4 | Flow State | 3,000 | Mental Rotation + Word Sprint unlocked |
| 5 | Full Clarity | 5,000 | All 15 exercises unlocked |
| 6 | Cognitive Athlete | 8,000 | Custom daily workout builder |
| 7 | Protocol Pro | 12,000 | Exclusive weekly challenges |
| 8 | Steady Hand | 18,000 | Friend challenge creation |
| 9 | Mind Architect | 25,000 | Beta access to new exercises |
| 10 | Kenetik Legend | 35,000 | Exclusive merch drop eligibility |


Title design rationale: titles reflect the user’s aspiration and daily experience, not a generic ladder. “First Sip” connects to the product. “Morning Clarity” and “Deep Worker” describe what the busy professional is using Kenetik for. “Flow State” and “Full Clarity” are states the user is chasing. “Cognitive Athlete” and above reflect earned identity.

## 6.3 Streak System

Streaks are the single most powerful retention mechanic in brain training apps. The system uses positive momentum (pride in a growing streak) combined with forgiveness mechanics (streak freezes) to maintain engagement without punishing real life.
- Active streak: Complete at least one daily session to maintain. Resets at midnight user’s local time.
- Streak freeze: Earn 1 freeze per 7-day streak (max 3 stored). Automatically used if a day is missed.

| REVISED IN v3.3 — Recovery session shortened |
| --- |

- Recovery window: If streak breaks (no freeze available), user has 24 hours to do a normal-length recovery session (3 exercises, same as any daily session) to restore the streak. The recovery session is not longer or harder than a normal session. Rationale: punishing a user who missed a day by making their next session longer guarantees they skip it again.
- Streak milestones: Fire LoyaltyLion events at 7, 14, 30, 60, 90, and 365 days. Klaviyo sends celebration emails with embedded Brain Score progress.


## 6.4 Weekly Challenges

Fresh challenges every Monday to maintain novelty. Examples: Beat your Stroop PR, Complete 5 sessions this week, Score 90+ on any exercise, Try 3 exercises you haven’t done this month, Achieve a 100-point improvement on your weakest domain. Challenges award 200 Fuel Points on completion and appear in the leaderboard.

## 6.5 Leaderboards

Stored in Supabase. Four views: Global (all-time top Brain Scores), Weekly (resets Monday, most points earned this week), Friends (users you’ve invited or connected with), and Age Group (optional demographic brackets for fair comparison). Users can opt out of public leaderboards while still seeing their own rank.

## 6.6 Badges and Achievements

Collectible achievements that unlock based on training milestones. Examples: First Score (complete baseline), Streak Starter (7 days), Brain Athlete (complete all 15 exercise types), Quick Read (sub-300ms average on Go/No-Go), Memory Palace (reach N-back level 5), Kenetik Ritual (log 3 servings in a single day for 7 consecutive days). Badges display on the user’s profile and shareable Brain Score card.


# 7. Rewards System (Powered by LoyaltyLion)

Fuel Points convert to real product discounts and exclusive merchandise through the existing LoyaltyLion integration. No custom rewards engine needed.

## 7.1 LoyaltyLion Integration Architecture

Authentication: Bearer token via Program API Key (scopes: read_customers, write_customers). Rate limit: 20 requests/second. The platform calls POST /v2/activities after each qualifying action, passing the customer’s Shopify ID, email, and the rule name. LoyaltyLion matches the rule to a configured custom activity and awards points automatically.

## 7.2 Reward Tiers


| REVISED IN v3.3 — Added 1,000-point micro-reward for early gratification |
| --- |


| Points Cost | Reward | LoyaltyLion Reward Type | Fulfillment |
| --- | --- | --- | --- |
| 1,000 | Free shipping on next order | Free Shipping Voucher | Auto-generated Shopify discount code |
| 2,500 | 10% off next order | Cart Discount Voucher | Auto-generated Shopify discount code |
| 5,000 | Free single can (any flavor) | Free Product | Shopify draft order or discount code |
| 7,500 | 15% off next order | Cart Discount Voucher | Auto-generated Shopify discount code |
| 10,000 | Free 3-pack (any flavor) | Free Product | Shopify draft order or discount code |
| 15,000 | 20% off subscription upgrade | Active Subscription Discount Voucher | Recharge discount via LoyaltyLion |
| 25,000 | Free 12-pack | Free Product | Shopify draft order |
| 50,000 | Limited edition Brain Score merch | Custom Reward | Manual fulfillment, exclusive drops |


The 1,000-point threshold is reachable in approximately 6 sessions (roughly one week of daily use). This ensures the user experiences a tangible reward during the critical first-week retention window, before the habit is formed. Approval required: Katie Spaller must approve all reward tiers, point thresholds, and discount mechanics before configuration in LoyaltyLion.

## 7.3 Webhooks and Shopify Flow

LoyaltyLion webhooks push events when customers earn points, redeem rewards, or change tiers. These events feed into Shopify Flow for automation: auto-tag customers by loyalty tier in Shopify admin, trigger Klaviyo flows for tier-up celebrations, update ACF Metafields with Brain Score and training data for storefront personalization, and trigger Recharge upsell offers when training engagement is high but subscription tier is low.


# 8. Marketing and Retention Integration


## 8.1 Klaviyo Event Map


| Event Name | Trigger | Key Properties |
| --- | --- | --- |
| Brain Score Baseline Complete | First assessment finished | score, percentile, exercises_available |
| Brain Training Session Complete | Daily session done (3+ exercises) | exercises, scores, points_earned, streak_count |
| Brain Score Improved | New personal best on any exercise | exercise, old_score, new_score, improvement_pct |
| Brain Level Up | Accumulated enough points for next level | new_level, title, new_exercises_unlocked |
| Brain Streak Milestone | Hit 7, 14, 30, 60, 90, or 365 days | streak_days, total_sessions, lifetime_points |
| Brain Streak At Risk | No session by 6pm user’s local time | current_streak, freezes_available |
| Brain Streak Broken | Missed a day with no freeze | lost_streak, recovery_available_until |
| Brain Reward Redeemed | Points spent on a reward | reward_name, points_spent, discount_code |
| Brain Weekly Challenge Complete | Challenge objective met | challenge_name, performance, points_earned |
| Brain Referral Complete | Referred friend completes baseline | referrer_id, friend_id, bonus_points |
| Brain Training Inactive | No session in 3+ days | last_session_date, streak_status, days_inactive |
| Brain Score Decay | Brain Score drops 10%+ over 7-day window | current_score, previous_score, decline_pct, weakest_domain |
| Brain Kenetik Consumption Log | User logs daily Kenetik intake | servings, time_of_day, paired_with_training, protocol_week, adherence_pct, subscription_upsell_eligible |


## 8.2 Automated Flows


| Flow | Trigger Event | Sequence |
| --- | --- | --- |
| Welcome + Onboarding | Baseline Complete | Day 0: Welcome + how it works. Day 1: Your first Brain Score is [X]. Day 3: Tips for higher scores. Day 5: Your full Brain Score is live. Day 7: Week 1 Recap. |
| Streak Celebration | Streak Milestone | Immediate: Congrats + badge unlock + points earned. Show progress visualization. |
| Streak Save | Streak At Risk | 6pm: Reminder with current streak count and value framing. 9pm: Last chance + streak freeze option. |
| Win-back | Training Inactive (3+ days) | Day 3: Welcome back framing + quick session prompt. Day 7: Challenge to return. Day 14: Discount incentive. |
| Level Up | Level Up | Immediate: New title + exercises unlocked + reward tier progress. |
| Reward Available | Points threshold reached | Notify that a new reward is redeemable. Show what they can get. |
| Reward Redeemed | Reward Redeemed | Deliver discount code + next reward tier preview. |
| Weekly Challenge | Monday morning | This week’s challenge + leaderboard preview + streak status. |
| Subscription Upsell | High engagement + low subscription | After 14+ day streak: Subscription saves money at your consumption level. |
| Brain Score Decay | Brain Score Decay (10%+ drop) | Day 1: Welcome back framing + quick session prompt. Day 3: Targeted exercise for weakest domain. Day 7: Challenge with bonus points. |
| Referral Nudge | After first level up | Share your Brain Score + earn 300 points per friend who joins. |


## 8.3 The Daily Habit Loop (Hook Model)

Trigger: Morning push notification or email. Streak At Risk notification at 6pm if no session logged.
Action: Open Kenetik Circuit, complete 3 exercises in under 8 minutes. Frictionless: no login required if returning within 30 days (magic link auth via Supabase). No pre-session decisions.
Variable Reward: Brain Score changes (up or down creates curiosity), points earned, streak extended, leaderboard position change, progress toward next reward tier, possible badge unlock, Weekly Challenge progress.
Investment: The user’s streak, level, Brain Score history, and reward progress are all investments that increase switching cost. The longer they train, the more they have to lose by stopping.

## 8.4 Notification Frequency Capping

Multiple Kenetik Circuit triggers can overlap and spam users in a single day. All Kenetik Circuit communications must respect the following frequency caps.


| Channel | Daily Max | Rule |
| --- | --- | --- |
| Push notification | 1 per day | Morning training nudge OR 6pm streak warning, never both. Streak warning takes priority if streak is 7+ days. |
| Email (Kenetik Circuit) | 1 per day | Klaviyo flow suppression: if a Kenetik Circuit email has already been sent today, suppress all other Kenetik Circuit flow triggers. |
| SMS | 1 per day | Reserved for high-value moments only: streak milestones (30+), reward available, streak broken (if 14+ day streak lost). |
| Combined (all channels) | 2 per day | No user receives more than 2 total Kenetik Circuit touches per day across all channels. Non-Circuit flows excluded. |


| NEW IN v3.3 — Notification tone guidelines |
| --- |


## 8.5 Notification Tone Guidelines

Frequency capping controls how often we talk to the user. Tone guidelines control how it feels. Kenetik Circuit’s notifications must respect the busy professional’s time and intelligence. Two principles:
- Lead with value, not loss. Every notification should tell the user what they’ve built, not what they’re about to lose. “Your processing speed is up 14% this week” beats “Day 23 streak — keep it alive.” The former celebrates investment. The latter creates obligation.
- Never create guilt. A missed day is a missed day, not a failure. Kenetik Circuit should feel like a tool that’s there when the user wants it, not a commitment they’re falling behind on.

8.5.1 Tone Rewrites for Key Notifications


| Notification | Before (v3.1) | After (v3.3) | Why |
| --- | --- | --- | --- |
| Morning nudge | Your brain is ready to train. | Good morning. Today's session takes about 8 minutes. | Respects their time. Tells them the cost upfront. |
| Streak reminder (6pm) | Day 23 streak. Keep it alive. | 23 days of momentum. Your session takes 8 minutes. | Frames the streak as an asset, not a pet. |
| Streak At Risk | Streak At Risk | Your streak is paused until tomorrow. Tap to keep it going. | “At Risk” is alarm language. “Paused” is neutral. |
| Brain Score Decay | Your Brain Score dropped 12% this week. A quick session can turn it around. | Welcome back. Your Brain Score is ready for a refresh. | No accusation. No quantified decline in the first message. Show the decline after they’ve completed a return session. |
| Win-back (Day 3) | Miss you + Brain Score decay warning | Pick up where you left off — your Brain Score and streak are waiting. | Kenetik Circuit waits for you. It doesn’t guilt you. |
| Win-back (Day 14) | Discount incentive | It’s been a while. Here’s 10% off to restock and restart. | Direct value offer without emotional manipulation. |


These rewrites apply to all consumer-facing notification copy including push notifications, Klaviyo email subject lines and body copy, and SMS messages. Devon must approve all notification copy before flows are activated (consistent with the claims compliance hard gate in Section 15).


# 9. Kenetik Consumption Protocol

The training platform includes a 4-week protocol that progressively increases Kenetik consumption from 1 to 3 servings per day, timed around training sessions. This is the bridge between engagement and revenue.

## 9.1 Protocol Structure

The consumption protocol is opt-in and surfaced during onboarding (Day 2, after the user has completed their first real training session). Users who opt in see a daily consumption prompt; users who skip can enable it later from settings.


| Week | Daily Servings | Timing | Fuel Points for Logging |
| --- | --- | --- | --- |
| 1 | 1 serving | 30 min before training session | 25/day |
| 2 | 2 servings | Morning (focus) + pre-training | 35/day |
| 3 | 2 to 3 servings | Morning + pre-training + afternoon (sustained) | 45/day |
| 4+ | 3 servings | Morning ritual + pre-training + afternoon performance | 50/day |


| REVISED IN v3.3 — Consumption log moved to post-session |
| --- |


## 9.2 Logging UI

The consumption log appears on the results screen as the single action prompt (Section 5.5.1, priority 1), after exercises are complete. It is a single-tap interface: “How many Kenetik servings today?” with three large buttons (1, 2, 3+) and a “Skip” option. Tapping a number logs the intake and completes the session. Skipping completes the session with no penalty, but no consumption points are earned.
Rationale for post-session placement: the user came to train. Asking them to report intake before they can start exercises inserts a decision between intent and action. Post-session, the user is in a reflective state and has already completed the valuable part. The consumption log fits naturally alongside the results without gating the experience.
The log also shows: current protocol week, recommended serving count for today, and a small progress ring showing adherence percentage for the current week. For users who train multiple times per day, the consumption log only appears on the first session.

## 9.3 Restock Estimation and Prompt

Kenetik Circuit estimates when a user will run out of product based on three inputs: average daily servings from consumption logs (rolling 7-day average), date of last Shopify order (pulled via Shopify Admin API using the linked customer ID from Section 11.6), and units per order (from the order line items).
Estimated days remaining = (units from last order × servings per unit) / average daily logged servings. When estimated days remaining falls below 5, the restock prompt appears as the single action prompt on the results screen (priority 2, after consumption log). “Running low? Restock before your supply runs out.” with a one-click reorder button.
One-click reorder: calls the Shopify Cart API (POST /cart/add.js) to add the user’s most-ordered SKU to cart, then redirects to checkout. For Recharge subscribers, triggers an early shipment via the Recharge API. If the user’s Shopify customer ID is not yet linked, the prompt links to the product page instead.

## 9.4 Subscription Upsell Integration

Users who log 3 servings daily for 7+ consecutive days and are not on a Recharge subscription trigger the subscription upsell Klaviyo flow. The upsell logic: if (avg_daily_servings >= 2.5) AND (consecutive_days_logged >= 7) AND (recharge_subscription_active == false), fire the consumption log event with subscription_upsell_eligible: true.

## 9.5 Interaction with Neural Priming

When Neural Priming is active, the consumption log is incorporated into the Neural Priming flow rather than appearing on the results screen. The logging data feeds the same Supabase table and Klaviyo events regardless of which flow it appears in.

## 9.6 Klaviyo Events

The consumption log fires a Brain Kenetik Consumption Log event with properties: servings (integer), time_of_day (morning/pre-training/afternoon), paired_with_training (boolean), protocol_week (integer), adherence_pct (float), and subscription_upsell_eligible (boolean).


# 10. Social and Viral Mechanics


## 10.1 Shareable Brain Score Card

Auto-generated image card showing: Brain Score (composite), top domain scores, current level and title, streak count, and badges. Optimized for Instagram Stories (1080x1920), Twitter/X (1200x675), and iMessage. Branded with Kenetik visual identity. Sharing earns 50 Fuel Points.

## 10.2 Referral Program

Each user gets a unique referral link. When a referred friend completes their baseline Brain Score, the referrer earns 300 Fuel Points and the friend starts with a 100-point welcome bonus. Referral tracking handled by LoyaltyLion’s built-in referral system.

## 10.3 Friend Challenges

Unlocked at Level 8 (Steady Hand). Users can challenge a friend to beat their score on a specific exercise. The challenge is delivered via a shareable link. Both participants earn bonus points for participating, winner earns double.


# 11. Technical Architecture


## 11.1 System Overview

Frontend: Static HTML/CSS/JS hosted on GitHub Pages (or embedded in Shopify via proxy page). Single-page app architecture. No framework dependency required. Responsive for mobile and desktop. A service worker (sw.js) caches the app shell, all exercise HTML/JS/CSS, and brand assets for offline access. Cache-first strategy for static assets, network-first for API calls with local queue fallback (see Section 11.7).
Backend: Supabase (free tier: 50K MAU, 500MB database, 1GB storage). Handles user profiles, training session data, exercise scores, leaderboard rankings, game state (streaks, levels, badges), and friend connections. Auth via magic link (email-based, no passwords).
Scaling note: At the target of 10% DAU, the free tier’s serverless function invocation limit (500K/month) will be hit before the MAU limit. At 500 DAU, roughly 100K invocations/month. The Supabase Pro tier ($25/month) provides 2M invocations, 100K MAU, and 8GB database. Budget for the upgrade by Week 6.
Integrations: LoyaltyLion Admin API for all points/rewards. Klaviyo Events API for all marketing automation. Shopify Flow webhooks via LoyaltyLion. ACF Metafields updated via Shopify Admin API.

## 11.2 Data Flow

- User completes exercise → Score saved to IndexedDB immediately, then synced to Supabase.
- Supabase serverless function fires POST /v2/activities to LoyaltyLion with rule name and customer ID.
- LoyaltyLion awards points, checks tier thresholds.
- Same function fires Klaviyo event with session properties.
- Klaviyo triggers appropriate flow (celebration, nudge, upsell).
- LoyaltyLion webhook fires on tier change → Shopify Flow updates customer tags and ACF metafields.

## 11.3 Supabase Schema (Key Tables)


| Table | Key Fields | Purpose |
| --- | --- | --- |
| users | id, email, shopify_customer_id, display_name, level, brain_score, streak_count, streak_freezes, identity_state, created_at | User profile, game state, identity linkage |
| sessions | id, user_id, exercises (jsonb), total_score, points_earned, sync_status, created_at | Training session records |
| scores | id, user_id, exercise_type, score, difficulty_level, reaction_time_avg, input_device, normalized_rt_avg, created_at | Exercise scores for history and PR tracking |
| leaderboard | id, user_id, score_type (weekly/alltime), score, rank, period | Precomputed leaderboard positions |
| badges | id, user_id, badge_type, earned_at | Achievement tracking |
| consumption_logs | id, user_id, servings, timing, paired_with_training, protocol_week, created_at | Kenetik intake tracking |
| event_queue | id, user_id, target (loyaltylion/klaviyo), payload (jsonb), attempts, status, created_at | Retry queue for failed integration calls |


## 11.4 File Structure

index.html (app shell + router), sw.js (service worker), exercises/ (one HTML partial per exercise), css/brain-score.css (Kenetik brand styles), js/engine.js (session logic, scoring, difficulty, Brain Score formula), js/games/ (one module per new game), js/supabase.js (auth + data + local queue), js/loyaltylion.js (activity tracking + retry), js/klaviyo.js (event firing + retry), js/gamification.js (streaks, levels, badges, leaderboard), js/identity.js (identity state machine, Shopify linkage), js/consumption.js (protocol logging, restock estimation).

## 11.5 Input Device Latency Normalization

Reaction-time exercises are sensitive to input device differences. Detection via PointerEvent API at session start. Normalization offsets: mouse −30ms, trackpad −15ms, touchscreen 0ms (baseline). Offsets are configurable in engine.js. Raw reaction times are always stored alongside normalized values. Exercises affected: Stroop, DSST, Flanker, Go/No-Go, Speed Match, Visual Search, Trail Connect, and Number Sense.


## 11.6 Identity Lifecycle

Every downstream system depends on reliable user identity. This section defines how a visitor becomes a known, linked customer.
11.6.1 Identity States


| State | What’s Known | What Works | What Doesn’t |
| --- | --- | --- | --- |
| Anonymous | Device fingerprint + localStorage session ID | Exercises, scoring, local Brain Score display | Points, Klaviyo flows, leaderboards, rewards, streaks (not persisted) |
| Email-captured | Email + Supabase user ID | All above + persistence, streaks, leaderboards, Klaviyo events | LoyaltyLion points, reward redemption (requires Shopify ID) |
| Shopify-linked | Email + Supabase ID + Shopify customer ID | Everything. Full platform functionality. | N/A |


11.6.2 State Transitions
Anonymous → Email-captured: The email gate appears after the baseline assessment (Day 1, after the user sees their first Brain Score). Prompt: “Save your Brain Score and start earning rewards.” Users can dismiss once; it reappears before their second session.
Email-captured → Shopify-linked: On email capture, identity.js checks Shopify Admin API for an existing customer. If found, the Shopify customer ID is stored and passed to LoyaltyLion. If not found, linking happens automatically on first Shopify purchase via Shopify Flow webhook.
Points backfill: When transitioning to Shopify-linked, a backfill function fires all accumulated activities to LoyaltyLion using the newly linked customer ID. No points are lost.
11.6.3 Cross-Device Sync
Users who log in via magic link on a second device receive their full profile from Supabase. No data is device-local once the user reaches email-captured state. Anonymous session data on the first device is not recoverable, but this is limited to a single session (the baseline).
11.6.4 Auth Token and Session Management
Supabase magic link auth issues a JWT with a 30-day expiry stored in localStorage. When expired, a non-blocking prompt triggers a new magic link. The app remains usable during re-auth (exercises complete; sync queues locally).


## 11.7 Error Handling and Graceful Degradation

No API call is fire-and-forget. Every call has defined failure behavior.
11.7.1 Local-First Session Storage
Exercise results are saved to IndexedDB immediately on completion, before any network call. Supabase write is a sync operation, not the primary save. Background sync runs every 60 seconds and on app resume. Failed records retry up to 10 times over 24 hours with exponential backoff.
11.7.2 Integration Call Retry
LoyaltyLion: 3 attempts with exponential backoff (5s, 30s, 5min). After 3 failures, flagged for manual review. User sees points as “pending” (Pineapple gold with subtle pulse) until confirmed.
Klaviyo: 3 attempts over 15 minutes via Supabase cron function (pg_cron, every 5 minutes). Then discard with log entry.
Shopify Admin API: Failures retry on next session start. Metafield staleness acceptable for up to 24 hours.
11.7.3 Streak Protection
Streaks are tracked both locally (IndexedDB) and server-side (Supabase). The streak is maintained if either source shows an active session for the day. Reconciliation happens at session start, before the user sees their streak count.
11.7.4 User-Facing States


| State | UI Indicator | User Experience |
| --- | --- | --- |
| Normal | None | Standard experience. |
| Syncing | Subtle spinner next to points | Can continue training. Points show as earned but syncing. |
| Offline | Top banner: “You’re offline. Progress will sync when you reconnect.” | Full exercise functionality. Points pending. Leaderboards and rewards disabled. |
| Sync error | Banner: “Some data is still syncing. Your progress is safe.” | Can continue training. Background retry continues. |


The tone of all error states is reassuring, never alarming. If the user completed the exercises, it counted.


| NEW IN v3.3 — Return experience for lapsed users |
| --- |


## 11.8 Return After Absence

When a user returns after 7+ days of inactivity, the dashboard adjusts to welcome them back rather than leading with data about decline.
11.8.1 Return Dashboard State
If last_session_date is more than 7 days ago, the dashboard replaces the standard layout with a return state:
- Headline: “Welcome back.” (not “You’ve been gone for 12 days”)
- Brain Score: Displayed at its current (decayed) value, but without a red decline indicator. No comparison to the pre-absence score on this screen.
- CTA: “Pick up where you left off” → starts a normal 3-exercise session.
- Post-return-session results: After the user completes their return session, the results screen shows how much of the decayed score they recovered: “Your Brain Score went from 61 to 67 in one session.” This frames the decline as a recovery opportunity, not a loss.

The standard dashboard (with domain breakdown, streak count, weekly challenge) returns on the user’s second session back. The return state is a one-time bridge.


# 12. Shopify App Integration Map

Six existing Shopify apps integrate with Kenetik Circuit. No new installs required.


| App | Role in Kenetik Circuit | Integration Method |
| --- | --- | --- |
| LoyaltyLion | Points accounting, reward fulfillment, tier management, referral tracking | Admin API + Headless API for storefront redemption |
| Klaviyo | All lifecycle email/SMS | Events API + profile properties |
| Shopify Flow | Automation middleware: customer tagging, metafield updates, conditional logic | Triggered by LoyaltyLion webhooks |
| ACF Metafields | Store Brain Score, level, streak on Shopify customer profiles | Updated via Shopify Flow or direct Admin API |
| Recharge | Subscription upsells triggered by high engagement | Triggered via Shopify Flow |
| Gorgias | Support routing based on loyalty tier and engagement | Customer tags visible in Gorgias |


# 13. Build Phases

Assumed team: 1 primary developer, with Brandon available for cognitive science validation and Devon for claims/identity review. If team size increases to 2 developers, the original 12-week timeline holds. At 1 developer, the timeline extends to 14 weeks with nice-to-have items deferred to post-launch.

## Phase 0: Spec Completion (Week 0, pre-build)

- Brandon validates Brain Score composite formula (Section 5.3). Must-have.
- Devon and dev lead finalize identity lifecycle decisions (Section 11.6). Must-have.
- Dev lead confirms team size and timeline. Must-have.
- Katie reviews consumption protocol and reward tiers (Sections 7.2, 9). Must-have.
- Devon reviews claims language for onramp screens and notification copy. Must-have.
Deliverable: Final spec with all open questions resolved.

## Phase 1: Foundation Merge (Weeks 1–3)

Must-have:
- Merge Peter’s Stroop and DSST into unified app shell with Kenetik brand styles
- Port Brandon’s Flanker, N-back, and Task Switching with adaptive difficulty
- Set up Supabase: auth, users, scores, sessions, event_queue tables
- Implement identity state machine (Section 11.6)
- Implement local-first session storage with IndexedDB + Supabase sync
- Add service worker for offline app shell caching
- Implement first screen / arrival experience (Section 5.4.1)
- Add Klaviyo event tracking for all 5 exercises
- Add LoyaltyLion activity tracking
- Configure LoyaltyLion custom activity rules
- Implement Brain Score composite formula in engine.js
- Build dashboard with 3-second glance composition (Section 5.6.2)
Nice-to-have:
- Input device latency normalization. Can ship in Phase 2.
Deliverable: 5-exercise platform with identity, points, offline resilience, Brain Score, and zero-decision daily flow.

## Phase 2: New Games + Daily Engine (Weeks 4–6)

Must-have:
- Build Speed Match, Pattern Matrix, Visual Search, Sequence Memory, Go/No-Go
- Implement daily session engine with exercise rotation algorithm
- Implement first-week curated onramp (Section 5.4)
- Build consolidated results screen with post-session budget (Section 5.5)
- Add streak system with local+server dual tracking
- Wire up all new Klaviyo events and LoyaltyLion rules
Nice-to-have:
- Level progression with game unlocking. Can launch with all 10 games unlocked.
Deliverable: 10-exercise platform with daily sessions, curated onramp, streaks, and consolidated results screen.

## Phase 3: Full Game Library + Rewards (Weeks 7–9)

Must-have:
- Build Mental Rotation, Dual Focus, Word Sprint, Number Sense, Trail Connect
- Implement reward redemption UI (LoyaltyLion Headless API)
- Configure reward tiers including 1,000-point micro-reward
- Build Weekly Challenge system
- Implement consumption protocol with post-session logging (Section 9)
- Wire Shopify Flow automations
- Upgrade Supabase to Pro tier if approaching limits
Nice-to-have:
- Restock estimation and one-click reorder (Section 9.3).
Deliverable: Full 15-game platform with rewards, challenges, and consumption protocol.

## Phase 4: Social + Leaderboards (Weeks 10–11)

Must-have:
- Build leaderboard system (global, weekly)
- Implement shareable Brain Score card generator
- Add referral system (LoyaltyLion referral URLs)
- Add badges and achievements
Nice-to-have:
- Friend challenge feature (Level 8 unlock)
- Friends and age group leaderboard views
Deliverable: Social layer with leaderboards, sharing, referrals, and badges.

## Phase 5: Neural Priming + Polish (Weeks 12–13)

Must-have:
- Port Brandon’s Neural Priming 4-phase protocol with all 10 scenario presets
- Integrate consumption protocol with priming sessions
- Implement return-after-absence dashboard state (Section 11.8)
- Implement notification tone guidelines across all Klaviyo flows (Section 8.5)
- Performance optimization and mobile responsiveness pass
- Full Klaviyo flow testing
- Points backfill testing for identity transitions
- Soft launch to existing customers via Klaviyo segment
Nice-to-have:
- Level progression (if deferred from Phase 2)
- Friend challenges (if deferred from Phase 4)
- Restock estimation (if deferred from Phase 3)
Deliverable: Complete platform ready for production launch.

## Post-Launch Sprint (Weeks 14+)

Absorbs deferred nice-to-have items. Prioritization based on soft launch user data.


# 14. Success Metrics


| Metric | Target | Measurement |
| --- | --- | --- |
| Day 1 Retention | 40%+ (vs 28% mobile game avg) | Users who return day after first session |
| Day 7 Retention | 25%+ (vs 13% mobile game avg) | Users active 7 days after first session |
| Day 30 Retention | 15%+ | Users active 30 days after first session |
| Daily Active Users | 10%+ of registered users | Users completing at least 1 session per day |
| Average Session Length | 5 to 8 minutes | Time from Start tap to results screen dismissal |
| Streak Length (median) | 7+ days | Median active streak across all users |
| LoyaltyLion Points Redeemed | 30%+ of earned points | Points spent on rewards vs points earned |
| Kenetik Reorders Attributed | 10%+ of training users | Orders within 7 days of training session |
| Subscription Conversion | 5%+ of active trainers | Non-subscribers who convert after 14+ day streak |
| Referral Rate | 8%+ of Level 3+ users | Users who share referral link and generate a signup |
| NPS from Training Users | 50+ | Net Promoter Score from training-specific survey |


| REVISED IN v3.3 — Session length target tightened |
| --- |

Average Session Length target revised from 8–12 minutes (v3.1) to 5–8 minutes (v3.3). The original target included unbounded post-session screens. With the post-session budget (Section 5.5) capping results at 30 seconds and the zero-decision daily flow (Section 5.6) removing pre-session friction, the actual exercise content is 4.5–7 minutes. The 5–8 minute target is honest about what the user experiences.

# 15. Science Claims and Compliance

All claims about cognitive benefits must be carefully tiered. Kenetik Circuit can make structure/function claims about the exercises themselves but cannot make disease claims or imply that Kenetik treats or prevents cognitive conditions.
Hard gate: Any consumer-facing content that touches claims, science, or citations requires Devon Price’s approval before publication. No exceptions.
- Tier 1 (Safe, no approval needed): Claims about the exercises themselves: “Train your working memory,” “Improve your reaction time,” “Challenge your cognitive flexibility.”
- Tier 2 (Devon approval required): Claims about ketones and cognition must use approved language from the Kenetik Claims Matrix with specific paper citations.
- Tier 3 (Prohibited): Disease claims, diagnosis claims, or claims that Kenetik prevents or treats any condition. Never: “clinically proven,” “reduces inflammation,” or any disease/condition names.

Brain Score disclaimer on every results screen: “Brain Score measures your performance on cognitive exercises and is not a medical or diagnostic assessment.”

# 16. Immediate Next Steps

- Brandon: Validate the Brain Score composite formula (Section 5.3). Define domain weights, normalization parameters, and decay model.
- Devon + dev lead: Finalize identity lifecycle decisions (Section 11.6). Email gate after baseline (recommended) or before? Shopify account creation on first purchase (recommended) or on signup?
- Dev lead: Confirm team size and adopt 12-week (2 devs) or 14-week (1 dev) timeline.
- Katie: Review reward tiers including the new 1,000-point micro-reward (Section 7.2), consumption protocol (Section 9), and restock/reorder flow.
- Devon: Review notification tone rewrites (Section 8.5) and first-screen copy (Section 5.4.1).
- Configure LoyaltyLion custom activity rules for all Kenetik Circuit events.
- Configure LoyaltyLion reward tiers. Verify current plan supports Headless API.
- Set up Supabase project and scaffold database schema (Section 11.3).
- Begin Phase 1 build.