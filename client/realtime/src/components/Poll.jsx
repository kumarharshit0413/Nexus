import React, { useState, useEffect } from 'react';

const Poll = ({ socket, selfSocketId }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  
  const [activePoll, setActivePoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('poll-update', (poll) => {
      setActivePoll(poll);
      if (poll && poll.voters[selfSocketId]) {
        setHasVoted(true);
      } else {
        setHasVoted(false);
      }
    });

    return () => {
      socket.off('poll-update');
    };
  }, [socket, selfSocketId]);

  const handleAddOption = () => {
    if (options.length < 5) { 
      setOptions([...options, '']);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = (e) => {
    e.preventDefault();
    const nonEmptyOptions = options.filter(opt => opt.trim() !== '');
    if (question.trim() && nonEmptyOptions.length >= 2) {
      socket.emit('create-poll', { question, options: nonEmptyOptions });
      setQuestion('');
      setOptions(['', '']);
      setShowCreate(false);
    }
  };

  const handleVote = (optionIndex) => {
    if (hasVoted) return; 
    socket.emit('submit-vote', optionIndex);
  };

  const handleClosePoll = () => {
    socket.emit('close-poll');
  };

  const totalVotes = activePoll ? activePoll.options.reduce((sum, opt) => sum + opt.count, 0) : 0;

  if (activePoll) {
    const isCreator = activePoll.creatorId === selfSocketId;
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">{activePoll.question}</h3>
        <div className="space-y-2">
          {activePoll.options.map((option, index) => {
            const percentage = totalVotes > 0 ? (option.count / totalVotes) * 100 : 0;
            return (
              <div key={index} className="relative">
                <button
                  onClick={() => handleVote(index)}
                  disabled={hasVoted}
                  className="w-full text-left p-2 rounded bg-gray-700 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-gray-700"
                >
                  <div 
                    className="absolute h-full top-0 left-0 bg-blue-500 bg-opacity-30 rounded"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex justify-between">
                    <span>{option.text}</span>
                    {hasVoted && (
                      <span>{option.count} {option.count === 1 ? 'vote' : 'votes'} ({percentage.toFixed(0)}%)</span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
        {isCreator && (
          <button
            onClick={handleClosePoll}
            className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            Close Poll
          </button>
        )}
      </div>
    );
  }

  if (showCreate) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4">
        <form onSubmit={handleCreatePoll} className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Create New Poll</h3>
          <input
            type="text"
            placeholder="Poll Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
            required
          />
          {options.map((option, index) => (
            <input
              key={index}
              type="text"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
            />
          ))}
          <button
            type="button"
            onClick={handleAddOption}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold"
          >
            Add Option
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    );
  }
  return (
    <button
      onClick={() => setShowCreate(true)}
      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
    >
      Create Poll
    </button>
  );
};

export default React.memo(Poll);