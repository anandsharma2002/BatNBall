# BatNBall Feature Catalog

This document details every feature in the **BatNBall** platform, detailing target roles, inputs, business rules, edge cases, and corresponding API/WebSocket details.

---

## 1. Authentication & Account Management

### 1.1. User Account Creation (Sign Up)
- **Role**: `SUPER_ADMIN` only. Standard users cannot sign up on their own to prevent database clutter and unauthorized match logs.
- **Inputs**:
  - `phone_number`: String (Unique, E.164 format)
  - `password`: String (Plaintext, to be hashed on server)
  - `confirm_password`: String (Must match password)
- **Business Rules**:
  - No email verification or OTP verification required for initial registration.
  - The phone number must not already exist in the database.
  - Generates a blank linked Player Profile automatically.
- **Edge Cases**:
  - Re-registering an existing phone number returns a `409 Conflict` error.
- **API Endpoint**: `POST /api/v1/admin/users/create`

### 1.2. User Login
- **Role**: Public / All Roles.
- **Inputs**:
  - `phone_number`: String
  - `password`: String
- **Business Rules**:
  - Authenticates credentials against password hashes using bcrypt.
  - Generates a secure session token (JWT) with user ID, role, and associated player ID.
- **Edge Cases**:
  - Suspended accounts (checked via `account_status`) must be blocked from logging in.
- **API Endpoint**: `POST /api/v1/auth/login`

### 1.3. Change Password (Authenticated User)
- **Role**: `SUPER_ADMIN`, `USER`
- **Inputs**:
  - `current_password`: String
  - `new_password`: String
  - `confirm_new_password`: String
- **Business Rules**:
  - Validates that the current password matches the database record.
  - Verifies that `new_password` matches `confirm_new_password`.
- **API Endpoint**: `PUT /api/v1/users/change-password`

### 1.4. Forgot Password (OTP Verification)
- **Role**: Public / All Roles.
- **Inputs**:
  - **Step 1 (Request OTP)**: `phone_number`
  - **Step 2 (Reset Password)**: `phone_number`, `otp`, `new_password`
- **Business Rules**:
  - Sends a mock/real SMS OTP code to the provided phone number.
  - Verifies OTP correctness before updating the password hash in the database.
- **API Endpoints**:
  - `POST /api/v1/auth/forgot-password/request`
  - `POST /api/v1/auth/forgot-password/verify`

---

## 2. Profile & Team Management

### 2.1. Profile Management
- **Role**: `USER`, `SUPER_ADMIN` (Users can only edit their own profile; Super Admin can edit any profile).
- **Inputs**:
  - `first_name`, `last_name`: Strings
  - `display_name`: String (e.g. "V. Kohli")
  - `profile_picture_url`: String (or image upload multi-part form)
  - `date_of_birth`: Date
  - `batting_style`: Enum (`RIGHT_HAND`, `LEFT_HAND`)
  - `bowling_style`: Enum (`RIGHT_ARM_FAST`, etc.)
  - `player_roles`: Array of Enums (`BATSMAN`, `BOWLER`, etc.)
- **Business Rules**:
  - Edits are updated in the `players` collection.
  - Automatically reflected in all teams they are currently active in.
- **API Endpoint**: `PUT /api/v1/players/:playerId`

### 2.2. Player Search & Records Lookup
- **Role**: All authenticated users.
- **Inputs**:
  - `query`: String (Name or phone number search)
- **Business Rules**:
  - Returns matching players list.
  - Clicking on a player profile fetches their comprehensive stats, graphs, and match history.
- **API Endpoint**: `GET /api/v1/players/search?q=query`

### 2.3. Team Creation & Roster Management
- **Role**: `USER`, `SUPER_ADMIN`
- **Inputs**:
  - `team_name`: String (Unique)
  - `team_short_name`: String (3-4 characters, e.g. "RCB")
  - `logo_url`: String (Optional)
  - `squad_members`: Array of player ObjectIds
  - `team_roles`: Assignment of Captain, Wicket-Keeper, and Members
- **Business Rules**:
  - Teams must contain at least 5 members to be eligible for matches, and up to 25.
  - A player can belong to multiple teams.
- **API Endpoint**: `POST /api/v1/teams`

---

## 3. Match Management

### 3.1. Match Creation (Setup)
- **Role**: `USER`, `SUPER_ADMIN`
- **Inputs**:
  - `team_first_id`, `team_second_id`: ObjectIds
  - `venue`: String
  - `match_date_time`: DateTime
  - `total_overs_per_innings`: Integer (e.g., 20)
  - `max_overs_per_bowler`: Integer
  - `ball_type`: Enum
  - `umpires`: Array of up to 4 player ObjectIds
  - `match_rules`: Sub-object containing Wide Ball, No Ball, Free Hit, Overthrow, Bye, Leg-Bye, and Penalty configurations.
- **Business Rules**:
  - The creator is automatically registered as Umpire #1.
  - Up to 3 other players can be added as umpires.
  - Initializes the match status to `UPCOMING`.
- **API Endpoint**: `POST /api/v1/matches`

### 3.2. Roster Setup & Shared Joining
- **Role**: Umpires (can edit), Users (can join via link).
- **Inputs**:
  - `match_id`: ObjectId
  - `team_id`: ObjectId
  - `player_id`: ObjectId (for manual additions)
