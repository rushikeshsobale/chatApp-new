import { useEffect, useState } from "react";
import api from "../api";

const UserSearchBox = ({ onUserSelect }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setShowResults(false);
            return;
        }
        const delay = setTimeout(async () => {
            try {
                setLoading(true);
                const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
                setResults(res.data || []);
                setShowResults(true);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        }, 400);
        return () => clearTimeout(delay);
    }, [query]);

    return (
        <div className="search-container p-0">
            <div className="input-wrapper p-1  mx-3">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                    type="text"
                    className="modern-input small"
                    placeholder="Search people..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)} // Delay to allow click
                />
                {loading && <div className="spinner-sm" />}
            </div>

            {showResults && (
                <div className="search-dropdown">
                    {results.length === 0 && !loading ? (
                        <div className="status-message">No users found</div>
                    ) : (
                        results.map((user) => (
                            <div key={user._id} className="search-item" onClick={() => onUserSelect(user)}>
                                <img
                                    src={user.profilePicture || "/avatar.png"}
                                    alt=""
                                    className="search-avatar"
                                />
                                <div className="user-meta">
                                    <span className="username">{user.userName}</span>
                                    <span className="user-subtext">@username</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <style jsx>{`

            .search-container {
                    position: relative;
                    width: 100%;
                    max-width: 400px;
                    font-family: 'Inter', -apple-system, sans-serif;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    
                }
  .search-dropdown {
    position: absolute;
    top: calc(100% + 4px); /* Tighter gap to input */
    width: 100%;
    background: #121212; /* Deeper dark */
    border: 1px solid #282828;
    border-radius: 8px;
    z-index: 1000;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    padding: 4px; /* Minimal padding around the list */
    overflow: hidden; /* Prevents children from breaking corners */
  }

  .results-list {
    max-height: 240px; /* Precise height for ~5.5 items */
    overflow-y: auto;
    /* Custom thin scrollbar */
    scrollbar-width: thin;
    scrollbar-color: #333 transparent;
  }

  .results-list::-webkit-scrollbar {
    width: 4px;
  }
  .results-list::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 10px;
  }

  .search-item {
    display: flex;
    align-items: center;
    padding: 6px 10px; /* Reduced padding for precision */
    margin-bottom: 2px; /* Tiny gap between items */
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .search-item:last-child {
    margin-bottom: 0;
  }

  .search-item:hover {
    background: #1e1e1e;
  }

  .search-avatar {
    width: 28px; /* Slightly smaller for minimalism */
    height: 28px;
    border-radius: 50%;
    margin-right: 10px;
    object-fit: cover;
    flex-shrink: 0; /* Prevents image squishing */
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    line-height: 1.2; /* Tightens vertical gap between text lines */
  }

  .username {
    color: #e0e0e0;
    font-size: 13px;
    font-weight: 500;
  }

  .user-subtext {
    color: #666;
    font-size: 11px;
  }

  .status-message {
    padding: 12px;
    color: #555;
    font-size: 12px;
    text-align: center;
  }
    .search-icon {
                    position: absolute;
                    left: 12px;
                    width: 18px;
                    height: 18px;
                    color: #666;
                }
                    .modern-input {
                    width: 100%;
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 10px;
                    padding: 2px 2px 2px 40px;
                    color: #efefef;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    outline: none;
                }

                .modern-input:focus {
                    border-color: #555;
                    background: #222;
                    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
                }
`}</style>
        </div>
    );
};

export default UserSearchBox;