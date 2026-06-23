import React from "react";

const reactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ReactionMenu = ({ onSelect }) => {
  return (
    <div
      className="position-absolute bg-white shadow rounded-pill px-2 py-1 d-flex gap-2"
      style={{
        bottom: "100%",
        right: 0,
        zIndex: 1000,
        whiteSpace: "nowrap",
      }}
    >
      {reactions.map((emoji) => (
        <button
          key={emoji}
          className="btn p-0 border-0 bg-transparent"
          onClick={() => onSelect(emoji)}
          style={{ fontSize: "1.3rem" }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionMenu;