# Cricket Application Database Schema Blueprint

This document outlines the professional-grade, enterprise-ready MongoDB schema architecture
for the cricket tracking platform. To achieve elite sports analytics (similar to ESPNcricinfo),
the data structures are designed with high granularity to dynamically derive advanced metrics.

---

## 1. User & Authentication Collection (`users`)

Stores core application access credentials, security states, and privilege tiers.

- `user_id` (Unique Object ID)
- `phone_number` (String, Unique Index)
- `password_hash` (String)
- `role` (Enum: `SUPER_ADMIN`, `USER`)
- `associated_player_id` (Object Reference → `players.player_id` | Null)
- `account_status` (Enum: `ACTIVE`, `SUSPENDED`, `DEACTIVATED`)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

---

## 2. Player Profile Collection (`players`)

Contains biographical details, specialized sporting roles, and physical attributes.

- `player_id` (Unique Object ID)
- `first_name` (String)
- `last_name` (String)
- `display_name` (String, e.g., "V. Kohli")
- `profile_picture_url` (String)
- `date_of_birth` (Date)
- `batting_style` (Enum:
  `RIGHT_HAND`,
  `LEFT_HAND`
)
- `bowling_style` (Enum:
  `RIGHT_ARM_FAST`,
  `RIGHT_ARM_MED`,
  `LEFT_ARM_FAST`,
  `LEFT_ARM_SPIN`,
  `RIGHT_ARM_OFF_BREAK`,
  `RIGHT_ARM_LEG_BREAK`,
  `LEFT_ARM_UNORTHODOX`
)
- `player_roles` (Array of Enums:
  `BATSMAN`,
  `BOWLER`,
  `ALL_ROUNDER`,
  `WICKET_KEEPER`
)
- `current_teams` (Array of Object References → `teams.team_id`)

---

## 3. Team Collection (`teams`)

Groups player profiles into structural units and catalogs collective squad metadata.

- `team_id` (Unique Object ID)
- `team_name` (String)
- `team_short_name` (String, e.g., `"MI"`, `"RCB"`)
- `created by user id` (Object Reference → `users.user_id`)
- `logo_url` (String)
- `created_by_user_id` (Object Reference → `users.user_id`)
- `squad_members` (Array of Sub-Objects):
  - `player_id` (Object Reference → `players.player_id`)
  - `joined_date` (Date)
  - `role_in_team` (Enum: `CAPTAIN`, `WICKET_KEEPER`, `MEMBER`)

---

## 4. Match Metadata & Configuration Collection (`matches`)

Configures playing environments, live structural rules, and dynamic global match results.

- `match_id` (Unique Object ID)
- `tournament_id` (Object Reference → `tournaments.tournament_id` | Null)
- `venue` (String, Ground Name)
- `match_date_time` (DateTime)
- `total_overs_per_innings` (Integer)
- `max_overs_per_bowler` (Integer)
- `ball_type` (Enum:
  `LEATHER_RED`,
  `LEATHER_WHITE`,
  `LEATHER_PINK`,
  `TENNIS`,
  `TAPE_TENNIS`, 
  `COSCO`
)
- `match_status` (Enum:
  `UPCOMING`,
  `LIVE`,
  `PAUSED`,
  `RAIN_DELAY`,
  `COMPLETED`,
  `ABANDONED`
)
- `created_by` (Object Reference → `users.user_id`)
- `umpires` (Array of Object References → `players.player_id`)
- `scorers` (Array of Object References → `users.user_id`)
- `team_first_id` (Object Reference → `teams.team_id`)
- `team_second_id` (Object Reference → `teams.team_id`)
- `playing_xi_team_first` (Array of Object References → `players.player_id`)
- `playing_xi_team_second` (Array of Object References → `players.player_id`)
- `substitutes_team_first` (Array of Object References → `players.player_id`)
- `substitutes_team_second` (Array of Object References → `players.player_id`)

### Toss Details

- `toss_won_by_team_id` (Object Reference → `teams.team_id`)
- `toss_decision` (Enum:
  `BAT`,
  `FIELD`
)

### Result Matrix

- `winner_team_id` (Object Reference → `teams.team_id` | Null if Tie/No Result)
- `result_type` (Enum:
  `RUNS`,
  `WICKETS`,
  `SUPER_OVER`,
  `TIE`,
  `NO_RESULT`,
  `DLS_METHOD`
)
- `win_margin` (Integer)
- `player_of_the_match` (Object Reference → `players.player_id`)

---

## 5. Ball-by-Ball Logging Collection (`ball_by_ball`)

The atomic log engine of the database. Every professional metric, graph, and historical report is derived from this dataset.

- `ball_id` (Unique Object ID)
- `match_id` (Object Reference → `matches.match_id`)
- `innings_number` (Integer: 1, 2, 3, 4)
- `over_number` (Integer, 0 to N-1)
- `ball_number_in_over` (Integer, 1 to 6 for legal deliveries)
- `total_legal_balls_in_innings` (Integer counter)
- `batting_team_id` (Object Reference → `teams.team_id`)
- `bowling_team_id` (Object Reference → `teams.team_id`)
- `striker_id` (Object Reference → `players.player_id`)
- `non_striker_id` (Object Reference → `players.player_id`)
- `bowler_id` (Object Reference → `players.player_id`)

