# Build The API Cup — Artificial Prediction Intelligence

## Project Overview

Create a web application for an internal Information Technology department workplace competition based on the FIFA World Cup 2026.

### Event Name

🥇 The API Cup — Artificial Prediction Intelligence

### Tagline

**Can humans outperform the machines?**

The API Cup is a prediction competition where participants attempt to predict the results of FIFA World Cup 2026 matches. Participants compete against one another and against a special AI contestant whose predictions are generated externally using an AI agent running the Opus 4.8 model.

The application will serve two purposes:

1. Allow users to submit predictions for World Cup matches.
2. Display an exciting, highly visual public leaderboard on a monitor in the workplace.

At the conclusion of the tournament:

* 🥇 First Place receives the grand prize.
* 🥈 Second Place receives a runner-up prize.
* 🥉 Third Place receives a third-place prize.

The AI competitor is not eligible for prizes but participates fully in the rankings.

---

# Core Requirements

## User Authentication

Participants must be able to:

* Register with a username and password.
* Log in securely.
* Reset their password using a self-service password recovery process.
* View and manage their profile.

### Roles

#### Participant

Can:

* Register and log in.
* Submit predictions.
* View upcoming matches.
* View leaderboard.
* View prediction history.
* View personal statistics and achievements.

#### Administrator

Can:

* Manage users if necessary.
* Configure application settings.
* Enter AI predictions (unless AI predictions become automated).
* View administrative statistics and reports.

Administrators should not be required to manage fixtures, tournament rounds, or match results Unless there are no other option.

---

# Match Data Source

The application should automatically source match information from the FIFA API whenever possible. If not, it will have to be handled by the administrators

The architecture must support a provider abstraction layer so that fixtures and results can be sourced from:

* FIFA API (preferred)
* Alternative football APIs
* Manual administrative entry (fallback mode)

The system should automatically retrieve:

* Teams
* Match schedules
* Kickoff times
* Tournament stages
* Match status
* Final results

When new fixtures become available, they should automatically appear in the application.

When official results become available, scores and leaderboards should be updated automatically.

The system should require minimal administrative intervention.

---

# Tournament Structure

The tournament progresses through:

* Round of 32
* Round of 16
* Quarter Finals
* Semi Finals
* Third Place Match
* Final

The application should automatically organize and display fixtures according to the tournament stage.

Future matches should automatically appear as they become available through the data source.

No administrator should be required to:

* Enter fixtures
* Enter match results

Unless there are no other options

---

# Prediction Submission

Participants may submit predictions for any available match that has not yet reached its prediction cutoff time.

Requirements:

* A participant may submit only one prediction per match.
* Once a prediction is submitted, it becomes permanently locked.
* Predictions cannot be edited.
* Predictions cannot be deleted.
* AI predictions follow the same locking rules.
* Participants do not need to wait for an entire round to become available.
* Predictions may be submitted progressively as fixtures are announced.

Example:

A participant may submit predictions for several Round of 32 matches today and submit predictions for additional matches later, provided those matches have not yet reached their cutoff time.

---

# Prediction Lock Countdown

Each match should display a countdown timer showing how long remains before predictions close.

Requirements:

* Countdown visible on prediction pages.
* Countdown visible in Office TV Mode.
* Predictions automatically close exactly 1 hour before kickoff.
* Locked matches clearly indicate that submissions are closed.
* Countdown timers must use official kickoff times from the match data provider.

Example:

Kickoff: 8:00 PM

Prediction Cutoff: 7:00 PM

After 7:00 PM:

* No new predictions may be submitted.
* Existing predictions remain visible.
* Predictions remain permanently locked.

This countdown should create excitement and urgency before each game.

---

# Scoring System

## Exact Result

Award: 10 points

Requirements:

* Correct winner or draw.
* Correct scoreline.

Examples:

Actual: France 2–0 Japan

Prediction: France 2–0 Japan

Score: 10 points

Actual: Canada 3–3 Turkey

Prediction: Canada 3–3 Turkey

Score: 10 points

---

## Correct Outcome

Award: 5 points

Requirements:

* Correct winner or draw.
* Incorrect scoreline.

Examples:

Actual: France 2–0 Japan

Prediction: France 4–3 Japan

Score: 5 points

Actual: Canada 3–3 Turkey

Prediction: Canada 1–1 Turkey

Score: 5 points

---

## Incorrect Prediction

Award: 0 points

Examples:

Actual: France 2–0 Japan

Prediction: France 0–1 Japan

Score: 0 points

Actual: Canada 3–3 Turkey

Prediction: Canada 4–0 Turkey

