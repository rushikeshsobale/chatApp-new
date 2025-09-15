// In AuthSuccess.jsx (page for /auth-success)
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from 'react-redux';
import {jwtDecode} from 'jwt-decode';
import { SET_USER } from "../store/action";
export default function AuthSuccess() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      const decodedData = jwtDecode(token);
      dispatch({
        type: SET_USER,
        payload: { user: decodedData }, // Replace with actual userId
      });
      localStorage.setItem("user", JSON.stringify(decodedData));
      navigate("/"); // or wherever you want to go
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return <p>Signing you in...</p>;
}
