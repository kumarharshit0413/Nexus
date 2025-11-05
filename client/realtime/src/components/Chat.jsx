import React, { useState, useEffect, useRef } from 'react';

const isImageUrl = (url) => {
  return /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
};

const Chat = ({ socket, roomId, participants }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (payload) => {
      setMessages((prev) => [...prev, payload]);
    };
    socket.on('receive-message', handleReceiveMessage);
    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendTextMessage = (text) => {
    if (text.trim() === '' || !socket) return;
    socket.emit('send-message', {
      message: text,
      roomId: roomId,
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendTextMessage(message);
    setMessage('');
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.secure_url) {
        sendTextMessage(data.secure_url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("File upload failed. Please try again.");
    } finally {
      console.log('Upload complete, running finally block');
      setIsUploading(() => false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleSummarize = async () => {
    if (messages.length === 0) {
      alert("No messages to summarize!");
      return;
    }
    
    setIsSummarizing(true);
    setSummary(null);
    try {
      const response = await fetch('http://localhost:3001/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatHistory: messages }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSummary(data.summary);
      } else {
        throw new Error(data.error || 'Failed to get summary');
      }
    } catch (error) {
      console.error("Error summarizing chat:", error);
      alert("Error: " + error.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-gray-800 rounded-lg shadow-lg">

      {summary && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black bg-opacity-70">
          <div className="flex flex-col w-full max-w-lg bg-gray-700 rounded-lg shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-600">
              <h3 className="text-lg font-semibold text-white">Chat Summary</h3>
              <button
                onClick={() => setSummary(null)}
                className="text-gray-400 hover:text-white"
              >
                &times; 
              </button>
            </div>
            <div 
              className="p-4 overflow-y-auto text-gray-200"
              style={{ maxHeight: '60vh' }} 
            >
              <p className="whitespace-pre-wrap">{summary}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Live Chat</h3>
        <button
          onClick={handleSummarize}
          disabled={isSummarizing || messages.length === 0}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {isSummarizing ? "Summarizing..." : "Summarize"}
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          
          {messages.map((msg, index) => (
            <div key={index} className="flex">
              <span className="font-semibold text-blue-300 w-auto pr-2">
                {msg.displayName || participants[msg.senderId] || msg.senderId.substring(0, 5)}:
              </span>
              <div className="text-gray-200 ml-2 break-all">
                {isImageUrl(msg.message) ? (
                  <img src={msg.message} alt="Shared" className="max-w-xs rounded-lg" />
                ) : msg.message.startsWith('http') ? (
                  <a href={msg.message} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">
                    {msg.message}
                  </a>
                ) : (
                  <p>{msg.message}</p>
                )}
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold disabled:opacity-50"
          >
            {isUploading ? '...' : '+'}
          </button>
          
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isUploading ? "Uploading file..." : "Type a message..."}
            disabled={isUploading}
            className="flex-1 p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default React.memo(Chat);