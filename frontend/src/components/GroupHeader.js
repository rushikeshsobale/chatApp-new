  const GroupHeader = ({
  conversation,
  onBack,
  setOutgoingCall
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
            src={conversation?.groupAvatar}
            alt="group"
          />
        </div>

        <div className="user-details">
          <h3 className="text-truncate" style={{ width: "140px" }}>
            {conversation?.groupName}
          </h3>
          <p>{conversation?.participants?.length} members</p>
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
            <button>
              <FontAwesomeIcon icon={faUsers} /> view members
            </button>

            <button>
              <FontAwesomeIcon icon={faUserPlus} /> add member
            </button>

            <button>
              <FontAwesomeIcon icon={faSignOutAlt} /> leave group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GroupHeader;