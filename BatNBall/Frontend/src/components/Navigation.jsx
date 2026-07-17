import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Home, User, Users, LogOut, Calendar, Menu, X, Trophy } from 'lucide-react';

const Navigation = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={18} /> },
    { name: 'New Match', path: '/matches/new', icon: <Calendar size={18} /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={18} /> },
    { name: 'Edit Profile', path: '/profile', icon: <User size={18} /> },
    { name: 'Teams', path: '/teams', icon: <Users size={18} /> }
  ];

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <nav className="nav-container glass">
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={24} style={{ color: 'var(--secondary-color)' }} />
        <span style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.2px' }}>
          Bat<span style={{ color: 'var(--accent-color)' }}>N</span>Ball
        </span>
      </div>

      {/* Desktop Links */}
      <div className="nav-links-desktop">
        {user && navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: isActive ? 'var(--secondary-color)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'rgba(29, 79, 42, 0.08)' : 'transparent',
                transition: 'var(--transition)'
              }}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Right User Actions (Profile & Logout / Sign In) */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {user.profile_picture_url ? (
                <img 
                  src={user.profile_picture_url} 
                  alt="Avatar" 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                />
              ) : (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--dominant-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.8rem'
                }}>
                  {user.phone_number ? user.phone_number.slice(-2) : 'U'}
                </div>
              )}
            </div>
            
            <button 
              onClick={logout} 
              style={{
                padding: '0.4rem',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <Link 
            to="/login" 
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#fff',
              backgroundColor: 'var(--secondary-color)',
              textDecoration: 'none',
              transition: 'var(--transition)'
            }}
          >
            Sign In
          </Link>
        )}

        {/* Mobile Menu Hamburger Toggle */}
        {user && (
          <button 
            className="nav-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Links Dropdown Drawer */}
      {user && (
        <div className={`nav-links-mobile ${menuOpen ? 'open' : ''}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={handleLinkClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: isActive ? 'var(--secondary-color)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'rgba(29, 79, 42, 0.08)' : 'transparent',
                  transition: 'var(--transition)'
                }}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};

export default Navigation;
