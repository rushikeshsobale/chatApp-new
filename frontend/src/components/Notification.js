import React from "react";
import moment from "moment";
import { IoMdNotifications } from "react-icons/io";
import { FaTrashAlt, FaTimes } from "react-icons/fa";

export default function NotificationModal({
  notifications,
  unreadCount,
  show,
  onToggle,
  onMarkRead,
  onDelete,
}) {
  if (!show) return null;

  return (
    <div className="prof-fixed-overlay">
      <div className="prof-notif-modal">
        {/* Header */}
        <div className="prof-notif-header">
          <div className="d-flex align-items-center gap-2">
            <span className="prof-notif-title">Updates</span>
            {unreadCount > 0 && <span className="prof-badge-pill">{unreadCount}</span>}
          </div>
          <button onClick={onToggle} className="prof-close-icon"><FaTimes /></button>
        </div>

        {/* Notification List */}
        <div className="prof-notif-scroll">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`prof-notif-row ${!notification.read ? "unread-row" : ""}`}
                onClick={() => !notification.read && onMarkRead(notification._id)}
              >
                <img
                  src={notification.sender?.profilePicture || "via.placeholder.com"}
                  alt=""
                  className="prof-notif-avatar"
                />
                <div className="prof-notif-body">
                  <p className="prof-msg-text">{notification.message}</p>
                  <span className="prof-time-text">{moment(notification.createdAt).fromNow()}</span>
                </div>
                <button
                  className="prof-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification._id);
                  }}
                >
                  <FaTrashAlt size={10} />
                </button>
              </div>
            ))
          ) : (
            <div className="prof-empty-notif">No recent activity</div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* VIEWPORT CENTERING FIX */
        .prof-fixed-overlay {
          position: fixed;
          inset: 0;
          background: rgba(66, 66, 66, 0.9); /* Deep 2026 Dark Backdrop */
          backdrop-filter: blur(8px);    /* Premium Blur */
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .prof-notif-modal {
          width: 100%;
          max-width: 400px;
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }

        /* Elements Styling */
        .prof-notif-header {
          padding: 16px 20px;
          border-bottom: 1px solid #161616;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .prof-notif-title {
          font-size: 0.85rem;
          color: #fff;
          letter-spacing: 0.5px;
          font-weight: 400;
        }

        .prof-badge-pill {
          background: #fff;
          color: #000;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .prof-close-icon { background: none; border: none; color: #444; cursor: pointer; }

        .prof-notif-scroll {
          max-height: 420px;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .prof-notif-row {
          display: flex;
          padding: 12px 20px;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #0f0f0f;
        }

        .prof-notif-row:hover { background: #080808; }
        .unread-row { background: rgba(255, 255, 255, 0.02); }

        .prof-notif-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #1a1a1a;
          object-fit: cover;
        }

        .prof-notif-body { flex: 1; min-width: 0; }
        .prof-msg-text { color: #ccc; font-size: 0.8rem; margin: 0; line-height: 1.4; }
        .unread-row .prof-msg-text { color: #fff; }
        .prof-time-text { color: #444; font-size: 0.7rem; margin-top: 4px; display: block; }

        .prof-delete-btn {
          background: none;
          border: none;
          color: #333;
          opacity: 0;
          transition: 0.2s;
          cursor: pointer;
        }

        .prof-notif-row:hover .prof-delete-btn { opacity: 1; }
        .prof-delete-btn:hover { color: #ff4d4d; }

        .prof-empty-notif { padding: 40px 20px; text-align: center; color: #333; font-size: 0.8rem; }
      `}</style>
    </div>
  );
}
