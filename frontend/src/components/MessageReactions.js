import React from "react";

const MessageReactions = ({ reactions = [], isReceived }) => {
  if (!reactions.length) return null;

  const grouped = reactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`reaction-pill ${isReceived ? "reaction-pill-start" : "reaction-pill-end"}`}>
      {Object.entries(grouped).map(([emoji, count]) => (
        <span key={emoji} className="reaction-pill-item">
          {emoji}
          {count > 1 ? <span className="reaction-pill-count">{count}</span> : null}
        </span>
      ))}
    </div>
  );
};

export default MessageReactions;
