import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Shield, UserPlus, LogOut, Lock, CheckCircle, AlertTriangle, Eye, EyeOff, Search } from 'lucide-react';
import Navigation from '../components/Navigation';

const Dashboard = () => {
  const { user, role, logout, changePassword } = useAuth();
  const navigate = useNavigate();

  // Player search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      axios.get(`http://localhost:5000/api/v1/players/search?q=${searchQuery}`)
        .then(res => {
          setSearchResults(res.data);
          setSearchLoading(false);
        })
        .catch(err => {
          console.error(err);
          setSearchLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // User creation state (Admin only)
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [battingStyle, setBattingStyle] = useState('RIGHT_HAND');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Password change state (All users)
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showPassSection, setShowPassSection] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    setAdminLoading(true);

    if (!phone || !pass) {
      setAdminError('Phone number and Password are required');
      setAdminLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/v1/admin/users/create', {
        phone_number: phone.trim(),
        password: pass,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        batting_style: battingStyle
      });
      setAdminSuccess(response.data.message || 'User created successfully!');
      // Reset form
      setPhone('');
      setPass('');
      setFirstName('');
      setLastName('');
      setDisplayName('');
      setBattingStyle('RIGHT_HAND');
    } catch (err) {
      setAdminError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    setPassLoading(true);

    if (!oldPass || !newPass || !confirmNewPass) {
      setPassError('All password fields are required');
      setPassLoading(false);
      return;
    }

    try {
      await changePassword(oldPass, newPass, confirmNewPass);
      setPassSuccess('Password updated successfully!');
      setOldPass('');
      setNewPass('');
      setConfirmNewPass('');
      setTimeout(() => setShowPassSection(false), 2000);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div style={{
        maxWidth: '1000px',
        margin: '2rem auto',
        padding: '0 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Main grids */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '2rem',
        width: '100%'
      }}>
        {/* Profile Card & Password settings */}
        <section className="glass" style={{ padding: '2rem', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--secondary-color)' }}>
            My Account
          </h3>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Logged in as <strong>{user?.phone_number}</strong> with privilege level <strong>{role}</strong>.
          </p>

          {!showPassSection ? (
            <button 
              onClick={() => setShowPassSection(true)}
              className="btn"
              style={{
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Lock size={16} />
              Change Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword} style={{
              maxWidth: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.01)'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Change Account Password</h4>
              
              {passError && (
                <div style={{ color: '#D9534F', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertTriangle size={14} />
                  <span>{passError}</span>
                </div>
              )}
              {passSuccess && (
                <div style={{ color: 'var(--secondary-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={14} />
                  <span>{passSuccess}</span>
                </div>
              )}

              <input 
                type="password" 
                placeholder="Current Password" 
                value={oldPass} 
                onChange={(e) => setOldPass(e.target.value)} 
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
              />
              <input 
                type="password" 
                placeholder="New Password" 
                value={newPass} 
                onChange={(e) => setNewPass(e.target.value)} 
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
              />
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                value={confirmNewPass} 
                onChange={(e) => setConfirmNewPass(e.target.value)} 
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
              />
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={passLoading} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  {passLoading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => { setShowPassSection(false); setPassError(''); }} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Search Players Card */}
        <section className="glass" style={{ padding: '2rem', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={22} style={{ color: 'var(--accent-color)' }} />
            Search Players Directory
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Search player profiles to view their career averages, bowling economy, partnerships, and visual analytics form timelines.
          </p>
          
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 1rem', backgroundColor: 'var(--card-bg)' }}>
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Type player display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', width: '100%', padding: '0.25rem 0', color: 'var(--text-color)' }}
              />
            </div>

            {searchQuery && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--dominant-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                zIndex: 100,
                maxHeight: '300px',
                overflowY: 'auto',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                marginTop: '0.5rem'
              }}>
                {searchLoading ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Searching players...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No players found</div>
                ) : (
                  searchResults.map(p => (
                    <div
                      key={p._id}
                      onClick={() => navigate(`/players/${p._id}`)}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(29,79,42,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-color)' }}>{p.first_name} {p.last_name} ({p.display_name})</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.batting_style?.replace('_', ' ')}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {p.player_roles?.slice(0, 2).map(r => (
                          <span key={r} style={{ fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.4rem', backgroundColor: 'var(--border-color)', borderRadius: '4px' }}>
                            {r.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* Admin Dashboard: Create User Account */}
        {role === 'SUPER_ADMIN' ? (
          <section className="glass" style={{ padding: '2rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <UserPlus size={24} style={{ color: 'var(--secondary-color)' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--secondary-color)' }}>
                Create New User Account
              </h3>
            </div>

            {adminError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(217, 83, 79, 0.1)',
                border: '1px solid rgba(217, 83, 79, 0.3)',
                borderRadius: '8px',
                color: '#D9534F',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                <AlertTriangle size={16} />
                <span>{adminError}</span>
              </div>
            )}

            {adminSuccess && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(29, 79, 42, 0.1)',
                border: '1px solid rgba(29, 79, 42, 0.3)',
                borderRadius: '8px',
                color: 'var(--secondary-color)',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                <CheckCircle size={16} />
                <span>{adminSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="profile-form-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Phone Number *</label>
                <input 
                  type="text" 
                  placeholder="+919876543210" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Password *</label>
                <input 
                  type="password" 
                  placeholder="Temporary Password" 
                  value={pass} 
                  onChange={(e) => setPass(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>First Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Virat" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Last Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Kohli" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Display Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. V. Kohli" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Batting Style</label>
                <select value={battingStyle} onChange={(e) => setBattingStyle(e.target.value)}>
                  <option value="RIGHT_HAND">Right Hand Batsman</option>
                  <option value="LEFT_HAND">Left Hand Batsman</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button type="submit" disabled={adminLoading} className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontWeight: '700' }}>
                  {adminLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="glass" style={{ padding: '2rem', boxShadow: 'var(--shadow)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--secondary-color)' }}>
              Welcome to BatNBall Portal
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Standard user dashboard. In upcoming modules, you will be able to create matches, join live rosters, and update scores here.
            </p>
          </section>
        )}
      </div>
    </div>
    </>
  );
};

export default Dashboard;
