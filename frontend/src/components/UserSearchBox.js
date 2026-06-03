import { useEffect, useState, useRef } from "react";
import api from "../api";

const UserSearchBox = ({ onUserSelect, isDark = true }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    
    // Using a ref to prevent dropdown from closing prematurely when clicking items
    const containerRef = useRef(null);

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

    // Close dropdown safely when clicking completely outside the component
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Theme values mapped cleanly
    const theme = {
        bg: isDark ? "bg-dark text-light" : "bg-white text-dark",
        inputBg: isDark ? "#1a1a1a" : "#f8f9fa",
        inputBorder: isDark ? "border-secondary" : "border-light-subtle",
        dropdownBg: isDark ? "#121212" : "#ffffff",
        dropdownBorder: isDark ? "#282828" : "#dee2e6",
        hoverBg: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
        subtext: isDark ? "text-muted" : "text-secondary"
    };

    return (
        <div 
            ref={containerRef} 
            className="w-100 p-1 position-relative" 
            style={{ maxWidth: "400px" }}
        >
            {/* Input Container Wrapper */}
            <div className="d-flex align-items-center position-relative w-100">
                {/* Search Glass Icon */}
                

                {/* Form Control */}
                <input
                    type="text"
                    className={`form-control border shadow-sm w-100 ${theme.bg}`}
                    placeholder="Search people..."
                    value={query}
                    style={{
                        paddingLeft: "38px",
                        paddingRight: "36px",
                        backgroundColor: theme.inputBg,
                        borderRadius: "10px",
                        fontSize: "14px",
                    }}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && setShowResults(true)}
                />

                {/* Inline Loading Spinner */}
                {loading && (
                    <div 
                        className="spinner-border spinner-border-sm position-absolute text-secondary" 
                        role="status"
                        style={{ right: "14px", width: "1rem", height: "1rem" }}
                    >
                        <span className="visually-hidden">Loading...</span>
                    </div>
                )}
            </div>

            {/* Results Floating Dropdown Menu */}
            {showResults && (
                <div 
                    className="position-absolute left-0 shadow-lg rounded-3 p-1 overflow-hidden"
                    style={{
                        top: "100%",
                        width: "calc(100% - 8px)", // accounts for container padding
                        marginLeft: "4px",
                        backgroundColor: theme.dropdownBg,
                        border: `1px solid ${theme.dropdownBorder}`,
                        zIndex: 1050,
                    }}
                >
                    {results.length === 0 && !loading ? (
                        <div className="p-3 text-center small text-muted">
                            No users found
                        </div>
                    ) : (
                        <div 
                            className="overflow-auto" 
                            style={{ maxHeight: "240px", scrollbarWidth: "thin" }}
                        >
                            {results.map((user) => (
                                <div 
                                    key={user._id} 
                                    className="d-flex align-items-center p-2 rounded-2 my-1" 
                                    style={{ 
                                        cursor: "pointer", 
                                        transition: "background 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hoverBg}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    onClick={() => {
                                        onUserSelect(user);
                                        setShowResults(false);
                                    }}
                                >
                                    {/* User Photo */}
                                    <img
                                        src={user.profilePicture || "/avatar.png"}
                                        alt=""
                                        className="rounded-circle me-2 flex-shrink-0"
                                        style={{ width: "32px", height: "32px", objectFit: "cover" }}
                                    />
                                    
                                    {/* Meta Information Container */}
                                    <div className="d-flex flex-column lh-sm overflow-hidden">
                                        <span 
                                            className={`fw-medium text-truncate ${isDark ? 'text-light' : 'text-dark'}`} 
                                            style={{ fontSize: "13px" }}
                                        >
                                            {user.userName}
                                        </span>
                                        <span 
                                            className={`small text-truncate ${theme.subtext}`} 
                                            style={{ fontSize: "11px" }}
                                        >
                                            @{user.userName?.toLowerCase()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserSearchBox;