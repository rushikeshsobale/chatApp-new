import React, { useState, useEffect } from 'react';
import { FaSearch, FaRegCompass, FaRegHeart, FaRegUser, FaHashtag, FaEllipsisH } from 'react-icons/fa';
import { BiTrendingUp } from 'react-icons/bi';
import { BsGrid3X3, BsBookmark } from 'react-icons/bs';
import PostCard from '../components/PostCard';
import SuggestedUser from '../components/SuggestedUser';
import TrendingHashtag from '../components/TrendingHashtag';
import "bootstrap/dist/css/bootstrap.min.css";
import '../css/ExplorePage.css';

const ExplorePage = () => {
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);

  useEffect(() => {
    // Mock data - replace with actual API calls
    setTrendingPosts([
      {
        id: 1,
        username: 'travel_enthusiast',
        image: 'https://source.unsplash.com/random/300x300?travel',
        likes: 1243,
        caption: 'Exploring the hidden gems of Bali 🌴 #travel #adventure',
        comments: 42,
        timestamp: '2 hours ago'
      },
      {
        id: 2,
        username: 'foodie_adventures',
        image: 'https://source.unsplash.com/random/300x300?food',
        likes: 892,
        caption: 'Homemade pasta from scratch! #foodie #homecooking',
        comments: 31,
        timestamp: '4 hours ago'
      },
      {
        id: 3,
        username: 'tech_geek',
        image: 'https://source.unsplash.com/random/300x300?technology',
        likes: 1567,
        caption: 'Just got the new smartphone! #tech #gadgets',
        comments: 87,
        timestamp: '6 hours ago'
      }
    ]);

    setSuggestedUsers([
      {
        id: 1,
        username: 'photography_pro',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        followers: '125k',
        isVerified: true
      },
      {
        id: 2,
        username: 'fitness_guru',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        followers: '89k',
        isVerified: false
      },
      {
        id: 3,
        username: 'travel_diaries',
        avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
        followers: '210k',
        isVerified: true
      }
    ]);

    setTrendingHashtags([
      {
        id: 1,
        tag: '#summer2023',
        posts: '1.2M',
        isTrending: true
      },
      {
        id: 2,
        tag: '#photography',
        posts: '890K',
        isTrending: false
      },
      {
        id: 3,
        tag: '#fitnessmotivation',
        posts: '1.5M',
        isTrending: true
      }
    ]);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="explore-page">
      {/* Header */}
      <header className="explore-header sticky-top bg-white py-3 px-4 border-bottom">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <form onSubmit={handleSearch} className="search-form position-relative">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search"
                  className="form-control search-input ps-5"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>
            <div className="col-md-6 d-none d-md-flex justify-content-end">
              <nav className="explore-nav">
                <ul className="nav">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'trending' ? 'active' : ''}`}
                      onClick={() => setActiveTab('trending')}
                    >
                      <BiTrendingUp size={20} />
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'discover' ? 'active' : ''}`}
                      onClick={() => setActiveTab('discover')}
                    >
                      <FaRegCompass size={20} />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="explore-main py-4">
        <div className="container">
          {/* Tab Content */}
          {activeTab === 'trending' && (
            <div className="trending-content">
              <div className="row">
                {/* Trending Posts */}
                <div className="col-lg-8">
                  <h4 className="mb-4 fw-bold">Trending Today</h4>
                  <div className="row">
                    {trendingPosts.map((post) => (
                      <div key={post.id} className="col-md-6 mb-4">
                        <PostCard post={post} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Users & Hashtags */}
                <div className="col-lg-4">
                  <div className="sticky-top" style={{ top: '80px' }}>
                    <div className="card mb-4 border-0 shadow-sm">
                      <div className="card-header bg-white">
                        <h5 className="mb-0 fw-bold">Suggested Accounts</h5>
                      </div>
                      <div className="card-body">
                        {suggestedUsers.map((user) => (
                          <SuggestedUser key={user.id} user={user} />
                        ))}
                        <button className="btn btn-link text-primary w-100 mt-2">
                          See All
                        </button>
                      </div>
                    </div>

                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-white">
                        <h5 className="mb-0 fw-bold">Trending Hashtags</h5>
                      </div>
                      <div className="card-body">
                        {trendingHashtags.map((hashtag) => (
                          <TrendingHashtag key={hashtag.id} hashtag={hashtag} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discover' && (
            <div className="discover-content">
              <h4 className="mb-4 fw-bold">Discover New Content</h4>
              <div className="row">
                {/* Categories Grid */}
                <div className="col-md-4 mb-4">
                  <div className="category-card rounded-3 overflow-hidden position-relative">
                    <img
                      src="https://source.unsplash.com/random/400x400?travel"
                      alt="Travel"
                      className="img-fluid w-100"
                    />
                    <div className="category-overlay">
                      <h5 className="text-white fw-bold">Travel</h5>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-4">
                  <div className="category-card rounded-3 overflow-hidden position-relative">
                    <img
                      src="https://source.unsplash.com/random/400x400?food"
                      alt="Food"
                      className="img-fluid w-100"
                    />
                    <div className="category-overlay">
                      <h5 className="text-white fw-bold">Food</h5>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-4">
                  <div className="category-card rounded-3 overflow-hidden position-relative">
                    <img
                      src="https://source.unsplash.com/random/400x400?fitness"
                      alt="Fitness"
                      className="img-fluid w-100"
                    />
                    <div className="category-overlay">
                      <h5 className="text-white fw-bold">Fitness</h5>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-4">
                  <div className="category-card rounded-3 overflow-hidden position-relative">
                    <img
                      src="https://source.unsplash.com/random/400x400?technology"
                      alt="Technology"
                      className="img-fluid w-100"
                    />
                    <div className="category-overlay">
                      <h5 className="text-white fw-bold">Technology</h5>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-4">
                  <div className="category-card rounded-3 overflow-hidden position-relative">
                    <img
                      src="https://source.unsplash.com/random/400x400?fashion"
                      alt="Fashion"
                      className="img-fluid w-100"
                    />
                    <div className="category-overlay">
                      <h5 className="text-white fw-bold">Fashion</h5>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-4">
                  <div className="category-card rounded-3 overflow-hidden position-relative">
                    <img
                      src="https://source.unsplash.com/random/400x400?art"
                      alt="Art"
                      className="img-fluid w-100"
                    />
                    <div className="category-overlay">
                      <h5 className="text-white fw-bold">Art</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav d-md-none fixed-bottom bg-white border-top py-2">
        <div className="container">
          <ul className="nav justify-content-around">
            <li className="nav-item">
              <button className="nav-link">
                <BsGrid3X3 size={20} />
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'discover' ? 'active' : ''}`}
                onClick={() => setActiveTab('discover')}
              >
                <FaRegCompass size={20} />
              </button>
            </li>
            <li className="nav-item">
              <button className="nav-link">
                <FaRegHeart size={20} />
              </button>
            </li>
            <li className="nav-item">
              <button className="nav-link">
                <FaRegUser size={20} />
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
};

export default ExplorePage;