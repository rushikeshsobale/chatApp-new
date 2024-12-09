import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap CSS
import '../css/AuthForms.css'; // Import your custom styles

const AuthForms = () => {
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [socket, setSocket] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate()
  useEffect(() => {
    const newSocket = io('http://localhost:5500'); // Change the URL to your backend server URL
    setSocket(newSocket);

    return () => newSocket.close(); // Close socket connection when component unmounts
  }, []);

  const validateForm = (formData) => {
    const errors = {};
    if (!formData.email) errors.email = "Email is required";
    if (!formData.password) errors.password = "Password is required";
    if (!isLoginForm) {
      if (!formData.firstName) errors.firstName = "First name is required";
      if (!formData.lastName) errors.lastName = "Last name is required";
      // if (!formData.birthdate) errors.birthdate = "Birthdate is required";
      if (!formData.phone) errors.phone = "Phone number is required";
      if (formData.password !== formData.confPassword) errors.confPassword = "Passwords do not match";
    }
    return errors;
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.target);
    const userData = {
      email: formData.get('email'),
      password: formData.get('password'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      // birthdate: formData.get('birthdate'),
      phone: formData.get('phone'),
      confPassword: formData.get('confPassword') 
    };
    const errors = validateForm(userData);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      console.log('this is makingm ove')
      return;
    }

    // Determine the endpoint based on the form type
    const endpoint = isLoginForm ? 'http://localhost:5500/login' : 'http://localhost:5500/register';

    try {
     
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      // Check if the request was successful
      if (response.ok) {
        const tokenData = await response.json();
        const token = tokenData.token;
        document.cookie = `token=${token}; path=/; SameSite=Lax`;
        // Emit username to backend using Socket.io upon successful login
        if (!isLoginForm) {
          socket.emit('userRegistered', userData.username);
          setIsLoginForm(!isLoginForm);
        }
        navigate(`/ProfilePage`)
        
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData.message);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
    setIsSubmitting(false);
  };
  const toggleForm = () => {
    setIsLoginForm(!isLoginForm);
    setFormErrors({}); // Clear form errors when toggling forms
  };

  return (
    <div className="">
      <form onSubmit={handleSubmit} noValidate className="col-lg-8 container p-5 my-3" style={{background:'ghostwhite'}}>
        <div className="form-header">
          <h2 className="form-title pt-3 text-secondary text-center">{isLoginForm ? 'Welcome Back!' : 'Create an Account!'}</h2>
        </div>
        <div className="row p-2 ">
          {!isLoginForm && (
            <>
              <div className="col-lg-6 p-2 ">
                <label htmlFor="register-firstName">First Name:</label>
                <input
                  type="text"
                  id="register-firstName"
                  name="firstName"
                  className={`${formErrors.firstName ? 'is-invalid' : ''}`}
                />
                {formErrors.firstName && <div className="invalid-feedback">{formErrors.firstName}</div>}
              </div>
              <div className="col-lg-6 p-2">
                <label htmlFor="register-lastName">Last Name:</label>
                <input
                  type="text"
                  id="register-lastName"
                  name="lastName"
                  className={` ${formErrors.lastName ? 'is-invalid' : ''}`}
                />
                {formErrors.lastName && <div className="invalid-feedback">{formErrors.lastName}</div>}
              </div>
              {/* <div className="col-lg-6 p-2">
                <label htmlFor="register-birthdate">Birthdate:</label>
                <input
                  type="date"
                  id="register-birthdate"
                  name="birthdate"
                  className={`input-field ${formErrors.birthdate ? 'is-invalid' : ''}`}
                />
                {formErrors.birthdate && <div className="invalid-feedback">{formErrors.birthdate}</div>}
              </div> */}
              <div className="col-lg-6 p-2 m-auto">
                <label htmlFor="register-phone">Phone No:</label>
                <input
                  type="tel"
                  id="register-phone"
                  name="phone"
                  className={`input-field ${formErrors.phone ? 'is-invalid' : ''}`}
                />
                {formErrors.phone && <div className="invalid-feedback">{formErrors.phone}</div>}
              </div>
            </>
          )}
          <div className="col-lg-8 p-2">
            <label htmlFor="register-email">Email:</label>
            <input
              type="email"
              id="register-email"
              name="email"
              className={`input-field ${formErrors.email ? 'is-invalid' : ''}`}
              required
            />
            {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
          </div>
          <div className="col-lg-8 p-2 " style={{marginLeft:'270px'}}>
            <label htmlFor="register-password" >Password:</label>
            <input
              type="password"
              id="register-password"
              name="password"
              className={`input-field ${formErrors.password ? 'is-invalid' : ''}`}
              required
            />
            {formErrors.password && <div className="invalid-feedback">{formErrors.password}</div>}
          </div>
          {!isLoginForm && (
            <div className="col-lg-8 p-2 " >
              <label htmlFor="register-conf-password">Confirm Password:</label>
              <input
                type="password"
                id="register-conf-password"
                name="confPassword"
                className={`input-field ${formErrors.confPassword ? 'is-invalid' : ''}`}
                required
              />
              {formErrors.confPassword && <div className="invalid-feedback">{formErrors.confPassword}</div>}
            </div>
          )}
        </div>
        <div className="button-group d-flex mt-5 m-auto text-secondary">
          <button
            type="submit"
            className="btn btn-submit "
            disabled={isSubmitting}
            style={{width:'100%'}}
          >
            {isLoginForm ? 'Login' : 'Register'}
          </button>
          <div className="toggle-form d-flex">
            <p>
              {isLoginForm ? "Don't have an account?" : "Already have an account?"}
             

            </p>
            <p
                type=""
                className="btn-link"
                onClick={toggleForm}
              >
                {isLoginForm ? ' Register here' : ' Login here'}
              </p>
          </div>
        </div>

      </form>
    </div>

  );
};

export default AuthForms;
