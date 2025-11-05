import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import Chat from '../components/Chat';
import Notes from '../components/Notes';
import Poll from '../components/Poll';
import SidebarTabs from '../components/SidebarTabs';
import { 
  Mic, MicOff, Video, VideoOff, 
  ScreenShare, ScreenShareOff, LogOut, 
  MessageSquare, X 
} from 'lucide-react';

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

const PreJoinLobby = ({ displayName, setDisplayName, handleJoin }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6">Ready to join?</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">Your Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full p-2 mt-1 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleJoin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition duration-300"
          >
            Join Meeting
          </button>
        </div>
      </div>
    </div>
  );
};

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const socketRef = useRef(null);
  const peerConnections = useRef({});
  const localCameraStreamRef = useRef(null); 
  const screenShareStreamRef = useRef(null);

  const [hasJoined, setHasJoined] = useState(false);
  const [displayName, setDisplayName] = useState(
    currentUser.displayName || currentUser.email.split('@')[0] || 'Guest'
  );
  const [participants, setParticipants] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [sharingSocketId, setSharingSocketId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!hasJoined) return;

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const socket = io(serverUrl);
    socketRef.current = socket;

    const createPeerConnection = (targetSocketId, stream) => {
      const pc = new RTCPeerConnection(servers);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        setRemoteStreams(prev => ({ ...prev, [targetSocketId]: event.streams[0] }));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, target: targetSocketId });
        }
      };

      peerConnections.current[targetSocketId] = pc;
      return pc;
    };

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localCameraStreamRef.current = stream;

        socket.emit('join-room', { roomId, displayName });

        const handleUserJoined = (payload) => {
          const { socketId, displayName: newUserName } = payload;
          console.log(`User ${newUserName} (${socketId}) joined`);
          const pc = createPeerConnection(socketId, stream);
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              socket.emit('offer', { target: socketId, sdp: pc.localDescription });
            });
        };

        const handleOffer = (payload) => {
          console.log(`Received offer from ${payload.callerId}, creating answer`);
          const pc = createPeerConnection(payload.callerId, stream);
          pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            .then(() => pc.createAnswer())
            .then((answer) => pc.setLocalDescription(answer))
            .then(() => {
              socket.emit('answer', { target: payload.callerId, sdp: pc.localDescription });
            });
        };

        socket.on('user-joined', handleUserJoined);
        socket.on('offer', handleOffer);

      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    startMedia();

    socket.on('update-participants', (participantList) => {
      setParticipants(participantList);
    });
    socket.on('answer', (payload) => {
      const pc = peerConnections.current[payload.calleeId];
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });
    socket.on('ice-candidate', (payload) => {
      const pc = peerConnections.current[payload.senderId];
      if (pc && payload.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });
    socket.on('user-left', (socketId) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[socketId];
        return newStreams;
      });
      if (sharingSocketId === socketId) {
        setSharingSocketId(null);
      }
    });
    socket.on('user-started-sharing', (socketId) => setSharingSocketId(socketId));
    socket.on('user-stopped-sharing', () => setSharingSocketId(null));

    return () => {
      if (localCameraStreamRef.current) {
        localCameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
      socket.disconnect();
    };
  }, [hasJoined, roomId, displayName, navigate]); 

  const toggleMute = () => {
    if (!localCameraStreamRef.current) return;
    const newMuteState = !isMuted;
    localCameraStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !newMuteState;
    });
    setIsMuted(newMuteState);
  };

  const toggleCamera = () => {
    if (!localCameraStreamRef.current) return;
    const videoTrack = localCameraStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  const leaveRoom = () => navigate('/');

  const findVideoSender = (pc) => pc.getSenders().find(sender => sender.track?.kind === 'video');

  const stopScreenShare = () => {
    if (!screenShareStreamRef.current) return;
    socketRef.current.emit('stop-share');
    screenShareStreamRef.current.getTracks().forEach(track => track.stop());
    screenShareStreamRef.current = null;

    const cameraVideoTrack = localCameraStreamRef.current.getVideoTracks()[0];
    Object.values(peerConnections.current).forEach(pc => {
      const videoSender = findVideoSender(pc);
      if (videoSender && cameraVideoTrack) {
        videoSender.replaceTrack(cameraVideoTrack);
      }
    });
    setLocalStream(localCameraStreamRef.current);
    setIsScreenSharing(false);
    if (cameraVideoTrack) {
      setIsCameraOff(!cameraVideoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        socketRef.current.emit('start-share');
        screenShareStreamRef.current = screenStream;
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        const audioTrack = screenStream.getAudioTracks()[0] || localCameraStreamRef.current.getAudioTracks()[0];

        Object.values(peerConnections.current).forEach(pc => {
          const videoSender = findVideoSender(pc);
          if (videoSender) {
            videoSender.replaceTrack(screenVideoTrack);
          }
        });

        setLocalStream(new MediaStream([screenVideoTrack, audioTrack]));
        setIsScreenSharing(true);
        screenVideoTrack.onended = stopScreenShare;
      } catch (err) {
        console.error("Error starting screen share:", err);
      }
    }
  };

  const handleJoin = () => {
    if (displayName.trim()) {
      setHasJoined(true);
    }
  };

  if (!hasJoined) {
    return (
      <PreJoinLobby 
        displayName={displayName}
        setDisplayName={setDisplayName}
        handleJoin={handleJoin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col lg:flex-row gap-4">
      
      {/* Main Content (Videos) */}
      <div className="flex-1">
         <h1 className="text-2xl font-bold mb-4">Room: {roomId}</h1>
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={toggleMute} className={`p-3 rounded-full font-semibold ${isMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-red-600'}`}>
            {isMuted ? <MicOff /> : <Mic />}
          </button>
          <button onClick={toggleCamera} className={`p-3 rounded-full font-semibold ${isCameraOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-red-600'}`}>
            {isCameraOff ? <VideoOff /> : <Video />}
          </button>
          <button onClick={toggleScreenShare} disabled={sharingSocketId && sharingSocketId !== socketRef.current?.id} className={`p-3 rounded-full font-semibold ${isScreenSharing ? 'bg-red-600' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-600 disabled:cursor-not-allowed`}>
            {isScreenSharing ? <ScreenShareOff /> : <ScreenShare />}
          </button>
          <button onClick={leaveRoom} className="p-3 rounded-full font-semibold bg-red-700 hover:bg-red-800">
            <LogOut />
          </button>
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 rounded-full font-semibold bg-brand hover:bg-brand-dark lg:hidden">
            <MessageSquare />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden">
            {localStream ? <VideoPlayer stream={localStream} isMuted={true} /> : <div className="w-full h-full flex items-center justify-center p-4"><p>Loading your video...</p></div>}
            <p className="absolute bottom-2 left-2 p-1 bg-black bg-opacity-50 rounded text-sm">
              {displayName} (You)
            </p>
          </div>
          {Object.entries(remoteStreams).map(([socketId, stream]) => (
            <div key={socketId} className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden">
              <VideoPlayer stream={stream} isMuted={false} />
              <p className="absolute bottom-2 left-2 p-1 bg-black bg-opacity-50 rounded text-sm">
                {participants[socketId] || 'Guest'}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Sidebar (Poll, Chat & Notes) */}
      <div className={`lg:w-1/3 lg:flex lg:flex-col lg:relative lg:h-auto ${isSidebarOpen ? 'fixed inset-0 z-50 bg-gray-900 p-4 flex flex-col' : 'hidden'}`} style={isSidebarOpen ? { height: '100vh' } : {}}>
        <div className="flex justify-between items-center mb-2 lg:hidden">
          <h2 className="text-xl font-bold">Menu</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-white bg-red-600 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 min-h-0">
          {socketRef.current && (
            <SidebarTabs>
              <Poll 
                socket={socketRef.current} 
                selfSocketId={socketRef.current?.id}
              />
              <Chat 
                socket={socketRef.current} 
                roomId={roomId}
                participants={participants}
              />
              <Notes socket={socketRef.current} />
            </SidebarTabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;