import React from 'react';
import { FaRegHeart, FaRegComment, FaRegBookmark, FaEllipsisH } from 'react-icons/fa';

const PostCard = ({ post }) => {
  return (
    <div className="card border-0 shadow-sm rounded-3 overflow-hidden mb-3">
      <div className="card-header bg-white d-flex align-items-center justify-content-between py-3">
        <div className="d-flex align-items-center">
          <img
            src={`https://randomuser.me/api/portraits/${post.id % 2 === 0 ? 'women' : 'men'}/${post.id}.jpg`}
            alt={post.username}
            className="rounded-circle me-2"
            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
          />
          <span className="fw-bold">{post.username}</span>
        </div>
        <button className="btn p-0">
          <FaEllipsisH />
        </button>
      </div>
      <img
        src={post.image}
        alt="Post"
        className="card-img-top"
        style={{ aspectRatio: '1/1', objectFit: 'cover' }}
      />
      <div className="card-body">
        <div className="d-flex justify-content-between mb-2">
          <div>
            <button className="btn p-0 me-3">
              <FaRegHeart size={20} />
            </button>
            <button className="btn p-0 me-3">
              <FaRegComment size={20} />
            </button>
            <button className="btn p-0">
              <FaRegBookmark size={20} />
            </button>
          </div>
        </div>
        <p className="mb-1 fw-bold">{post.likes.toLocaleString()} likes</p>
        <p className="mb-1">
          <span className="fw-bold me-2">{post.username}</span>
          {post.caption}
        </p>
        <p className="text-muted small mb-0">{post.timestamp}</p>
      </div>
    </div>
  );
};

export default PostCard;