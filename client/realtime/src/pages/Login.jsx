
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

import { useAuth } from '../context/AuthContext';

const Login = () => {
 const { currentUser } = useAuth();
 const navigate = useNavigate();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 if (currentUser) {
   navigate('/');
 }
 }, [currentUser, navigate]);

 const handleGoogleLogin = async () => {
 setError('');
 try {
 await signInWithPopup(auth, googleProvider);
 navigate('/'); 
  } catch (error) {
  console.error("Error during Google sign-in:", error);
 setError(error.message);
 }
};

 const handleLogin = async (e) => {
 e.preventDefault();
 setError('');
 setLoading(true);
 try {
 await signInWithEmailAndPassword(auth, email, password);
 navigate('/');
 } catch (err) {
 setError('Failed to log in. Please check your email and password.');
 console.error("Login error:", err);
 }
 setLoading(false);
 };

if (currentUser) {
 return <Navigate to="/" replace />;
 }

 return (
 <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">

 <div className="w-full max-w-md">

 <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
 <span className="text-white text-4xl font-bold">N</span>
 </div>

 <div className="p-8 bg-gray-800 rounded-lg shadow-lg">
 <h1 className="text-3xl font-bold mb-6 text-center">
 Log In to Nexus
 </h1>
 <form onSubmit={handleLogin} className="space-y-4">
 <div>
  <label className="block text-sm font-medium text-gray-400">Email</label>
 <input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
 placeholder="you@example.com"
 required
 className="w-full p-2 mt-1 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
  <label className="block text-sm font-medium text-gray-400">Password</label>
 <input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 required
 className="w-full p-2 mt-1 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 {error && <p className="text-red-400 text-sm text-center">{error}</p>}

 <div className="pt-2">
 <button
 disabled={loading}
 type="submit"
 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 disabled:bg-blue-400"
 >
 {loading ? 'Logging In...' : 'Log In'}
 </button>
 </div>
 </form>

 <div className="my-6 flex items-center">
 <div className="flex-grow border-t border-gray-600"></div>
 <span className="flex-shrink mx-4 text-gray-400">OR</span>
 <div className="flex-grow border-t border-gray-600"></div>
 </div>

 <button
  onClick={handleGoogleLogin}
  className="w-full flex items-center justify-center bg-white text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-200 transition duration-300"
 >
 <span className="ml-2">Sign in with Google</span>
 </button>

 <div className="mt-6 text-center">
  <p className="text-gray-400">
  Don't have an account?{' '}
  <Link to="/signup" className="text-blue-400 hover:underline">
 Sign Up
 </Link>
 </p> 
 </div>
 </div>
 </div>
</div>
  );
};

export default Login;