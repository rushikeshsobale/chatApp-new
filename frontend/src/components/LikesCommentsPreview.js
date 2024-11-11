// LikesCommentsPreview.js
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/LikesCommentsPreview.css';
import { FaThumbsUp } from 'react-icons/fa';

const LikesCommentsPreview = ({ handleLike ,type, users, hasLiked, comments }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="preview-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button className="btn btn-link preview-button">
        {type === 'likes' ? (
          hasLiked ? (
            <span onClick={handleLike}>
              ❤️ {users.length} Likes
            </span>
          ) : (
            <span onClick={handleLike}>
              <FaThumbsUp /> {users.length} Likes
            </span>
          )
        ) : (
          <span>
          `💬 ${comments.length} Comments`
          </span>
        )}
      </button>

      {isHovered && type === 'likes' && (
        <div className="preview-list">
          {users.slice(0, 5).map((user, index) => (
            <div key={index} className="preview-item">
              <img
                src={user.profilePicture}
                alt={`${user.firstName} ${user.lastName}`}
                className="preview-profile-picture"
              />
              <span className="preview-username">{user.firstName} {user.lastName}</span>
            </div>
          ))}
          {users.length > 5 && <div className="more-text">+{users.length - 5} more</div>}
        </div>
      )}

      {isHovered && type === 'comments' && (
        <div className="preview-comments card p-2 ">
          {comments.slice(0, 5).map((comment, index) => (
           <div key={index} className="comment-item ">
           <div className="d-flex align-items-center">
             <img
               src={comment.userId.profilePicture}
               alt={`${comment.userId.firstName} ${comment.userId.lastName}`}
               className="comment-profile-picture rounded-circle"
               style={{ width: '20px', height: '20px', marginRight: '10px' }}
             />
             <div className="d-flex ">
               <span className="comment-username " style={{ fontSize: '10px', fontWeight: 'bold' }}>
                 {comment.userId.firstName} {comment.userId.lastName}
               </span>
               <p className="comment-text " style={{ fontSize: '14px', color: '#555' }}>
                 {comment.text}
               </p>
             </div>
           </div>
         </div>
         
          ))}
          {comments.length > 5 && <div className="more-text">+{comments.length - 5} more</div>}
        </div>
      )}
    </div>
  );
};

export default LikesCommentsPreview;
