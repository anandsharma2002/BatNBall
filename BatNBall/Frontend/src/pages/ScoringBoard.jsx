import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import {
  Target, RotateCcw, ChevronRight, Users, Zap,
  AlertTriangle, CheckCircle, ArrowLeftRight, Shield
} from 'lucide-react';
import Navigation from '../components/Navigation';

const API = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatOvers = (legal_balls) => {
  const overs = Math.floor(legal_balls / 6);
  const balls = legal_balls % 6;
  return `${overs}.${balls}`;
};

const calcStrikeRate = (runs, balls) =>
  balls === 0 ? '0.00' : ((runs / balls) * 100).toFixed(1);

// ─── Score Pill ────────────────────────────────────────────────────────────────
const ScorePill = ({ label, value, sub }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '0.75rem 1.25rem',
    textAlign: 'center',
    minWidth: '90px'
  }}>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--secondary-color)', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
  </div>
);

// ─── Ball Chip (recent balls row) ─────────────────────────────────────────────
const BallChip = ({ ball }) => {
  let bg = 'rgba(255,255,255,0.08)';
  let text = ball.runs_from_bat + ball.extra_runs;
  let color = 'var(--text-color)';

  if (ball.dismissal?.is_wicket) { bg = '#dc2626'; text = 'W'; color = '#fff'; }
  else if (ball.is_boundary && ball.boundary_type === 'SIX') { bg = 'var(--accent-color)'; color = 'var(--dominant-color)'; }
  else if (ball.is_boundary && ball.boundary_type === 'FOUR') { bg = '#22c55e'; color = '#fff'; }
  else if (!ball.is_legal_delivery) { bg = '#ca8a04'; color = '#fff'; text = ball.extra_type?.[0] ?? 'E'; }
  else if (text === 0) { bg = 'rgba(255,255,255,0.04)'; color = 'var(--text-muted)'; text = '•'; }

  return (
    <div style={{
      width: '36px', height: '36px', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: '0.8rem', background: bg, color,
      border: '1px solid var(--border-color)', flexShrink: 0
    }}>
      {text}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const ScoringBoard = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [match, setMatch] = useState(null);
  const [balls, setBalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Init modal state
  const [showInitModal, setShowInitModal] = useState(false);
  const [initForm, setInitForm] = useState({ striker_id: '', non_striker_id: '', bowler_id: '' });

  // Extra modal state
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [pendingRuns, setPendingRuns] = useState(0);
  const [extraForm, setExtraForm] = useState({ extra_type: 'WIDE', extra_runs: 1 });

  // Wicket modal state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketForm, setWicketForm] = useState({
    runs_before_wicket: 0,
    wicket_type: 'BOWLED',
    dismissed_player_id: '',
    fielder_involved_id: '',
    is_direct_hit: false
  });

  // Over complete / next batter modals
  const [showNextBowler, setShowNextBowler] = useState(false);
  const [nextBowlerId, setNextBowlerId] = useState('');
  const [showNextBatter, setShowNextBatter] = useState(false);
  const [nextBatterId, setNextBatterId] = useState('');

  // Strike animation flash
  const [strikeSwapped, setStrikeSwapped] = useState(false);

  // Substitution Modal State
  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState({ role: 'striker', existing_player_id: '', new_player_id: '', sub_type: 'tactical' });

  // End Match Modal State
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [endMatchForm, setEndMatchForm] = useState({ winner_team_id: 'DRAW', result_type: 'RUNS', win_margin: 0 });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ─── Load scorecard ──────────────────────────────────────────────────────────
  const fetchScorecard = async () => {
    try {
      const { data } = await axios.get(`${API}/matches/${matchId}/score/scorecard`);
      setMatch(data.match);
      setBalls(data.balls || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load scorecard');
    } finally {
      setLoading(false);
    }
  };

  // ─── Socket.io ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchScorecard();

    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current.emit('join_match_room', matchId);

    socketRef.current.on('ball_logged', ({ ball, match: updatedMatch, over_completed, innings_transition, wicket }) => {
      setMatch(updatedMatch);
      setBalls(prev => [...prev, ball]);
      if (over_completed && !innings_transition) {
        setShowNextBowler(true);
      }
      if (innings_transition) {
        setShowInitModal(true);
        showToast('🏏 Innings 1 Complete! Set openers for Innings 2');
      }
      if (wicket) {
        setShowNextBatter(true);
      }
      // Animate strike swap
      setStrikeSwapped(true);
      setTimeout(() => setStrikeSwapped(false), 500);
    });

    socketRef.current.on('match_state_update', ({ match: updatedMatch, balls: updatedBalls }) => {
      setMatch(updatedMatch);
      if (updatedBalls) {
        setBalls(updatedBalls);
      }
    });

    return () => socketRef.current?.disconnect();
  }, [matchId]);

  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // ─── Initialize Crease ────────────────────────────────────────────────────────
  const handleInitialize = async () => {
    if (!initForm.striker_id || !initForm.non_striker_id || !initForm.bowler_id) {
      return showToast('All 3 crease positions are required');
    }
    setActionLoading(true);
    try {
      const { data } = await axios.post(`${API}/matches/${matchId}/score/initialize`, initForm, authHeaders);
      setMatch(data.match);
      setShowInitModal(false);
      showToast('✅ Crease initialized!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to initialize crease');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Log Ball (Normal Run) ────────────────────────────────────────────────────
  const handleRun = async (runs) => {
    setActionLoading(true);
    try {
      await axios.post(`${API}/matches/${matchId}/score/ball`, {
        runs_from_bat: runs,
        is_boundary: runs === 4 || runs === 6,
        boundary_type: runs === 4 ? 'FOUR' : runs === 6 ? 'SIX' : null
      }, authHeaders);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to log ball');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Log Extra ────────────────────────────────────────────────────────────────
  const handleExtraSubmit = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${API}/matches/${matchId}/score/ball`, {
        runs_from_bat: pendingRuns,
        is_extra: true,
        extra_type: extraForm.extra_type,
        extra_runs: Number(extraForm.extra_runs),
        is_legal_delivery: !['WIDE', 'NO_BALL'].includes(extraForm.extra_type)
      }, authHeaders);
      setShowExtraModal(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to log extra');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Log Wicket ───────────────────────────────────────────────────────────────
  const handleWicketSubmit = async () => {
    if (!wicketForm.wicket_type) return showToast('Select wicket type');
    setActionLoading(true);
    try {
      await axios.post(`${API}/matches/${matchId}/score/ball`, {
        runs_from_bat: Number(wicketForm.runs_before_wicket),
        dismissal: {
          is_wicket: true,
          dismissed_player_id: wicketForm.dismissed_player_id || match?.crease_state?.striker_id?._id,
          wicket_type: wicketForm.wicket_type,
          fielder_involved_id: wicketForm.fielder_involved_id || null,
          is_direct_hit: wicketForm.is_direct_hit
        }
      }, authHeaders);
      setShowWicketModal(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to log wicket');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Set Next Bowler ──────────────────────────────────────────────────────────
  const handleNextBowler = async () => {
    if (!nextBowlerId) return showToast('Select next bowler');
    setActionLoading(true);
    try {
      await axios.post(`${API}/matches/${matchId}/score/set-next-bowler`, { new_bowler_id: nextBowlerId }, authHeaders);
      setShowNextBowler(false);
      setNextBowlerId('');
      showToast('🎳 New bowler set!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error setting bowler');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Set Next Batter ─────────────────────────────────────────────────────────
  const handleNextBatter = async () => {
    if (!nextBatterId) return showToast('Select next batter');
    setActionLoading(true);
    try {
      await axios.post(`${API}/matches/${matchId}/score/set-next-batter`, { new_striker_id: nextBatterId }, authHeaders);
      setShowNextBatter(false);
      setNextBatterId('');
      showToast('🏏 New batter at crease!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error setting batter');
    } finally {
      setActionLoading(false);
    }
  };
  // ─── Undo Last Ball ──────────────────────────────────────────────────────────
  const handleUndo = async () => {
    setActionLoading(true);
    try {
      const { data } = await axios.post(`${API}/matches/${matchId}/score/undo`, {}, authHeaders);
      setMatch(data.match);
      await fetchScorecard();
      showToast('⏪ Last ball undone!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to undo');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Submit Substitution ──────────────────────────────────────────────────────
  const handleSubstituteSubmit = async () => {
    if (!subForm.new_player_id) return showToast('Select a replacement player');
    setActionLoading(true);
    try {
      const { data } = await axios.post(`${API}/matches/${matchId}/score/substitute`, subForm, authHeaders);
      setMatch(data.match);
      await fetchScorecard();
      setShowSubModal(false);
      showToast('🔄 Player substituted successfully!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to substitute player');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndMatchSubmit = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${API}/matches/${matchId}/score/end`, {
        winner_team_id: endMatchForm.winner_team_id === 'DRAW' ? null : endMatchForm.winner_team_id,
        result_type: endMatchForm.result_type,
        win_margin: Number(endMatchForm.win_margin)
      }, authHeaders);
      setShowEndMatchModal(false);
      showToast('🏆 Match manually ended!');
      fetchScorecard();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to end match');
    } finally {
      setActionLoading(false);
    }
  };
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass" style={{ padding: '2rem', maxWidth: '400px', textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
    </div>
  );

  const innings = match?.current_innings || 1;
  const inningsKey = `innings${innings}`;
  const currentInnings = match?.[inningsKey] || {};
  const crease = match?.crease_state || {};
  const striker = crease.striker_id;
  const nonStriker = crease.non_striker_id;
  const bowler = crease.bowler_id;
  const creaseReady = !!striker && !!bowler;

  // Recent balls: last 6 of current innings
  const recentBalls = balls.filter(b => b.innings_number === innings).slice(-6);

  // Bowling team players for next bowler picker
  const bowlingTeamPlaying = innings === 1 ? match?.playing_xi_team_second : match?.playing_xi_team_first;
  const battingTeamPlaying = innings === 1 ? match?.playing_xi_team_first : match?.playing_xi_team_second;

  const getSubOptions = () => {
    const isBatting = subForm.role === 'striker' || subForm.role === 'non_striker';
    const pool = isBatting ? battingTeamPlaying : bowlingTeamPlaying;
    if (!pool) return [];
    
    // Exclude players currently active at the crease (except the one being replaced)
    return pool.filter(p => {
      const isAlreadyActive = 
        (p._id === match?.crease_state?.striker_id?._id && subForm.role !== 'striker') ||
        (p._id === match?.crease_state?.non_striker_id?._id && subForm.role !== 'non_striker') ||
        (p._id === match?.crease_state?.bowler_id?._id && subForm.role !== 'bowler');
      return !isAlreadyActive;
    });
  };

  const requiresFielder = ['CAUGHT', 'CAUGHT_AND_BOWLED', 'RUN_OUT', 'STUMPED'].includes(wicketForm.wicket_type);

  return (
    <>
      <Navigation />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '1.5rem', zIndex: 200,
          background: 'var(--secondary-color)', color: '#fff',
          padding: '0.75rem 1.25rem', borderRadius: '8px',
          fontWeight: '600', fontSize: '0.9rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1.5rem', boxSizing: 'border-box' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>
              <Shield size={20} style={{ marginRight: '0.5rem', color: 'var(--accent-color)' }} />
              Live Scoring
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              {match?.current_innings_batting_team_id?.team_name} vs {
                innings === 1 ? match?.team_second_id?.team_name : match?.team_first_id?.team_name
              } — Innings {innings}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {match?.match_status !== 'COMPLETED' && (
              <>
                <button
                  className="btn"
                  onClick={handleUndo}
                  disabled={actionLoading || !match?.undo_actions_remaining}
                  style={{
                    fontSize: '0.85rem', padding: '0.5rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    color: !match?.undo_actions_remaining ? 'var(--text-muted)' : 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: !match?.undo_actions_remaining ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}
                >
                  <RotateCcw size={14} />
                  Undo ({match?.undo_actions_remaining ?? 0})
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setEndMatchForm({ winner_team_id: 'DRAW', result_type: 'RUNS', win_margin: 0 });
                    setShowEndMatchModal(true);
                  }}
                  disabled={actionLoading}
                  style={{
                    fontSize: '0.85rem', padding: '0.5rem 1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                  }}
                >
                  End Match
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowInitModal(true)}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  {creaseReady ? 'Change Crease' : 'Set Crease'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Scoreboard ─────────────────────────────────────────────────────── */}
        <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <ScorePill
              label={match?.current_innings_batting_team_id?.team_short_name || 'TEAM'}
              value={`${currentInnings.score ?? 0}/${currentInnings.wickets ?? 0}`}
              sub={`${formatOvers(currentInnings.total_legal_balls ?? 0)} ov`}
            />
            {innings === 2 && (
              <>
                <ScorePill
                  label="Target"
                  value={(match?.innings1?.score ?? 0) + 1}
                />
                <ScorePill
                  label="Need"
                  value={Math.max(0, (match?.innings1?.score ?? 0) + 1 - (currentInnings.score ?? 0))}
                  sub={`in ${Math.max(0, match?.total_overs_per_innings * 6 - (currentInnings.total_legal_balls ?? 0))} balls`}
                />
              </>
            )}
            <ScorePill label="CRR" value={(currentInnings.total_legal_balls ? ((currentInnings.score / currentInnings.total_legal_balls) * 6).toFixed(2) : '0.00')} sub="curr rate" />
          </div>

          {/* Recent balls */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Last 6:</span>
            {recentBalls.length === 0
              ? <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No balls yet</span>
              : recentBalls.map((b, i) => <BallChip key={b._id || i} ball={b} />)
            }
          </div>
        </div>

        {/* ── Crease State ────────────────────────────────────────────────────── */}
        <div className="glass" style={{ padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div className="crease-grid">
            {/* Striker */}
            <div 
              onClick={() => {
                if (!striker) return;
                setSubForm({ role: 'striker', existing_player_id: striker._id, new_player_id: '', sub_type: 'tactical' });
                setShowSubModal(true);
              }}
              style={{
                padding: '1rem', borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: `2px solid ${strikeSwapped ? 'var(--accent-color)' : '#22c55e'}`,
                transition: 'all 0.2s ease',
                cursor: striker ? 'pointer' : 'default',
                transform: 'scale(1)',
              }}
              onMouseEnter={e => striker && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => striker && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <Target size={14} style={{ color: '#22c55e' }} />
                <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700', textTransform: 'uppercase' }}>Striker *</span>
              </div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                {striker?.display_name || <span style={{ color: 'var(--text-muted)' }}>Not set</span>}
              </div>
            </div>

            {/* Non-striker */}
            <div 
              onClick={() => {
                if (!nonStriker) return;
                setSubForm({ role: 'non_striker', existing_player_id: nonStriker._id, new_player_id: '', sub_type: 'tactical' });
                setShowSubModal(true);
              }}
              style={{
                padding: '1rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                transition: 'all 0.2s ease',
                cursor: nonStriker ? 'pointer' : 'default',
                transform: 'scale(1)',
              }}
              onMouseEnter={e => nonStriker && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => nonStriker && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Non-Striker</div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                {nonStriker?.display_name || <span style={{ color: 'var(--text-muted)' }}>Not set</span>}
              </div>
            </div>

            {/* Bowler */}
            <div 
              onClick={() => {
                if (!bowler) return;
                setSubForm({ role: 'bowler', existing_player_id: bowler._id, new_player_id: '', sub_type: 'tactical' });
                setShowSubModal(true);
              }}
              style={{
                padding: '1rem', borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                transition: 'all 0.2s ease',
                cursor: bowler ? 'pointer' : 'default',
                transform: 'scale(1)',
              }}
              onMouseEnter={e => bowler && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => bowler && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Bowler</div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                {bowler?.display_name || <span style={{ color: 'var(--text-muted)' }}>Not set</span>}
              </div>
              {crease.legal_balls_this_over !== undefined && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {crease.legal_balls_this_over}/6 balls
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Scoring Pad ─────────────────────────────────────────────────────── */}
        {match?.match_status === 'COMPLETED' ? (
          <div className="glass" style={{ padding: '2.5rem', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
            <CheckCircle size={48} style={{ color: '#22c55e', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>Match Complete!</h3>
            <p style={{ color: 'var(--text-muted)' }}>The match has concluded. View the final scorecard above.</p>
          </div>
        ) : !creaseReady ? (
          <div className="glass" style={{ padding: '2rem', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
            <AlertTriangle size={36} style={{ color: '#f59e0b', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Set the crease positions to start scoring.</p>
            <button className="btn btn-primary" onClick={() => setShowInitModal(true)}>
              Set Crease →
            </button>
          </div>
        ) : (
          <div className="glass" style={{ padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Log Ball
            </div>

            {/* Run Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  onClick={() => handleRun(r)}
                  disabled={actionLoading}
                  style={{
                    padding: '1.25rem 0',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: r === 4 || r === 6 ? '1.4rem' : '1.3rem',
                    cursor: 'pointer',
                    border: '2px solid',
                    transition: 'all 0.15s ease',
                    background: r === 4
                      ? 'rgba(34,197,94,0.12)'
                      : r === 6
                        ? 'rgba(var(--accent-color-rgb, 79,70,229),0.12)'
                        : 'rgba(255,255,255,0.04)',
                    borderColor: r === 4
                      ? '#22c55e'
                      : r === 6
                        ? 'var(--accent-color)'
                        : 'var(--border-color)',
                    color: r === 4 ? '#22c55e' : r === 6 ? 'var(--accent-color)' : 'var(--text-color)'
                  }}
                >
                  {r === 4 ? '4' : r === 6 ? '6' : r}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <button
                onClick={() => { setExtraForm({ extra_type: 'WIDE', extra_runs: 1 }); setPendingRuns(0); setShowExtraModal(true); }}
                disabled={actionLoading}
                className="btn"
                style={{
                  padding: '0.75rem 0', fontWeight: '700', fontSize: '0.85rem',
                  border: '2px solid #ca8a04', color: '#ca8a04',
                  background: 'rgba(202,138,4,0.08)', borderRadius: '10px'
                }}
              >
                Wide (WD)
              </button>
              <button
                onClick={() => { setExtraForm({ extra_type: 'NO_BALL', extra_runs: 1 }); setPendingRuns(0); setShowExtraModal(true); }}
                disabled={actionLoading}
                className="btn"
                style={{
                  padding: '0.75rem 0', fontWeight: '700', fontSize: '0.85rem',
                  border: '2px solid #ca8a04', color: '#ca8a04',
                  background: 'rgba(202,138,4,0.08)', borderRadius: '10px'
                }}
              >
                No Ball (NB)
              </button>
              <button
                onClick={() => { setExtraForm({ extra_type: 'BYE', extra_runs: 1 }); setPendingRuns(0); setShowExtraModal(true); }}
                disabled={actionLoading}
                className="btn"
                style={{
                  padding: '0.75rem 0', fontWeight: '700', fontSize: '0.85rem',
                  border: '2px solid #ca8a04', color: '#ca8a04',
                  background: 'rgba(202,138,4,0.08)', borderRadius: '10px'
                }}
              >
                Byes (B)
              </button>
              <button
                onClick={() => { setExtraForm({ extra_type: 'LEG_BYE', extra_runs: 1 }); setPendingRuns(0); setShowExtraModal(true); }}
                disabled={actionLoading}
                className="btn"
                style={{
                  padding: '0.75rem 0', fontWeight: '700', fontSize: '0.85rem',
                  border: '2px solid #ca8a04', color: '#ca8a04',
                  background: 'rgba(202,138,4,0.08)', borderRadius: '10px'
                }}
              >
                Leg Byes (LB)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
              <button
                onClick={() => {
                  setWicketForm({ runs_before_wicket: 0, wicket_type: 'BOWLED', dismissed_player_id: '', fielder_involved_id: '', is_direct_hit: false });
                  setShowWicketModal(true);
                }}
                disabled={actionLoading}
                className="btn"
                style={{
                  padding: '0.9rem 0', fontWeight: '700', fontSize: '0.9rem',
                  border: '2px solid #ef4444', color: '#ef4444',
                  background: 'rgba(239,68,68,0.08)', borderRadius: '10px',
                  width: '100%'
                }}
              >
                <AlertTriangle size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                Wicket! 🏏
              </button>
            </div>
          </div>
        )}

        {/* ── Ball Log ────────────────────────────────────────────────────────── */}
        {balls.length > 0 && (
          <div className="glass" style={{ padding: '1.25rem', marginTop: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>Ball Log</h3>
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {[...balls].reverse().map((b, i) => (
                <div key={b._id || i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '0.82rem'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ov {b.over_number}.{b.ball_number_in_over}</span>
                  <span>{b.dismissal?.is_wicket ? <span style={{ color: '#ef4444', fontWeight: '700' }}>WICKET ({b.dismissal.wicket_type})</span> : b.is_extra ? <span style={{ color: '#ca8a04' }}>{b.extra_type} +{b.extra_runs}</span> : `${b.runs_from_bat} run${b.runs_from_bat !== 1 ? 's' : ''}${b.is_boundary ? ` (${b.boundary_type})` : ''}`}</span>
                  <span style={{ color: 'var(--accent-color)', fontWeight: '700' }}>{b.current_total_score}/{b.current_wickets_down}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Initialize Crease Modal ─────────────────────────────────────────── */}
      {showInitModal && (
        <ModalOverlay onClose={() => setShowInitModal(false)}>
          <h2 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Set Crease Positions</h2>

          {[
            { label: 'Striker (Opening Batter)', key: 'striker_id', players: battingTeamPlaying },
            { label: 'Non-Striker', key: 'non_striker_id', players: battingTeamPlaying },
            { label: 'Bowler', key: 'bowler_id', players: bowlingTeamPlaying }
          ].map(({ label, key, players }) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <label className="form-label">{label}</label>
              <select
                className="form-input"
                value={initForm[key]}
                onChange={e => setInitForm(prev => ({ ...prev, [key]: e.target.value }))}
              >
                <option value="">— Select Player —</option>
                {(players || []).map(p => {
                  if (!p) return null;
                  const id = p._id || p;
                  const name = typeof p === 'object' ? (p.display_name || `${p.first_name} ${p.last_name}`) : `Player ${p}`;
                  return <option key={id} value={id}>{name}</option>;
                })}
              </select>
            </div>
          ))}

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleInitialize} disabled={actionLoading}>
            {actionLoading ? 'Setting...' : 'Start Innings →'}
          </button>
        </ModalOverlay>
      )}

      {/* ── Extra Modal ─────────────────────────────────────────────────────── */}
      {showExtraModal && (
        <ModalOverlay onClose={() => setShowExtraModal(false)}>
          <h2 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Log Extra</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Extra Type</label>
            <select className="form-input" value={extraForm.extra_type} onChange={e => setExtraForm(prev => ({ ...prev, extra_type: e.target.value }))}>
              {['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Extra Runs (penalty/byes)</label>
            <input className="form-input" type="number" min="1" max="5" value={extraForm.extra_runs}
              onChange={e => setExtraForm(prev => ({ ...prev, extra_runs: e.target.value }))} />
          </div>
          {extraForm.extra_type === 'NO_BALL' && (
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Runs off bat (on No-Ball)</label>
              <input className="form-input" type="number" min="0" max="6" value={pendingRuns}
                onChange={e => setPendingRuns(Number(e.target.value))} />
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleExtraSubmit} disabled={actionLoading}>
            {actionLoading ? 'Logging...' : 'Log Extra'}
          </button>
        </ModalOverlay>
      )}

      {/* ── Wicket Modal ─────────────────────────────────────────────────────── */}
      {showWicketModal && (
        <ModalOverlay onClose={() => setShowWicketModal(false)}>
          <h2 style={{ fontWeight: '800', marginBottom: '1.5rem', color: '#ef4444' }}>🏏 Wicket!</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Runs before wicket on this ball</label>
            <input className="form-input" type="number" min="0" max="6" value={wicketForm.runs_before_wicket}
              onChange={e => setWicketForm(prev => ({ ...prev, runs_before_wicket: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Wicket Type</label>
            <select className="form-input" value={wicketForm.wicket_type} onChange={e => setWicketForm(prev => ({ ...prev, wicket_type: e.target.value }))}>
              {['BOWLED', 'CAUGHT', 'CAUGHT_AND_BOWLED', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_HURT', 'RETIRED_OUT', 'OBSTRUCTING_FIELD'].map(w => (
                <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Dismissed Batter</label>
            <select className="form-input" value={wicketForm.dismissed_player_id} onChange={e => setWicketForm(prev => ({ ...prev, dismissed_player_id: e.target.value }))}>
              <option value="">— Striker (default) —</option>
              {[striker, nonStriker].filter(Boolean).map(p => (
                <option key={p._id} value={p._id}>{p.display_name}</option>
              ))}
            </select>
          </div>
          {requiresFielder && (
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Fielder Involved</label>
              <select className="form-input" value={wicketForm.fielder_involved_id} onChange={e => setWicketForm(prev => ({ ...prev, fielder_involved_id: e.target.value }))}>
                <option value="">— Select Fielder —</option>
                {(bowlingTeamPlaying || []).map(p => {
                  if (!p) return null;
                  const id = p._id || p;
                  const name = typeof p === 'object' ? (p.display_name || `${p.first_name} ${p.last_name}`) : `Player ${p}`;
                  return <option key={id} value={id}>{name}</option>;
                })}
              </select>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={wicketForm.is_direct_hit} onChange={e => setWicketForm(prev => ({ ...prev, is_direct_hit: e.target.checked }))} />
                  Direct Hit
                </label>
              </div>
            </div>
          )}
          <button className="btn" style={{ width: '100%', background: '#ef4444', color: '#fff', fontWeight: '700', border: 'none' }} onClick={handleWicketSubmit} disabled={actionLoading}>
            {actionLoading ? 'Logging...' : 'Confirm Wicket!'}
          </button>
        </ModalOverlay>
      )}

      {/* ── Next Bowler Modal ────────────────────────────────────────────────── */}
      {showNextBowler && (
        <ModalOverlay onClose={() => setShowNextBowler(false)}>
          <h2 style={{ fontWeight: '800', marginBottom: '0.5rem' }}>🎳 Over Complete!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Select the next bowler</p>
          <select className="form-input" value={nextBowlerId} onChange={e => setNextBowlerId(e.target.value)} style={{ marginBottom: '1rem' }}>
            <option value="">— Select Bowler —</option>
            {(bowlingTeamPlaying || []).map(p => {
              if (!p) return null;
              const id = p._id || p;
              const name = typeof p === 'object' ? (p.display_name || `${p.first_name} ${p.last_name}`) : `Player ${p}`;
              return <option key={id} value={id}>{name}</option>;
            })}
          </select>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleNextBowler} disabled={actionLoading}>
            {actionLoading ? 'Setting...' : 'Confirm Bowler →'}
          </button>
        </ModalOverlay>
      )}

      {/* ── Next Batter Modal ────────────────────────────────────────────────── */}
      {showNextBatter && (
        <ModalOverlay onClose={() => setShowNextBatter(false)}>
          <h2 style={{ fontWeight: '800', marginBottom: '0.5rem', color: '#ef4444' }}>🏏 Wicket Fell!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Select the next batter</p>
          <select className="form-input" value={nextBatterId} onChange={e => setNextBatterId(e.target.value)} style={{ marginBottom: '1rem' }}>
            <option value="">— Select Batter —</option>
            {(battingTeamPlaying || []).map(p => {
              if (!p) return null;
              const id = p._id || p;
              const name = typeof p === 'object' ? (p.display_name || `${p.first_name} ${p.last_name}`) : `Player ${p}`;
              return <option key={id} value={id}>{name}</option>;
            })}
          </select>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleNextBatter} disabled={actionLoading}>
            {actionLoading ? 'Setting...' : 'Send to Crease →'}
          </button>
        </ModalOverlay>
      )}

      {/* ── Substitution Modal ────────────────────────────────────────────────── */}
      {showSubModal && (
        <ModalOverlay onClose={() => setShowSubModal(false)}>
          <h2 style={{ fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeftRight size={22} style={{ color: 'var(--accent-color)' }} />
            Substitute Player
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Replace the active <strong>{subForm.role?.replace('_', ' ')}</strong> at the crease.
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Replacement Player</label>
            <select 
              className="form-input" 
              value={subForm.new_player_id} 
              onChange={e => setSubForm(prev => ({ ...prev, new_player_id: e.target.value }))}
            >
              <option value="">— Select Player —</option>
              {getSubOptions().map(p => {
                if (!p) return null;
                const id = p._id || p;
                const name = typeof p === 'object' ? (p.display_name || `${p.first_name} ${p.last_name}`) : `Player ${p}`;
                return <option key={id} value={id}>{name}</option>;
              })}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Substitution Type</label>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input 
                  type="radio" 
                  name="sub_type" 
                  value="tactical" 
                  checked={subForm.sub_type === 'tactical'} 
                  onChange={e => setSubForm(prev => ({ ...prev, sub_type: e.target.value }))} 
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <strong>Tactical Mid-Over Sub</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                    Replaces the player at the crease from now on. Previous balls remain unchanged.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input 
                  type="radio" 
                  name="sub_type" 
                  value="correction" 
                  checked={subForm.sub_type === 'correction'} 
                  onChange={e => setSubForm(prev => ({ ...prev, sub_type: e.target.value }))} 
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <strong>Correction (Retroactive)</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                    Corrects a scoring error. Updates the player for all balls in the current over.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '0.75rem' }} 
              onClick={() => setShowSubModal(false)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '0.75rem' }} 
              onClick={handleSubstituteSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? 'Updating...' : 'Confirm Sub'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ── End Match Modal ────────────────────────────────────────────────── */}
      {showEndMatchModal && (
        <ModalOverlay onClose={() => setShowEndMatchModal(false)}>
          <h2 style={{ fontWeight: '800', marginBottom: '0.5rem', color: '#ef4444' }}>🏆 End Match</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Manually conclude this match and record the final outcome.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Select Winner</label>
            <select
              className="form-input"
              value={endMatchForm.winner_team_id}
              onChange={e => setEndMatchForm(prev => ({ ...prev, winner_team_id: e.target.value }))}
            >
              <option value="DRAW">— Draw / Tie / No Result —</option>
              <option value={match?.team_first_id?._id}>{match?.team_first_id?.team_name}</option>
              <option value={match?.team_second_id?._id}>{match?.team_second_id?.team_name}</option>
            </select>
          </div>

          {endMatchForm.winner_team_id !== 'DRAW' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Result Type</label>
                <select
                  className="form-input"
                  value={endMatchForm.result_type}
                  onChange={e => setEndMatchForm(prev => ({ ...prev, result_type: e.target.value }))}
                >
                  <option value="RUNS">Won by Runs</option>
                  <option value="WICKETS">Won by Wickets</option>
                  <option value="SUPER_OVER">Won in Super Over</option>
                  <option value="DLS_METHOD">Won by DLS Method</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Win Margin</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={endMatchForm.win_margin}
                  onChange={e => setEndMatchForm(prev => ({ ...prev, win_margin: e.target.value }))}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: '0.75rem' }}
              onClick={() => setShowEndMatchModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.75rem', background: '#ef4444', borderColor: '#ef4444' }}
              onClick={handleEndMatchSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? 'Ending Match...' : 'End Match'}
            </button>
          </div>
        </ModalOverlay>
      )}
    </>
  );
};

// ─── Modal Overlay ─────────────────────────────────────────────────────────────
const ModalOverlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
  }}>
    <div onClick={e => e.stopPropagation()} className="glass" style={{
      padding: '2rem', width: '100%', maxWidth: '440px', borderRadius: '14px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)', position: 'relative'
    }}>
      {/* Cancel Button */}
      <button 
        onClick={onClose} 
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '1.5rem', color: 'var(--text-muted)', fontWeight: 'bold',
          lineHeight: '1', padding: '0.2rem'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        &times;
      </button>
      {children}
    </div>
  </div>
);

export default ScoringBoard;
