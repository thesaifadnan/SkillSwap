import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagesSection from './MessagesSection';
import './Home.css';

export default function Home() {
  const [user, loading, error] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('discover');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserData();
  }, [user]);

  const fetchSkillMatches = async () => {
    if (!user) return;
    
    setLoadingMatches(true);
    setMatchError('');
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        setMatchError('Complete your profile to find matches');
        return;
      }

      const userData = userDoc.data();
      const skillsToTeach = userData.skillsToTeach || [];
      const skillsToLearn = userData.skillsToLearn || [];

      if (skillsToTeach.length === 0 && skillsToLearn.length === 0) {
        setMatchError('Add skills you can teach and want to learn to find matches');
        setMatches([]);
        return;
      }

      const q = query(
        collection(db, 'users'),
        where('uid', '!=', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const potentialMatches = [];
      
      querySnapshot.forEach((doc) => {
        const otherUser = doc.data();
        const canTeachYou = otherUser.skillsToTeach?.filter(skill => 
          skillsToLearn.includes(skill)) || [];
        const canLearnFromYou = otherUser.skillsToLearn?.filter(skill => 
          skillsToTeach.includes(skill)) || [];
        
        if (canTeachYou.length > 0 || canLearnFromYou.length > 0) {
          potentialMatches.push({
            id: doc.id,
            ...otherUser,
            matchScore: canTeachYou.length + canLearnFromYou.length,
            canTeachYou,
            canLearnFromYou,
            location: otherUser.location || 'Not specified'
          });
        }
      });

      potentialMatches.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(potentialMatches);
      
    } catch (err) {
      console.error('Error fetching matches:', err);
      setMatchError('Failed to load matches. Please try again.');
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchSkillMatches();
    }
  }, [activeTab, user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const handleRequestExchange = (matchId) => {
    console.log('Requesting exchange with:', matchId);
    // Implement exchange request logic
  };

  const startNewConversation = (userId) => {
    setActiveTab('messages');
    // This would typically be handled by the MessagesSection
    console.log('Starting conversation with:', userId);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">Error loading user data</div>;
  if (!user) return <Navigate to="/" />;

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="profile-summary">
          {userData?.photoURL ? (
            <img 
              src={userData.photoURL} 
              alt="Profile" 
              className="profile-pic"
              onClick={handleEditProfile}
            />
          ) : (
            <div 
              className="profile-pic placeholder"
              onClick={handleEditProfile}
            >
              {userData?.displayName?.charAt(0) || 'U'}
            </div>
          )}
          <div className="profile-info">
            <h2>Welcome, {userData?.displayName || 'User'}</h2>
            <p className="credits">
              <span className="credits-icon">🪙</span>
              SkillCredits: {userData?.credits || 0}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={handleEditProfile}
            className="edit-profile-btn"
          >
            Edit Profile
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Sign Out
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button 
          className={`tab ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          Discover
        </button>
        <button 
          className={`tab ${activeTab === 'my-skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-skills')}
        >
          My Skills
        </button>
        <button 
          className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
      </nav>

      <main className="content">
        {activeTab === 'discover' && (
          <section className="discover-section">
            <div className="section-header">
              <h3>Skill Matches</h3>
              <button 
                onClick={fetchSkillMatches}
                className="refresh-btn"
                disabled={loadingMatches}
              >
                {loadingMatches ? 'Refreshing...' : 'Refresh Matches'}
              </button>
            </div>
            
            {matchError && <div className="error-message">{matchError}</div>}
            
            {loadingMatches ? (
              <LoadingSpinner />
            ) : matches.length > 0 ? (
              <div className="matches-grid">
                {matches.map((match) => (
                  <div key={match.id} className="match-card">
                    <div className="match-header">
                      {match.photoURL ? (
                        <img 
                          src={match.photoURL} 
                          alt={match.displayName} 
                          className="match-avatar"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          {match.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="match-user-info">
                        <h4>{match.displayName || 'Anonymous User'}</h4>
                        <p className="location">
                          <span className="location-icon">📍</span>
                          {match.location}
                        </p>
                      </div>
                    </div>
                    
                    <div className="match-skills">
                      {match.canTeachYou.length > 0 && (
                        <div className="skill-group">
                          <h5>Can teach you:</h5>
                          <div className="skills-tags">
                            {match.canTeachYou.map((skill, i) => (
                              <span key={`teach-${i}`} className="skill-tag">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {match.canLearnFromYou.length > 0 && (
                        <div className="skill-group">
                          <h5>Wants to learn from you:</h5>
                          <div className="skills-tags">
                            {match.canLearnFromYou.map((skill, i) => (
                              <span key={`learn-${i}`} className="skill-tag">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="match-actions">
                      <button 
                        className="primary-btn"
                        onClick={() => handleRequestExchange(match.id)}
                      >
                        Request Exchange
                      </button>
                      <button 
                        className="secondary-btn"
                        onClick={() => startNewConversation(match.id)}
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No matches found yet. Update your skills to discover potential exchanges!</p>
                <button 
                  onClick={handleEditProfile}
                  className="update-profile-btn"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'my-skills' && (
          <section className="skills-section">
            <h3>My Skill Profile</h3>
            <div className="skills-container">
              <div className="skills-column">
                <h4>Skills I Can Teach</h4>
                {userData?.skillsToTeach?.length > 0 ? (
                  <ul className="skills-list">
                    {userData.skillsToTeach.map((skill, index) => (
                      <li key={`teach-${index}`}>
                        <span className="skill-name">{skill}</span>
                        <span className="skill-badge teaching">Teaching</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-skills">No teaching skills added yet</p>
                )}
              </div>
              
              <div className="skills-column">
                <h4>Skills I Want to Learn</h4>
                {userData?.skillsToLearn?.length > 0 ? (
                  <ul className="skills-list">
                    {userData.skillsToLearn.map((skill, index) => (
                      <li key={`learn-${index}`}>
                        <span className="skill-name">{skill}</span>
                        <span className="skill-badge learning">Learning</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-skills">No learning skills added yet</p>
                )}
              </div>
            </div>
            <button 
              onClick={handleEditProfile}
              className="edit-skills-btn"
            >
              Edit Skills
            </button>
          </section>
        )}

        {activeTab === 'messages' && <MessagesSection />}
      </main>
    </div>
  );
}