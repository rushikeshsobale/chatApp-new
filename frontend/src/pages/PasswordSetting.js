import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import { setPassword } from '../services/authService';
import {jwtDecode} from 'jwt-decode';
import { useDispatch } from 'react-redux';
import { SET_USER } from "../store/action";
import { fetchUserKeys, uploadUserKeys } from "../services/keyse2e";
import CryptoUtils from "../utils/CryptoUtils";
const SetPasswordcomponent = () => {
  const dispatch = useDispatch();
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
    const [formData, setFormData] = useState({
      email: "",
      password: "",
      username: "",
      fullName: "",
      phone: "",
      birthDate: "",
      gender: "other",
    });
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setError('');
    const {token, hasKeys} = await setPassword(password);
    localStorage.setItem("token", token);
    const decodedData = jwtDecode(token);
    dispatch({ type: SET_USER, payload: { user: decodedData } });
    localStorage.setItem("user", JSON.stringify(decodedData));
   if (!hasKeys) {
          /** * CASE A: FIRST TIME KEY SETUP 
           * User has no keys in DB. Create, Encrypt, and Upload.
           */
          const keyPair = await crypto.subtle.generateKey(
            {
              name: "RSA-OAEP",
              modulusLength: 2048,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
          );
          const { encrypted, salt, iv } = await CryptoUtils.encryptPrivateKey(
            keyPair.privateKey,
            formData.password
          );
          // Export the public key to send to DB
          const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
      
          await uploadUserKeys( {
            publicKey: new Uint8Array(publicKey),
            encryptedPrivateKey: new Uint8Array(encrypted),
            salt: new Uint8Array(salt),
            iv: new Uint8Array(iv),
          });
          // Save the raw private key locally so we don't need to decrypt it again this session
          await CryptoUtils.saveKeyLocally(keyPair.privateKey);
          console.log("Keys generated and saved locally.");

        } else {
          /** * CASE B: RESTORE KEYS 
           * User has keys in DB. Check if they exist on this browser.
           */
          let localKey = await CryptoUtils.loadKeyLocally()
          if (!localKey) {
            console.log("Device not recognized. Syncing keys...");
            const dbKeys = await fetchUserKeys();
            console.log(dbKeys, 'dbkey')
            const unlockedKey = await CryptoUtils.getPrivateKeyFromBackup(dbKeys, formData.password);
              await CryptoUtils.saveKeyLocally(unlockedKey);
              console.log("Keys restored to this device.");
            
          } else {

          }
        }
         navigate("/profile");

  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container className="d-flex justify-content-center">
        <Card className="p-4 shadow-lg border-0" style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '420px', borderRadius: '15px' }}>
          <Card.Body className="text-center text-white">
            <div className="mb-3">
              <ShieldCheck size={48} color="#38bdf8" />
            </div>

            <Card.Title className="fs-3 fw-bold mb-1">Create Your Vault</Card.Title>
            <Card.Text className="text-secondary small mb-4">
              Your password never leaves this device.
            </Card.Text>

            {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3 text-start">
                <Form.Label className="small text-secondary">Master Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-dark border-secondary text-secondary">
                    <Lock size={18} />
                  </InputGroup.Text>

                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    className="bg-dark border-secondary text-white"
                    placeholder="Enter strong password"
                    value={password}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    required
                  />

                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    className="border-secondary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-4 text-start">
                <Form.Label className="small text-secondary">Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  className="bg-dark border-secondary text-white"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Form.Group>

              <Button
                variant="info"
                type="submit"
                className="w-100 fw-bold py-2 shadow-sm"
                style={{ backgroundColor: '#38bdf8', border: 'none' }}
              >
                Secure My Account
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default SetPasswordcomponent;
