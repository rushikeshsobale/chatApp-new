import React from "react";
import moment from "moment";
import { IoMdNotifications } from "react-icons/io";

export default function NotificationModal({
  notifications,
  unreadCount,
  show,
  onToggle,
  onMarkRead,
  onDelete,
}) {
  return (
    <div className="d-lg-none d-flex position-relative">
      {/* Notification Bell */}
      <button
        className="btn p-0 position-relative"
        onClick={onToggle}
      >
        <IoMdNotifications size={24} className="text-dark" />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Modal */}
      {show && (
        <div
          className="position-absolute end-0 mt-2 p-3 shadow-lg bg-white rounded"
          style={{
            top: '44px',
            width: "320px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 1050,
          }}
        >
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className="d-flex align-items-center mb-3 p-2 rounded hover-bg-light"
                style={{ cursor: "pointer" }}
                onClick={() =>
                  !notification.read && onMarkRead(notification._id)
                }
              >
                <img
                  src={
                    notification.sender?.profilePicture ||
                    "https://via.placeholder.com/40"
                  }
                  alt="Profile"
                  className="rounded-circle me-3"
                  style={{ width: "40px", height: "40px" }}
                />
                <div className="flex-grow-1">
                  <p className="mb-0 small">{notification.message}</p>
                  <small className="text-muted">
                    {moment(notification.createdAt).fromNow()}
                  </small>
                </div>
                <div className="d-flex align-items-center">
                  {!notification.read && (
                    <span
                      className="badge bg-primary rounded-circle me-2"
                      style={{ width: "8px", height: "8px" }}
                    ></span>
                  )}
                  <button
                    className="btn btn-sm btn-link text-muted p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification._id);
                    }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted small mb-0">
              No notifications
            </p>
          )}
        </div>
      )}
    </div>
  );
}
