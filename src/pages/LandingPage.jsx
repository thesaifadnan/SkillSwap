import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-container">
      <header className="hero-section">
        <h1>SkillSwap</h1>
        <p className="tagline">Exchange skills, grow together</p>
        <div className="cta-buttons">
          <Link to="/signup" className="cta-primary">Get Started</Link>
          <Link to="/login" className="cta-secondary">Login</Link>
        </div>
      </header>

      <section className="features">
        <div className="feature-card">
          <div className="icon">💡</div>
          <h3>Learn New Skills</h3>
          <p>Find people to teach you what you want to learn</p>
        </div>
        <div className="feature-card">
          <div className="icon">🔄</div>
          <h3>Teach Others</h3>
          <p>Share your knowledge and earn credits</p>
        </div>
        <div className="feature-card">
          <div className="icon">🌐</div>
          <h3>Build Community</h3>
          <p>Connect with like-minded learners</p>
        </div>
      </section>
    </div>
  );
}