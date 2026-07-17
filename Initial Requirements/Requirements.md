# Cricket

## Objective

Cricket application is a platform where Player can create matches,
perform CRUD operations related to matches, add players for match,
search other players, add scores, store stats, see records etc.

## Tech Stack

**Frontend**: React js  
**Backend**: Node js  
**Database**: Mongo DB  + SupaBase
**App**: React Native

**Important Note**: Initially we only focus on Full stack web development. App development will be done later.

Project Name: **BatNBall**

Process:
                        DataBase  
                           |   
                       Backend API   
               |                            |   
Frontend Web App(web site)         Mobile App(android,ios)   

--- 

## Features

1. User login/Signup
2. Roles: Super Admin, User
3. Match: CRUD Operations
4. Create Match
5. Update Match process (Real Time)
6. Players data
7. Player in a match
8. Player match history
9. Player entire cricket history record
10. Player data graph, chart.
11. Real time application update

## Details

### User Login/Signup

1. **Sign up**
  c

2. **Log in**
   - Phone Number + Password

3. **Change Password**
   - Current Password + New Password + Confirm New Password

### Roles

#### 1. Super Admin

- Super Admin can perform all the task, CRUD operations,
  Features or functionality on application.

#### 2. User

- Create Match
- Edit Match (Add score, match details etc. at live match. Cannot update closed match or history match.)
- Search other player and their data, chat, graph and stats
- Able to see his/her data
- Update Profile

### 3. Match

- Create Match
- Update match in live
- Add players in match as player with:
  - a. Search + add Player
  - Share link of match to join match by choosing team A or B

- Update Score:
  - Easy UI to update runs, ball, wicket, batsman, bowler,
    no ball, 1st bound etc.

- Select Umpire
  - Umpire can be a player or a player can be an Umpire
  - Match Creator choose 2 Umpires to update the match score
    and stats at live

- List of easy UI (and User Experience) and feature to use:

  **For Example:**
  - Automatically rotate strike when umpire add a 1 run (single).
  - Do not count ball when it is no ball, dead ball or wide ball.
  - Choose Player for bowling or batting instantly to avoid lagg between match.
    Can revoke/change batsman or bowler in the middle of batting or bowling
    like retired or for next player.
  - Choose next batsman or bowler to avoid time-waste.

### 4. Player Data

#### Batsman

- Total number of match
- Total number of runs
- Every match runs
- Total runs
- Every match runs
- Total 50s/100s
- Total 4s, 6s
- Every match 4s, 6s
- Single + Double
- Bowls + Dot balls
- Wicket type (for example: Catch out, wicket, hitwicket,
  runout etc.)
- Wicket by, catch by
- Total Average
- Strike rate
- Chart and Graph of stats

#### Bowler

- Total number of match
- Total number of overs
- Every match overs
- Total give runs
- Every give runs
- Total wickets
- Total give 4s, 6s
- Every total give 4s, 6s
- Total give single + double
- Every match give single + double
- Total bowls + dot balls
- Wicket type (for example: Catch out, wicket, hitwicket, runout etc.)
- Wicket by, catch by
- Total economy
- Chart and Graph of stats

#### Keeper

- Catchs
- Outs

#### Fielder

- Run outs
- Catchs

> **Note:** If anything else that is not written in the above list, then create another list and provide that data for review as well.

### 5. Players Details

- Each player's win, loss, draw stats
- Each

### 6. Create a list of Top 5 Players with these following lists

a. Orange Cap (IPL Orange Cap)

b. Purple Cap (IPL Purple Cap)

c. Chase Master (Highest runs in chase with winning%):
    - Highest runs in chase
    - Win% in Chase

## Add rules for each match

Create rules for each match like:

    - Wide ball (1 run) should be added or not
    - No Ball (1 run) should be calculated or not
    - No ball free hit should be added or not
    - Overthrow run allowed or not
    - Bye
    - Leg-Bye
    - Penalty
