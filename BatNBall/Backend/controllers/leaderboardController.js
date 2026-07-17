const PlayerCareerStats = require('../models/PlayerCareerStats');
const Match = require('../models/Match');
const BallByBall = require('../models/BallByBall');

const getCapsLeaderboard = async (req, res) => {
  try {
    // Find top 5 batters sorted by total runs descending
    const topBatters = await PlayerCareerStats.find()
      .sort({ 'batting.total_runs': -1, 'batting.balls_faced': 1 })
      .limit(5)
      .populate('player_id', 'display_name first_name last_name profile_picture_url');

    // Find top 5 bowlers sorted by wickets taken descending, tie break by runs conceded ascending
    const topBowlers = await PlayerCareerStats.find()
      .sort({ 'bowling.wickets_taken': -1, 'bowling.runs_conceded': 1 })
      .limit(5)
      .populate('player_id', 'display_name first_name last_name profile_picture_url');

    return res.status(200).json({ batters: topBatters, bowlers: topBowlers });
  } catch (error) {
    console.error('Get caps leaderboard error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getChaseMastersLeaderboard = async (req, res) => {
  try {
    // Get all completed matches
    const completedMatches = await Match.find({ match_status: 'COMPLETED' });
    const completedMatchIds = completedMatches.map(m => m._id);

    // Get all player stats
    const stats = await PlayerCareerStats.find()
      .populate('player_id', 'display_name first_name last_name profile_picture_url');

    const list = [];

    for (const stat of stats) {
      const playerId = stat.player_id?._id;
      if (!playerId) continue;

      // Find all balls in 2nd innings where player was striker in completed matches
      const strikerBalls = await BallByBall.find({
        match_id: { $in: completedMatchIds },
        innings_number: 2,
        striker_id: playerId
      });

      if (strikerBalls.length === 0) continue;

      let chaseRuns = 0;
      strikerBalls.forEach(b => {
        chaseRuns += b.runs_from_bat;
      });

      // Calculate win percentage in chases where they batted
      const chasedMatches = new Set(strikerBalls.map(b => b.match_id.toString()));
      let chaseWins = 0;

      for (const mId of chasedMatches) {
        const match = completedMatches.find(m => m._id.toString() === mId);
        if (match) {
          // Determine player's team in this match
          const isTeamFirst = match.playing_xi_team_first.some(id => id.toString() === playerId.toString()) || 
                              match.substitutes_team_first.some(id => id.toString() === playerId.toString());
          const playerTeamId = isTeamFirst ? match.team_first_id?.toString() : match.team_second_id?.toString();

          // In a chase, the player's team must be batting second (innings 2)
          // Innings 2 batting team is either team_second_id (if team_first batted first) or vice-versa
          // Let's resolve the actual batting team of innings 2:
          // In standard cricket, team batting 2nd is match.winner_team_id if they chased and won.
          // Wait, let's verify if the player's team chased and won.
          // If the match winner was the player's team, and player's team batted second:
          // Who batted second? In innings 2, batting team was match.innings2 batting team.
          // Let's check: match.current_innings_batting_team_id at end of innings 2 was the team batting second.
          // Let's check Toss results and determine who batted second:
          // Toss choice is batting or bowling.
          // Let's verify which team actually batted second:
          // Ininnings 1 batting team = toss won team (if bat) else toss lost team.
          // So Innings 2 batting team = the other team.
          // Let's check if player's team was indeed the innings 2 batting team:
          const inn1BatTeamId = match.toss_won_by_id?.toString() === match.team_first_id?.toString()
            ? (match.toss_decision === 'BAT' ? match.team_first_id?.toString() : match.team_second_id?.toString())
            : (match.toss_decision === 'BAT' ? match.team_second_id?.toString() : match.team_first_id?.toString());
          
          const playerTeamChased = playerTeamId !== inn1BatTeamId;

          if (playerTeamChased && match.winner_team_id?.toString() === playerTeamId) {
            chaseWins += 1;
          }
        }
      }

      const chaseTotal = chasedMatches.size;
      const winPct = chaseTotal > 0 ? (chaseWins / chaseTotal) : 0;
      const weightedScore = chaseRuns * winPct;

      list.push({
        player: stat.player_id,
        chaseRuns,
        chaseTotal,
        chaseWins,
        winPct: (winPct * 100).toFixed(0),
        score: weightedScore
      });
    }

    // Sort by score descending
    list.sort((a, b) => b.score - a.score);
    const topChaseMasters = list.slice(0, 5);

    return res.status(200).json(topChaseMasters);
  } catch (error) {
    console.error('Get chase masters error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getCapsLeaderboard,
  getChaseMastersLeaderboard
};
