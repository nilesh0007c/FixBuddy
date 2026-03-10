// src/components/ui/TypingIndicator.jsx
import React from 'react';
import '../../App.css';

/**
 * TypingIndicator
 * Props:
 *  users — string[] of user names who are currently typing
 */
const TypingIndicator = ({ users }) => {
  if (!users || users.length === 0) return null;

  const label =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
      ? `${users[0]} and ${users[1]} are typing`
      : `${users.length} people are typing`;

  return (
    <div className="typing-indicator" aria-live="polite" aria-label={label}>
      <div className="typing-dots">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="typing-label">{label}</span>
    </div>
  );
};

export default TypingIndicator;