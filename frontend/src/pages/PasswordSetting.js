import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { ShieldCheck, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import { getMe, setPassword } from '../services/authService';
import { jwtDecode } from 'jwt-decode';
import { useDispatch } from 'react-redux';
import { SET_USER } from "../store/action";
import { fetchUserKeys, uploadUserKeys } from "../services/keyse2e";
import CryptoUtils from "../utils/CryptoUtils";

const SetPasswordcomponent = () => {
}

export default SetPasswordcomponent;