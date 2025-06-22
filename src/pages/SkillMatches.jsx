import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import LoadingSpinner from './LoadingSpinner';
import './SkillMatches.css';

export default function SkillMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        if (!auth.currentUser) return;
        

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          setError('Profile not found');
          return;
        }

        const userData = userSnap.data();
        const skillsToTeach = userData.skillsToTeach || [];
        const skillsToLearn = userData.skillsToLearn || [];

        if (skillsToTeach.length === 0 && skillsToLearn.length === 0) {
          setMatches([]);
          return;
        }


        const q = query(
          collection(db, 'users'),
          where('uid', '!=', auth.currentUser.uid)
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
              canLearnFromYou
            });
          }
        });


        potentialMatches.sort((a, b) => b.matchScore - a.matchScore);
        setMatches(potentialMatches);
        
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError('Failed to load matches. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="skill-matches-container">
      <h2>Skill Matches</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {matches.length === 0 ? (
        <div className="empty-state">
          <p>No matches found yet. Update your skills to find potential exchanges!</p>
        </div>
      ) : (
        <div className="matches-grid">
          {matches.map(match => (
            <div key={match.id} className="match-card">
              <div className="match-header">
                {match.photoURL ? (
                  <img src={match.photoURL} alt={match.displayName} className="match-avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    {match.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <h3>{match.displayName || 'Anonymous User'}</h3>
                <p className="location">{match.location || 'Location not specified'}</p>
              </div>
              
              <div className="match-skills">
                {match.canTeachYou.length > 0 && (
                  <div className="skill-group">
                    <h4>Can teach you:</h4>
                    <ul>
                      {match.canTeachYou.map((skill, i) => (
                        <li key={`teach-${i}`}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {match.canLearnFromYou.length > 0 && (
                  <div className="skill-group">
                    <h4>Wants to learn from you:</h4>
                    <ul>
                      {match.canLearnFromYou.map((skill, i) => (
                        <li key={`learn-${i}`}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="match-actions">
                <button className="primary-btn">
                  Request Exchange
                </button>
                <button className="secondary-btn">
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}