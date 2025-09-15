import { CiMenuKebab } from "react-icons/ci";

export default function ChatActions() {
  return (
    <div className="chat-actions dropdown">
      <button
        className="btn btn-dark btn-sm"
        type="button"
        id="chatActionsMenu"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <CiMenuKebab size={18} />
      </button>

      <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="chatActionsMenu">
        <li>
          <button className="dropdown-item">View Profile</button>
        </li>
        <li>
          <button className="dropdown-item">Mute Notifications</button>
        </li>
        <li>
          <button className="dropdown-item text-danger">Block User</button>
        </li>
        <li>
          <hr className="dropdown-divider" />
        </li>
        <li>
          <button className="dropdown-item text-danger">Delete Chat</button>
        </li>
      </ul>
    </div>
  );
}
