import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import './App.css'

// ============================================
// API Service
// ============================================
const API_BASE_URL = 'http://localhost:5000/api'

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed')
      }
      
      return data
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  },

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  getCurrentUser() {
    return this.request('/auth/me')
  },

  getGames(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/games${query ? `?${query}` : ''}`)
  },

  getGameById(id) {
    return this.request(`/games/${id}`)
  },

  createGame(gameData) {
    return this.request('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    })
  },

  joinGame(gameId) {
    return this.request(`/games/${gameId}/join`, { method: 'POST' })
  },

  leaveGame(gameId) {
    return this.request(`/games/${gameId}/leave`, { method: 'DELETE' })
  },

  cancelGame(gameId, reason = '') {
    return this.request(`/games/${gameId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    })
  },

  getUserProfile(userId) {
    return this.request(`/users/${userId}/profile`)
  },

  updateUserProfile(userId, data) {
    return this.request(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  getUserHostedGames(userId) {
    return this.request(`/users/${userId}/games/hosting`)
  },

  getUserJoinedGames(userId) {
    return this.request(`/users/${userId}/games/joined`)
  },

  updateUserLocation(userId, locationData) {
    return this.request(`/users/${userId}/location`, {
      method: 'PUT',
      body: JSON.stringify(locationData),
    })
  },
}

// ============================================
// Auth Context & Hook
// ============================================
const AuthContext = React.createContext(null)

const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.getCurrentUser()
        .then(data => {
          if (data.success) {
            setUser(data.user)
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const register = async (userData) => {
    setError(null)
    try {
      const data = await api.register(userData)
      if (data.success) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
        return { success: true, user: data.user }
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const login = async (email, password) => {
    setError(null)
    try {
      const data = await api.login(email, password)
      if (data.success) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
        return { success: true, user: data.user }
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const updateProfile = async (userId, data) => {
    try {
      const result = await api.updateUserProfile(userId, data)
      if (result.success) {
        setUser(result.user)
        return { success: true, user: result.user }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// Toast Notification Component
// ============================================
const ToastContext = React.createContext(null)

const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const showToast = (type, message, duration = 5000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message, duration }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
    return id
  }

  const success = (msg, dur) => showToast('success', msg, dur)
  const error = (msg, dur) => showToast('error', msg, dur)
  const info = (msg, dur) => showToast('info', msg, dur)
  const warning = (msg, dur) => showToast('warning', msg, dur)

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✗'}
              {toast.type === 'warning' && '⚠'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ============================================
// Loading Spinner Component
// ============================================
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
)

// ============================================
// Protected Route Component
// ============================================
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) return <LoadingSpinner />
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// ============================================
// Home Page Component
// ============================================
const HomePage = () => {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    api.getGames()
      .then(data => {
        if (data.success) {
          setGames(data.games)
        }
      })
      .catch(err => console.error('Failed to fetch games:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>🏃 SportHub</h1>
        <p>Find and join sports games near you!</p>
        {isAuthenticated && (
          <div className="welcome-message">
            Welcome back, {user?.name}! 👋
          </div>
        )}
      </div>

      <div className="games-section">
        <h2>🎮 Upcoming Games</h2>
        
        {loading ? (
          <LoadingSpinner />
        ) : games.length === 0 ? (
          <div className="empty-state">
            <p>No games found. Be the first to create one!</p>
            <Link to="/create-game" className="btn btn-primary">
              Create Your First Game
            </Link>
          </div>
        ) : (
          <div className="games-grid">
            {games.map(game => (
              <div key={game._id} className="game-card">
                <div className="game-card-header">
                  <span className={`game-status status-${game.status}`}>
                    {game.status === 'open' ? '🔓 Open' : game.status === 'full' ? '🔒 Full' : '⛔ Cancelled'}
                  </span>
                  <span className="game-sport">{game.sport}</span>
                </div>
                <div className="game-card-body">
                  <p className="game-date">
                    📅 {new Date(game.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })} at {game.time}
                  </p>
                  <p className="game-location">
                    📍 {game.location?.address || 'Location TBD'}
                  </p>
                  <p className="game-players">
                    👥 {game.currentPlayers}/{game.maxPlayers} players
                  </p>
                  <p className="game-organizer">
                    🎯 Organized by: {game.organizer?.name || 'Unknown'}
                  </p>
                </div>
                <div className="game-card-footer">
                  <Link to={`/games/${game._id}`} className="btn btn-secondary">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Login Page Component
// ============================================
const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, error } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await login(email, password)
    
    if (result.success) {
      toast.success('Logged in successfully!')
      navigate('/dashboard')
    } else {
      toast.error(result.error || 'Login failed')
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p>Log in to your SportHub account</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <p className="auth-link">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

// ============================================
// Register Page Component
// ============================================
const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const { register, error } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    
    setLoading(true)
    
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    })
    
    if (result.success) {
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } else {
      toast.error(result.error || 'Registration failed')
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p>Join the SportHub community</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="John Doe"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
            <small>Must be at least 8 characters</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="auth-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}

// ============================================
// Dashboard Page Component
// ============================================
const DashboardPage = () => {
  const { user } = useAuth()
  const [hostedGames, setHostedGames] = useState([])
  const [joinedGames, setJoinedGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('joined')

  useEffect(() => {
    if (user) {
      Promise.all([
        api.getUserHostedGames(user.id),
        api.getUserJoinedGames(user.id),
      ])
        .then(([hosted, joined]) => {
          if (hosted.success) setHostedGames(hosted.games)
          if (joined.success) setJoinedGames(joined.games)
        })
        .catch(err => console.error('Failed to fetch dashboard data:', err))
        .finally(() => setLoading(false))
    }
  }, [user])

  if (loading) return <LoadingSpinner />

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="welcome-badge">Welcome Back!</div>
        <h1>Hello, {user?.name}!</h1>
        <p>Ready to play some sports? Find and join games near you.</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'joined' ? 'active' : ''}`}
          onClick={() => setActiveTab('joined')}
        >
          Games I've Joined ({joinedGames.length})
        </button>
        <button
          className={`tab ${activeTab === 'hosting' ? 'active' : ''}`}
          onClick={() => setActiveTab('hosting')}
        >
          Games I'm Hosting ({hostedGames.length})
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'joined' && (
          <div className="games-grid">
            {joinedGames.length === 0 ? (
              <div className="empty-state">
                <p>You haven't joined any games yet</p>
                <Link to="/games" className="btn btn-primary">
                  Browse Games
                </Link>
              </div>
            ) : (
              joinedGames.map(game => (
                <GameCard key={game._id} game={game} type="joined" />
              ))
            )}
          </div>
        )}

        {activeTab === 'hosting' && (
          <div className="games-grid">
            {hostedGames.length === 0 ? (
              <div className="empty-state">
                <p>You haven't created any games yet</p>
                <Link to="/create-game" className="btn btn-primary">
                  Create Your First Game
                </Link>
              </div>
            ) : (
              hostedGames.map(game => (
                <GameCard key={game._id} game={game} type="hosting" />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Game Card Component
// ============================================
const GameCard = ({ game, type }) => {
  return (
    <div className="game-card">
      <div className="game-card-header">
        <span className={`game-status status-${game.status}`}>
          {game.status === 'open' ? '🔓 Open' : game.status === 'full' ? '🔒 Full' : '⛔ Cancelled'}
        </span>
        <span className="game-sport">{game.sport}</span>
      </div>
      <div className="game-card-body">
        <p className="game-date">
          📅 {new Date(game.date).toLocaleDateString()} at {game.time}
        </p>
        <p className="game-location">📍 {game.location?.address || 'Location TBD'}</p>
        <p className="game-players">👥 {game.currentPlayers}/{game.maxPlayers} players</p>
      </div>
      <div className="game-card-footer">
        <Link to={`/games/${game._id}`} className="btn btn-secondary">
          View Details
        </Link>
      </div>
    </div>
  )
}

// ============================================
// Game Details Page Component
// ============================================
const GameDetailsPage = () => {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { id } = { id: window.location.pathname.split('/').pop() }

  useEffect(() => {
    api.getGameById(id)
      .then(data => {
        if (data.success) {
          setGame(data.game)
        } else {
          toast.error('Game not found')
          navigate('/games')
        }
      })
      .catch(err => {
        console.error('Failed to fetch game:', err)
        toast.error('Failed to load game')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  const handleJoin = async () => {
    try {
      const result = await api.joinGame(id)
      if (result.success) {
        setGame(result.game)
        toast.success('Successfully joined the game!')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to join game')
    }
  }

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this game?')) return
    
    try {
      const result = await api.leaveGame(id)
      if (result.success) {
        setGame(result.game)
        toast.success('Successfully left the game')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to leave game')
    }
  }

  const handleCancel = async () => {
    const reason = prompt('Why are you cancelling this game?')
    if (reason === null) return
    
    try {
      const result = await api.cancelGame(id, reason)
      if (result.success) {
        setGame(result.game)
        toast.success('Game cancelled successfully')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel game')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!game) return <div>Game not found</div>

  const isOrganizer = user && game.organizer && game.organizer.id === user.id
  const hasJoined = user && game.participants && game.participants.some(p => p.id === user.id)
  const isFull = game.currentPlayers >= game.maxPlayers

  return (
    <div className="game-details-page">
      <div className="game-details-card">
        <div className="game-details-header">
          <h1>{game.sport} Game</h1>
          <div className="game-status-badge">
            <span className={`status-${game.status}`}>
              {game.status === 'open' ? 'Open' : game.status === 'full' ? 'Full' : 'Cancelled'}
            </span>
          </div>
        </div>

        <div className="game-details-info">
          <div className="info-row">
            <span className="info-label">📅 Date & Time:</span>
            <span>{new Date(game.date).toLocaleDateString()} at {game.time}</span>
          </div>
          <div className="info-row">
            <span className="info-label">📍 Location:</span>
            <span>{game.location?.address}</span>
          </div>
          <div className="info-row">
            <span className="info-label">👥 Players:</span>
            <span>{game.currentPlayers} / {game.maxPlayers}</span>
          </div>
          <div className="info-row">
            <span className="info-label">🎯 Organizer:</span>
            <span>{game.organizer?.name}</span>
          </div>
          {game.description && (
            <div className="info-row">
              <span className="info-label">📝 Description:</span>
              <p>{game.description}</p>
            </div>
          )}
        </div>

        <div className="participants-section">
          <h3>Participants ({game.participants?.length || 0})</h3>
          <ul className="participants-list">
            {game.participants?.map(p => (
              <li key={p.id}>
                {p.name} {p.id === game.organizer?.id && '(Organizer)'}
              </li>
            ))}
          </ul>
        </div>

        <div className="game-details-actions">
          {isAuthenticated ? (
            <>
              {isOrganizer ? (
                <button
                  onClick={handleCancel}
                  disabled={game.status === 'cancelled'}
                  className="btn btn-danger"
                >
                  Cancel Game
                </button>
              ) : hasJoined ? (
                <button onClick={handleLeave} className="btn btn-warning">
                  Leave Game
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={isFull || game.status === 'cancelled'}
                  className="btn btn-primary"
                >
                  {isFull ? 'Game Full' : game.status === 'cancelled' ? 'Game Cancelled' : 'Join Game'}
                </button>
              )}
            </>
          ) : (
            <p>Please <Link to="/login">log in</Link> to join this game</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Create Game Page Component
// ============================================
const CreateGamePage = () => {
  const [formData, setFormData] = useState({
    sport: '',
    date: '',
    time: '',
    location: {
      address: '',
      coordinates: [0, 0],
    },
    maxPlayers: 10,
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleLocationChange = (e) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        address: e.target.value,
      },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.sport) {
      toast.error('Please select a sport')
      return
    }
    if (!formData.date) {
      toast.error('Please select a date')
      return
    }
    if (!formData.time) {
      toast.error('Please select a time')
      return
    }
    if (!formData.location.address) {
      toast.error('Please enter a location')
      return
    }
    
    setLoading(true)
    
    try {
      const result = await api.createGame(formData)
      if (result.success) {
        toast.success('Game created successfully!')
        navigate(`/games/${result.game._id}`)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  const sports = [
    'football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other'
  ]

  return (
    <div className="create-game-page">
      <div className="create-game-card">
        <h2>Create New Game</h2>
        <p>Fill out the details below to create a game</p>

        <form onSubmit={handleSubmit} className="create-game-form">
          <div className="form-group">
            <label htmlFor="sport">Sport *</label>
            <select
              id="sport"
              name="sport"
              value={formData.sport}
              onChange={handleChange}
              required
            >
              <option value="">Select a sport</option>
              {sports.map(sport => (
                <option key={sport} value={sport}>
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time *</label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location Address *</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location.address}
              onChange={handleLocationChange}
              placeholder="Enter the game location"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxPlayers">Maximum Players *</label>
            <input
              type="number"
              id="maxPlayers"
              name="maxPlayers"
              value={formData.maxPlayers}
              onChange={handleChange}
              min="2"
              max="22"
              required
            />
            <small>You count as the first player</small>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Add details about skill level, equipment needed, etc."
              maxLength="500"
            />
            <small>{formData.description.length}/500 characters</small>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Creating Game...' : 'Create Game'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================
// Profile Page Component
// ============================================
const ProfilePage = () => {
  const { user, updateProfile } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skillLevel: 'beginner',
    sportsPreferences: [],
  })
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        skillLevel: user.skillLevel || 'beginner',
        sportsPreferences: user.sportsPreferences || [],
      })
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSportToggle = (sport) => {
    setFormData(prev => ({
      ...prev,
      sportsPreferences: prev.sportsPreferences.includes(sport)
        ? prev.sportsPreferences.filter(s => s !== sport)
        : [...prev.sportsPreferences, sport],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await updateProfile(user.id, formData)
    
    if (result.success) {
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } else {
      toast.error(result.error || 'Failed to update profile')
    }
    
    setLoading(false)
  }

  const sports = ['football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other']

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
        </div>

        {!isEditing ? (
          <>
            <div className="profile-info">
              <div className="info-section">
                <h3>About Me</h3>
                <p>{user?.bio || 'No bio added yet'}</p>
              </div>
              
              <div className="info-section">
                <h3>Skill Level</h3>
                <p>{user?.skillLevel || 'Not specified'}</p>
              </div>
              
              <div className="info-section">
                <h3>Sports I Play</h3>
                {user?.sportsPreferences?.length > 0 ? (
                  <div className="sports-tags">
                    {user.sportsPreferences.map(sport => (
                      <span key={sport} className="sport-tag">{sport}</span>
                    ))}
                  </div>
                ) : (
                  <p>No sports selected</p>
                )}
              </div>
            </div>
            
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="3"
                placeholder="Tell others about yourself..."
                maxLength="500"
              />
            </div>

            <div className="form-group">
              <label htmlFor="skillLevel">Skill Level</label>
              <select
                id="skillLevel"
                name="skillLevel"
                value={formData.skillLevel}
                onChange={handleChange}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="professional">Professional</option>
              </select>
            </div>

            <div className="form-group">
              <label>Sports Preferences</label>
              <div className="sports-checkboxes">
                {sports.map(sport => (
                  <label key={sport} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.sportsPreferences.includes(sport)}
                      onChange={() => handleSportToggle(sport)}
                    />
                    {sport.charAt(0).toUpperCase() + sport.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ============================================
// Browse Games Page Component
// ============================================
const BrowseGamesPage = () => {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    sport: '',
    search: '',
  })

  useEffect(() => {
    fetchGames()
  }, [filters.sport])

  const fetchGames = async () => {
    setLoading(true)
    const params = {}
    if (filters.sport && filters.sport !== 'all') {
      params.sport = filters.sport
    }
    
    try {
      const data = await api.getGames(params)
      if (data.success) {
        setGames(data.games)
      }
    } catch (err) {
      console.error('Failed to fetch games:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const clearFilters = () => {
    setFilters({ sport: '', search: '' })
  }

  const sports = ['all', 'football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other']

  return (
    <div className="browse-games-page">
      <div className="filters-section">
        <h2>Find Games</h2>
        <div className="filters-bar">
          <select
            name="sport"
            value={filters.sport}
            onChange={handleFilterChange}
            className="filter-select"
          >
            {sports.map(sport => (
              <option key={sport} value={sport}>
                {sport === 'all' ? 'All Sports' : sport.charAt(0).toUpperCase() + sport.slice(1)}
              </option>
            ))}
          </select>
          
          {filters.sport && (
            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="games-section">
        {loading ? (
          <LoadingSpinner />
        ) : games.length === 0 ? (
          <div className="empty-state">
            <p>No games found matching your criteria</p>
            <Link to="/create-game" className="btn btn-primary">
              Create a Game
            </Link>
          </div>
        ) : (
          <div className="games-grid">
            {games.map(game => (
              <GameCard key={game._id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Navigation Bar Component
// ============================================
const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🏃 SportHub
        </Link>
        
        <div className="nav-links">
          <Link to="/games" className="nav-link">Browse Games</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/create-game" className="nav-link">Create Game</Link>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={handleLogout} className="nav-link btn-logout">
                Logout ({user?.name})
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link btn-primary-small">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ============================================
// Main App Component
// ============================================
function App() {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    fetch('http://localhost:5000/health')
      .then(res => res.json())
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('disconnected'))
  }, [])

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="app">
          <Navbar />
          
          <main className="main-content">
            {backendStatus === 'disconnected' && (
              <div className="backend-warning">
                ⚠️ Cannot connect to backend server. Please make sure the backend is running on port 5000.
              </div>
            )}
            
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/games" element={<BrowseGamesPage />} />
              <Route path="/games/:id" element={<GameDetailsPage />} />
              <Route path="/create-game" element={
                <ProtectedRoute>
                  <CreateGamePage />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          
          <footer className="footer">
            <p>© 2024 SportHub. Connect with local sports players.</p>
          </footer>
        </div>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App