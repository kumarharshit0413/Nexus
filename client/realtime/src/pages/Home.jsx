import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, signOut } from '../firebase';
import { v4 as uuidV4 } from 'uuid';
import { Video, LogOut, Keyboard } from 'lucide-react';

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim() === '') return;
    navigate(`/room/${roomId}`);
  };

  const handleNewMeeting = () => {
    const newRoomId = uuidV4();
    navigate(`/room/${newRoomId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      
      {currentUser && (
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <span className="text-gray-300 text-base hidden sm:block"> 
            {currentUser.displayName || currentUser.email}
          </span>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 bg-gray-700 hover:bg-red-600 rounded-full transition duration-300"
          >
            <LogOut size={20} />
          </button>
        </div>
      )}

      <div className="w-full max-w-md">

        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white text-4xl font-bold">N</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-10 text-center">
          Nexus
        </h1>

        {currentUser ? (
          <div className="flex flex-col gap-4">
            
            <button 
              onClick={handleNewMeeting} 
              className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 text-lg rounded-lg transition duration-300 shadow-lg"
            >
              <Video size={24} />
              Start a New Meeting
            </button>

            <div className="flex items-center">
              <div className="flex-grow border-t border-gray-700"></div>
              <span className="flex-shrink mx-4 text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-700"></div>
            </div>

            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <div className="relative flex-1">
                <Keyboard size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter a code or link"
                  className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="p-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition duration-300"
              >
                Join
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg text-gray-400 mb-8">
              Please log in or sign up to continue
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/login">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300">
                  Login
                </button>
              </Link>
              <Link to="/signup">
                <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300">
                  Sign Up
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;