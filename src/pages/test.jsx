import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import './ProfileEdit.css';

const allSkills = [
  'Web Development', 'Graphic Design', 'Digital Marketing', 
  'Photography', 'Video Editing', 'Content Writing',
  'Data Analysis', 'UI/UX Design', 'Public Speaking',
  'Music Production', 'Language Teaching', 'Cooking'
];

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    skillsToTeach: [],
    skillsToLearn: []
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [skillType, setSkillType] = useState('teach');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!auth.currentUser) {
          navigate('/login');
          return;
        }

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData({
            displayName: userData.displayName || auth.currentUser.displayName || '',
            bio: userData.bio || '',
            location: userData.location || '',
            skillsToTeach: userData.skillsToTeach || [],
            skillsToLearn: userData.skillsToLearn || []
          });
          setProfilePicUrl(userData.photoURL || auth.currentUser.photoURL || '');
        } else {

          await setDoc(userRef, {
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName || '',
            email: auth.currentUser.email,
            createdAt: new Date(),
            credits: 10
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load profile data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;


    if (!file.type.match('image.*')) {
      setError('Please select a valid image file (JPEG, PNG, etc.)');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicUrl(event.target.result);
      };
      reader.readAsDataURL(file);
      setProfilePic(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSkillAdd = () => {
    if (!newSkill) {
      setError('Please select a skill to add');
      return;
    }

    const targetSkills = skillType === 'teach' ? 'skillsToTeach' : 'skillsToLearn';
    
    if (formData[targetSkills].includes(newSkill)) {
      setError('This skill is already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      [targetSkills]: [...prev[targetSkills], newSkill]
    }));
    setNewSkill('');
    setError('');
  };

  const handleSkillRemove = (skill, type) => {
    const targetSkills = type === 'teach' ? 'skillsToTeach' : 'skillsToLearn';
    setFormData(prev => ({
      ...prev,
      [targetSkills]: prev[targetSkills].filter(s => s !== skill)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let photoURL = profilePicUrl;


      if (profilePic) {
        try {
          const storageRef = ref(storage, `profilePics/${auth.currentUser.uid}`);
          await uploadBytes(storageRef, profilePic);
          photoURL = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error('Failed to upload profile picture. Please try again.');
        }
      }


      try {
        await updateProfile(auth.currentUser, {
          displayName: formData.displayName,
          photoURL: photoURL
        });
      } catch (authError) {
        console.error('Error updating auth profile:', authError);
        throw new Error('Failed to update profile. Please try again.');
      }


      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, {
          ...formData,
          photoURL,
          lastUpdated: new Date(),
          email: auth.currentUser.email
        }, { merge: true });
      } catch (firestoreError) {
        console.error('Error updating Firestore:', firestoreError);
        throw new Error('Failed to save profile data. Please try again.');
      }


      navigate('/home', { state: { profileUpdated: true } });
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="profile-edit-container">
      <h1>Edit Profile</h1>
      
      {error && (
        <div className="error-message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Profile Picture Section */}
        <div className="profile-pic-section">
          <div className="profile-pic-wrapper">
            {profilePicUrl ? (
              <img src={profilePicUrl} alt="Profile" className="profile-pic" />
            ) : (
              <div className="profile-pic-placeholder">
                {formData.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {uploading && <div className="upload-overlay">Uploading...</div>}
          </div>
          <label className="upload-btn">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            {uploading ? 'Uploading...' : 'Change Photo'}
          </label>
        </div>

        {/* Basic Info Section */}
        <div className="form-section">
          <h2>Basic Information</h2>
          <div className="form-group">
            <label>Display Name *</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              required
              minLength="2"
              maxLength="30"
            />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows="4"
              placeholder="Tell others about yourself..."
              maxLength="500"
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="City, Country"
            />
          </div>
        </div>

        {/* Skills Section */}
        <div className="form-section">
          <h2>Your Skills</h2>
          <div className="skills-controls">
            <select 
              value={skillType}
              onChange={(e) => setSkillType(e.target.value)}
              className="skill-type-select"
              disabled={loading}
            >
              <option value="teach">I can teach</option>
              <option value="learn">I want to learn</option>
            </select>
            <select
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              className="skill-select"
              disabled={loading}
            >
              <option value="">Select a skill</option>
              {allSkills
                .filter(skill => !formData.skillsToTeach.includes(skill) && !formData.skillsToLearn.includes(skill))
                .map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
            </select>
            <button 
              type="button" 
              onClick={handleSkillAdd}
              disabled={!newSkill || loading}
              className="add-skill-btn"
            >
              Add Skill
            </button>
          </div>

          <div className="skills-lists">
            <div className="skills-column">
              <h3>Teaching Skills</h3>
              {formData.skillsToTeach.length > 0 ? (
                <ul>
                  {formData.skillsToTeach.map((skill, index) => (
                    <li key={`teach-${index}`}>
                      {skill}
                      <button 
                        type="button"
                        onClick={() => handleSkillRemove(skill, 'teach')}
                        className="remove-skill-btn"
                        disabled={loading}
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-skills">No teaching skills added</p>
              )}
            </div>

            <div className="skills-column">
              <h3>Learning Skills</h3>
              {formData.skillsToLearn.length > 0 ? (
                <ul>
                  {formData.skillsToLearn.map((skill, index) => (
                    <li key={`learn-${index}`}>
                      {skill}
                      <button 
                        type="button"
                        onClick={() => handleSkillRemove(skill, 'learn')}
                        className="remove-skill-btn"
                        disabled={loading}
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-skills">No learning skills added</p>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button"
            onClick={() => navigate('/home')}
            className="cancel-btn"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="save-btn"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}




//next file