Score: 0 points

---

# Leaderboard (Highest Priority Feature)

The leaderboard is the centerpiece of the entire application.

Design it as a premium experience suitable for display on a large office monitor.

## Visual Style

Requirements:

* Festive and colourful.
* Inspired by carnival celebrations.
* FIFA World Cup atmosphere.
* Smooth animations.
* Dynamic transitions.
* Responsive design.
* Optimized for large-screen viewing.

---

## Ranking Badges

### First Place

* Large gold trophy.
* Highlighted row.
* Special glow effect.

### Second Place

* Silver trophy.
* Slightly smaller than gold.

### Third Place

* Bronze trophy.
* Slightly smaller than silver.

### Remaining Participants

* Standard styling.
* No trophy badge.

Leaderboard row example:

🏆 Alice ............................................. 135 pts

🥈 Bob ............................................... 130 pts

🥉 Charlie ........................................... 125 pts

David ................................................ 118 pts

---

# Leaderboard Movement Indicators

After each completed match or leaderboard recalculation, display movement indicators:

Examples:

▲ +3 positions

▲ +1 position

▼ -2 positions

▬ No change

Users should instantly see how their ranking changed.

---

# AI Competitor

A special participant called:

MQ-Chat: ModelOpus 4.8

will compete alongside human players.

Requirements:

* AI predictions must be submitted before the same cutoff time as human participants.
* AI predictions become locked immediately after submission.
* AI predictions cannot be modified after submission.
* AI appears throughout the application as a normal participant.
* AI rankings update automatically whenever leaderboards are recalculated.

---

# Beat The AI Achievement

Award a special achievement badge to participants who outperform the AI during a completed stage of the tournament.

Badge Name:

🤖 AI Slayer

Requirements:

* Earned whenever a participant scores more points than the AI within a tournament stage.
* Displayed in profiles.
* Displayed on leaderboard tooltips.
* Track total AI victories per participant.

---

# Golden Predictor Achievement

Award a special title:

⭐ Golden Predictor

Granted to the participant with the highest exact-score prediction rate.

Requirements:

* Track exact prediction percentage.
* Display title beside username.
* Highlight on leaderboard.
* Show in Hall of Fame.

---

# Prediction Heatmap

Create a visual analytics page showing collective predictions.

Examples:

France vs Japan

75% predicted France win

15% predicted draw

10% predicted Japan win

Requirements:

* Visualize community sentiment.
* Increase engagement.
* Allow participants to compare their picks with the crowd.
* Display using attractive charts and graphics.

---

# Office TV Mode

Create a dedicated full-screen display mode optimized for office monitors and televisions.

Requirements:

* Auto-refresh.
* Rotating information screens.
* Large readable text.
* Animated transitions.
* No user interaction required.

The TV Mode should rotate through:

### Screen 1

Live Leaderboard

### Screen 2

Top Movers

Biggest ranking gains and losses

### Screen 3

AI vs Humans

Overall tournament comparison

### Screen 4

Upcoming Matches

Fixtures and countdown timers

### Screen 5

Golden Predictor standings

### Screen 6

Interesting tournament statistics

---

# Statistics Dashboard

Display:

* Total participants.
* Total predictions submitted.
* Exact predictions count.
* Highest scoring participant.
* Most accurate participant.
* AI accuracy.
* Human accuracy.
* AI versus Human comparison.
* Number of AI Slayer achievements earned.
* Leaderboard movement history.

---

# Technical Requirements

Use the following specialist agents throughout planning and implementation:

* frontend-design
* ui-ux-pro-max
* brainstorm

Prioritize:

* Exceptional user experience.
* Mobile responsiveness.
* TV/monitor responsiveness.
* Clean architecture.
* Strong security.
* High performance.
* Maintainability.

---

# Architecture Guidance

Before implementation, propose and justify:

* Technology stack.
* Frontend framework.
* Backend framework.
* Authentication solution.
* Database.
* Hosting platform.
* Deployment strategy.
* Monitoring solution.
* Backup strategy.
* FIFA API integration strategy.
* Fallback data provider strategy.

---

# Discovery Phase

Before writing code:

1. Ask clarifying questions.
2. Challenge assumptions where appropriate.
3. Suggest improvements.
4. Propose additional gamification features.
5. Recommend architecture decisions.
6. Identify potential risks and edge cases.
7. Investigate available FIFA World Cup APIs and recommend the most reliable solution.
8. Produce a detailed implementation plan before development begins.
9. Needs to push the code to my Github repository apicup
10. If needed, I also have an ec2 running mariadb, if db persistence is needed

