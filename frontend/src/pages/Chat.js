import React, { useEffect, useState, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import ConversationList from "../components/ConversationList";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";

const ChatComponent = () => {
  const navigate = useNavigate();
  const [isMobileView, setIsMobileView] = useState(false);
  const { isDark } = useContext(ThemeContext);

  const themeBg = isDark ? "bg-dark text-light" : "bg-light text-dark";

  // Auth Guard
  useEffect(() => {
    const loggedIn = localStorage.getItem('user');
    if (!loggedIn || loggedIn === "undefined" || loggedIn === "null") {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`vh-100 d-flex flex-column overflow-hidden ${themeBg}`}>
      <div className="d-flex flex-grow-1 overflow-hidden w-100 position-relative">
        <div className="flex-grow-1 overflow-auto">
          <ConversationList isMobileView={isMobileView} />
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
