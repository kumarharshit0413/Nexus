require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

if (!process.env.GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is not set in /server/.env file");
}
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

const socketUserMap = {};
const roomSharingState = {};
const roomPollState = {};

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.post('/api/summarize', async (req, res) => {
  try {
    const { chatHistory } = req.body;
    if (!chatHistory || chatHistory.length === 0) {
      return res.status(400).json({ error: 'No chat history provided.' });
    }
    const prompt = "Summarize the following chat conversation into key points:\n\n" +
      chatHistory.map(msg => `${msg.senderId.substring(0, 5)}: ${msg.message}`).join('\n');

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const response = result.response;
    const summary = response.text();
    res.json({ summary });
  } catch (error) {
    console.error("Error in /api/summarize:", error);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

const getParticipants = async (roomId) => {
  const participants = {};
  const roomSockets = await io.in(roomId).fetchSockets();
  for (const sock of roomSockets) {
    if (socketUserMap[sock.id]) {
      participants[sock.id] = socketUserMap[sock.id].displayName;
    }
  }
  return participants;
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', async (payload) => {
    const { roomId, displayName } = payload;
    console.log(`User ${displayName} (${socket.id}) is joining room ${roomId}`);
    socket.join(roomId);
    socketUserMap[socket.id] = { roomId, displayName };

    const currentSharer = roomSharingState[roomId];
    if (currentSharer) socket.emit('user-started-sharing', currentSharer);

    const currentPoll = roomPollState[roomId];
    if (currentPoll) socket.emit('poll-update', currentPoll);

    socket.to(roomId).emit('user-joined', { socketId: socket.id, displayName });

    const participants = await getParticipants(roomId);
    io.to(roomId).emit('update-participants', participants);
  });

  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', { sdp: payload.sdp, callerId: socket.id });
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', { sdp: payload.sdp, calleeId: socket.id });
  });

  socket.on('ice-candidate', (payload) => {
    io.to(payload.target).emit('ice-candidate', { candidate: payload.candidate, senderId: socket.id });
  });

  socket.on('send-message', (payload) => {
    const { roomId, message } = payload;
    const user = socketUserMap[socket.id];
    if (roomId && user) {
      io.to(roomId).emit('receive-message', {
        message: message,
        senderId: socket.id,
        displayName: user.displayName
      });
    }
  });

  socket.on('start-share', () => {
    const roomId = socketUserMap[socket.id]?.roomId;
    if (roomId) {
      roomSharingState[roomId] = socket.id;
      socket.to(roomId).emit('user-started-sharing', socket.id);
    }
  });

  socket.on('stop-share', () => {
    const roomId = socketUserMap[socket.id]?.roomId;
    if (roomId) {
      roomSharingState[roomId] = null;
      socket.to(roomId).emit('user-stopped-sharing');
    }
  });

  socket.on('sync-notes', (payload) => {
    const roomId = socketUserMap[socket.id]?.roomId;
    if (roomId) socket.to(roomId).emit('notes-updated', payload.notes);
  });

  socket.on('create-poll', (pollData) => {
    const roomId = socketUserMap[socket.id]?.roomId;
    if (roomId) {
      const newPoll = {
        creatorId: socket.id,
        question: pollData.question,
        options: pollData.options.map(optionText => ({ text: optionText, count: 0 })),
        voters: {}
      };
      roomPollState[roomId] = newPoll;
      io.to(roomId).emit('poll-update', newPoll);
    }
  });

  socket.on('submit-vote', (optionIndex) => {
    const roomId = socketUserMap[socket.id]?.roomId;
    const poll = roomPollState[roomId];
    if (roomId && poll && !poll.voters[socket.id]) {
      poll.options[optionIndex].count++;
      poll.voters[socket.id] = true;
      io.to(roomId).emit('poll-update', poll);
    }
  });

  socket.on('close-poll', () => {
    const roomId = socketUserMap[socket.id]?.roomId;
    const poll = roomPollState[roomId];
    if (roomId && poll && poll.creatorId === socket.id) {
      roomPollState[roomId] = null;
      io.to(roomId).emit('poll-update', null);
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    const user = socketUserMap[socket.id];
    if (!user) return;

    const { roomId } = user;
    if (roomId) {
      if (roomSharingState[roomId] === socket.id) {
        roomSharingState[roomId] = null;
        socket.to(roomId).emit('user-stopped-sharing');
      }

      const poll = roomPollState[roomId];
      if (poll && poll.creatorId === socket.id) {
        roomPollState[roomId] = null;
        io.to(roomId).emit('poll-update', null);
      }

      socket.to(roomId).emit('user-left', socket.id);
      delete socketUserMap[socket.id];

      const participants = await getParticipants(roomId);
      io.to(roomId).emit('update-participants', participants);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