- **Business Rules**:
  - **Invite Link**: Generates a shareable URL (e.g., `https://batnball.com/matches/:matchId/join`).
  - **Self-Join**: A user visiting the link can select Team A or B and click "Join". They are added to that team's roster for this match in real-time.
  - **Manual Entry**: Umpires can search and add players to either team's Playing XI or Substitute list.
- **API Endpoints**:
  - `GET /api/v1/matches/:matchId/share-link`
  - `POST /api/v1/matches/:matchId/join`
  - `POST /api/v1/matches/:matchId/roster`

### 3.3. Toss Configuration
- **Role**: Umpires
- **Inputs**:
  - `toss_won_by_team_id`: ObjectId
  - `toss_decision`: Enum (`BAT`, `FIELD`)
- **Business Rules**:
  - Commits the toss results to the match metadata.
  - Locks in the batting and bowling team assignments for the 1st innings.
- **API Endpoint**: `PUT /api/v1/matches/:matchId/toss`

---

## 4. Live Scoring Engine (Core Real-Time Feature)

### 4.1. Crease Initialization
- **Role**: Umpires
- **Inputs**:
  - `striker_id`, `non_striker_id`: ObjectIds (Batsmen from the batting team)
  - `bowler_id`: ObjectId (Bowler from the bowling team)
- **Business Rules**:
  - Locks in the active striker, non-striker, and bowler for the start of the innings or over.
- **API Endpoint**: `POST /api/v1/matches/:matchId/score/initialize`

### 4.2. Ball Event Logging (Live scoring UI clicks)
- **Role**: Selected Umpires / Scorers only.
- **Inputs**:
  - `runs_from_bat`: Integer (0-6)
  - `is_boundary`: Boolean
  - `is_extra`: Boolean
  - `extra_type`: Enum (`WIDE`, `NO_BALL`, `BYE`, `LEG_BYE`, `PENALTY` | `null`)
  - `extra_runs`: Integer
  - `is_wicket`: Boolean
  - `dismissal_details`: Object (type, dismissed player, fielder involved, direct hit)
  - `is_control_shot`: Boolean
- **Business Rules (Automations)**:
  - **Runs**: Increments striker's runs and balls faced. If runs = 1 or 3, swaps striker and non-striker.
  - **Extras**:
    - If `WIDE` or `NO_BALL`: Award 1 extra run (or as per rules). Ball is NOT added to bowler's over count or striker's balls faced.
    - If `BYE` or `LEG_BYE`: Extra runs are added to the team totals. Ball IS added to bowler's over count and striker's balls faced (runs do not credit to batsman's personal stats).
  - **Over Check**: After 6 legal deliveries, the over ends. Striker and non-striker are swapped. Prompt for next bowler.
  - **Wicket Check**: On wicket, set striker/non-striker as dismissed, require selection of new batsman.
  - **Data Broadcast**: Broadcasts a WebSocket payload immediately to all clients listening to `match_id`.
- **API Endpoint & Socket Event**:
  - Endpoint: `POST /api/v1/matches/:matchId/score/ball`
  - WS Event: `match:score_update`

### 4.3. Multi-Step Undo (Stack-Based)
- **Role**: Umpires
- **Inputs**: None (Triggers rollback of latest action)
- **Business Rules**:
  - Restores the match state (runs, wickets, strike, active batsmen/bowler) to the exact state before the last delivery.
  - Allows up to **5 levels of undo**.
  - Re-adjusts career statistics that were modified by the undone balls.
- **API Endpoint**: `POST /api/v1/matches/:matchId/score/undo`

### 4.4. Mid-Over Bowler/Batsman Substitution
- **Role**: Umpires
- **Inputs**:
  - `substitution_type`: Enum (`BATSMAN`, `BOWLER`)
  - `outgoing_player_id`: ObjectId
  - `incoming_player_id`: ObjectId
- **Business Rules**:
  - Allows replacing a striker/non-striker (e.g., Retired Hurt) or bowler mid-over.
  - Splits ball-by-ball credits accordingly.
- **API Endpoint**: `POST /api/v1/matches/:matchId/score/substitute`

---

## 5. Analytics & Leaderboards

### 5.1. Orange & Purple Cap Leaderboards
- **Role**: All users (Read-only).
- **Rules**:
  - **Orange Cap**: Ranks top 5 players based on cumulative runs scored across all matches in the system.
  - **Purple Cap**: Ranks top 5 players based on cumulative wickets taken.
- **API Endpoint**: `GET /api/v1/leaderboard/caps`

### 5.2. Chase Master Leaderboard
- **Role**: All users (Read-only).
- **Rules**:
  - Ranks top 5 batsmen based on:
    1. Cumulative runs scored in the 2nd Innings (chasing runs).
    2. Team's Win Percentage in matches where this batsman was chasing.
- **API Endpoint**: `GET /api/v1/leaderboard/chase-masters`

### 5.3. Stats Graphs & Charts
- **Role**: All users.
- **Rules**:
  - Fetches timeline data of a player's career (runs per match, economy rates, average trend lines, boundaries ratio).
  - Supplies chart data for rendering line, bar, and radar charts in the UI.
- **API Endpoint**: `GET /api/v1/players/:playerId/stats/charts`

---

## 6. Live Streaming & Visitor Dashboard

### 6.1. Visitor Live Tracking Link
- **Role**: Public (No authentication required).
- **Rules**:
  - Generates a lightweight dashboard with real-time score updates, current partnership, last over log, and full scorecard.
  - Relies on WebSocket/SSE streams to push immediate updates to visitor browsers.
- **Socket Event**: `join:match_live` (Subscribes to read-only channel)
