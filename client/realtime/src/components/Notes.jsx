import React, { useState, useEffect } from 'react';

const Notes = ({ socket }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!socket) return;

    const handleNotesUpdated = (newNotes) => {
      setNotes(newNotes);
    };

    socket.on('notes-updated', handleNotesUpdated);

    return () => {
      socket.off('notes-updated', handleNotesUpdated);
    };
  }, [socket]);

  const handleChange = (e) => {
    const newNotes = e.target.value;
    setNotes(newNotes);

    if (socket) {
      socket.emit('sync-notes', {
        notes: newNotes,
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-white p-4 border-b border-gray-700">
        Collaborative Notes
      </h3>
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="Type your shared notes here..."
        className="flex-1 p-4 bg-gray-700 text-white rounded-b-lg resize-none focus:outline-none"
        style={{ minHeight: '200px' }}
      />
    </div>
  );
};

export default Notes;