### Runs Accounting

- `runs_from_bat` (Integer: 0, 1, 2, 3, 4, 5, 6)
- `is_boundary` (Boolean)
- `boundary_type` (Enum: `FOUR`, `SIX` | Null)

### Extras Accounting

- `is_extra` (Boolean)
- `extra_type` (Enum:
  `WIDE`,
  `NO_BALL`,
  `BYE`,
  `LEG_BYE`,
  `PENALTY`
  | Null
)
- `extra_runs` (Integer)

### Advanced Analytics Data

- `is_legal_delivery` (Boolean)
- `is_dot_ball` (Boolean)
- `is_control_shot` (Boolean — *Did the batsman middle the ball cleanly, or miss/edge it?*)
- `match_phase` (Enum:
  `POWERPLAY`,
  `MIDDLE_OVERS`,
  `DEATH_OVERS`
)

### Dismissal Sub-object (`dismissal` | Null)

- `is_wicket` (Boolean)
- `dismissed_player_id` (Object Reference → `players.player_id`)
- `wicket_type` (Enum:
  `BOWLED`,
  `CAUGHT`,
  `CAUGHT_AND_BOWLED`,
  `LBW`,
  `RUN_OUT`,
  `STUMPED`,
  `HIT_WICKET`,
  `RETIRED_HURT`,
  `RETIRED_OUT`,
  `OBSTRUCTING_FIELD`
)
- `fielder_involved_id` (Object Reference → `players.player_id` | Null)
- `is_direct_hit` (Boolean, for run outs)

### Instantaneous State Tracking (Snapshot after this delivery)

- `current_total_score` (Integer)
- `current_wickets_down` (Integer)
- `required_runs` (Integer | Null)

---

## 6. Professional Career Statistics Collection (`player_career_stats`)

Aggregated metrics structured directly for charts, profile visual modules, and career historical trends.

### 6.1 Batting Statistics Matrix

- `matches_played` (Integer)
- `innings_batted` (Integer)
- `not_outs` (Integer)
- `total_runs` (Integer)

- `highest_score` (Sub-object):
  - `runs` (Integer)
  - `is_not_out` (Boolean)

- `batting_average` (Float)
- `balls_faced` (Integer)
- `batting_strike_rate` (Float)
- `centuries_100s` (Integer)
- `half_centuries_50s` (Integer)
- `fifties_to_hundreds_conversion_rate` (Float)
- `ducks_total` (Integer)
- `golden_ducks` (Integer)
- `fours_count` (Integer)
- `sixes_count` (Integer)
- `boundary_runs_percentage` (Float)
- `dot_ball_percentage_faced` (Float)
- `control_shot_percentage` (Float)

#### Batting Performance Splits (Arrays of nested statistical variations)

- `vs_bowling_type_split`
  - Separate stats vs Off-spin, Leg-spin, Left-arm orthodox, Fast, Medium

- `by_match_phase_split`
  - Performance curves for Powerplay, Middle, and Death phases

- `by_batting_position_split`
  - Metrics categorized by lineup number **#1 through #11**

### 6.2 Bowling Statistics Matrix

- `innings_bowled` (Integer)
- `balls_bowled` (Integer)
- `overs_bowled_calculated` (Float, e.g., `42.3`)
- `maidens_overs` (Integer)
- `runs_conceded` (Integer)

- `runs_conceded` (Integer)
- `wickets_taken` (Integer)

- `best_bowling_figures` (Sub-object):
  - `wickets` (Integer)
  - `runs` (Integer)

- `bowling_average` (Float)
- `economy_rate` (Float)
- `bowling_strike_rate` (Float)
- `three_wicket_hauls` (Integer)
- `five_wicket_hauls` (Integer)
- `wides_conceded` (Integer)
- `no_balls_conceded` (Integer)
- `dot_balls_bowled_count` (Integer)
- `dot_ball_percentage_bowled` (Float)
- `fours_conceded` (Integer)
- `sixes_conceded` (Integer)

#### Bowling Performance Splits

- `vs_batsman_hand_split`
  - Detailed numbers structured against Right Hand vs Left Hand batters

- `by_match_phase_split`
  - Economy and Strike Rate trends in Powerplay vs Death overs

### 6.3 Fielding & Wicket-Keeping Matrix

- `catches_total` (Integer)
- `catches_as_fielder` (Integer)
- `catches_as_keeper` (Integer)
- `stumpings` (Integer)
- `run_outs_assisted` (Integer, tracking the fielder execution path)
- `run_outs_unassisted` (Integer, tracking direct hits)

---

## 7. Partnerships Records Collection (`partnerships`)

Logs cumulative statistical data compiled by batting combinations across matches.

  - `partnership_id` (Unique Object ID)
  - `match_id` (Object Reference → `matches.match_id`)
  - `batsman_1_id` (Object Reference → `players.player_id`)
  - `batsman_2_id` (Object Reference → `players.player_id`)
  - `total_runs_scored` (Integer)
  - `total_balls_faced` (Integer)
  - `runs_by_batsman_1` (Integer)
  - `runs_by_batsman_2` (Integer)
  - `balls_by_batsman_1` (Integer)
  - `balls_by_batsman_2` (Integer)
  - `extras_in_partnership` (Integer)
  - `is_unbroken` (Boolean) 
