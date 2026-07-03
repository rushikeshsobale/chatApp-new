import React from "react";

const reactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ReactionMenu = ({ onSelect, isReceived }) => {
  return (
    <div className={`reaction-menu ${isReceived ? "reaction-menu-start" : "reaction-menu-end"}`}>
      {reactions.map((emoji) => (
        <button
          key={emoji}
          className="reaction-menu-btn"
          onClick={() => onSelect(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionMenu;
