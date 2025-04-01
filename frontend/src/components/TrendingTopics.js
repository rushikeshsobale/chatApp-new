import React from 'react';
import { FaHashtag } from 'react-icons/fa';

const TrendingTopics = ({ topics }) => {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white">
        <h6 className="mb-0 fw-bold">Trending Topics</h6>
      </div>
      <div className="card-body">
        <ul className="list-unstyled">
          {topics.map((topic, index) => (
            <li key={index} className="mb-3">
              <a href={`/trending/${topic.name}`} className="text-decoration-none text-dark">
                <div className="d-flex align-items-center">
                  <FaHashtag className="text-primary me-2" />
                  <div>
                    <h6 className="mb-0">{topic.name}</h6>
                    <small className="text-muted">{topic.posts} posts</small>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TrendingTopics;