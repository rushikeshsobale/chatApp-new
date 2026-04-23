const PrivateHeader = ({
  conversation,
  member,
  typingUser,
  userId,
  onBack,
  setOutgoingCall,
  deleteMessages
}) => {
  return (
    <div className="chat-header">
      <button className="back-button" onClick={onBack}>
        <FaArrowLeft />
      </button>

      <div className="user-info d-flex flex-row">
        <div className="user-avatar">
          <img
            style={{ width: "48px", height: "48px", objectFit: "cover" }}
            src={member?.profilePicture}
            alt="user"
          />

          {typingUser && typingUser !== userId && typingUser == member._id && (
            <div className="typing-indicator">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          )}
        </div>

        <div className="user-details">
          <h3 className="text-truncate" style={{ width: "100px" }}>
            {member?.userName}
          </h3>
          <p>
            {typingUser && typingUser !== userId && typingUser == member._id
              ? "typing..."
              : "online"}
          </p>
        </div>
      </div>

      <button onClick={() => setOutgoingCall(true)} className="call-btn">
        <FaVideo />
      </button>

      <div className="mx-3">
        <div className="dropdown">
          <button className="action-button">
            <FontAwesomeIcon icon={faEllipsisV} />
          </button>
          <div className="dropdown-menu">
            <button onClick={() => deleteMessages(userId, member._id)}>
              <FontAwesomeIcon icon={faTrashAlt} /> clear chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateHeader;