import React from 'react';
import { FaHashtag } from 'react-icons/fa';

const TrendingHashtag = ({ hashtag }) => {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3">
      <div className="d-flex align-items-center">
        <FaHashtag className={`me-3 ${hashtag.isTrending ? 'text-danger' : 'text-primary'}`} size={20} />
        <div>
          <h6 className="mb-0">{hashtag.tag}</h6>
          <small className="text-muted">{hashtag.posts} posts</small>
        </div>
      </div>
      {hashtag.isTrending && (
        <span className="badge bg-danger">Trending</span>
      )}
    </div>
  );
};

export default TrendingHashtag;