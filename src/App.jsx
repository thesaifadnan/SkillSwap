import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProfileEdit from './pages/ProfileEdit';
import LoadingSpinner from './components/LoadingSpinner';

export default function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) return <LoadingSpinner />;

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/home" /> : <LandingPage />} 
        />
        <Route 
          path="/login" 
          element={user ? <Navigate to="/home" /> : <Login />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/home" /> : <Signup />} 
        />


        <Route 
          path="/home" 
          element={user ? <Home /> : <Navigate to="/" />} 
        />
        <Route 
          path="/profile/edit" 
          element={user ? <ProfileEdit /> : <Navigate to="/" />} 
        />


        <Route path="*" element={<Navigate to={user ? "/home" : "/"} />} />
      </Routes>
    </BrowserRouter>
  );
}