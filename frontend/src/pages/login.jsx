// login.jsx
import React, { useState } from 'react';
import styles from './Login.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [usernameEmail, setUsernameEmail] = useState('');
    const [password, setPassword] = useState('');
    const { showNotification } = useNotification();
    const navigate = useNavigate(); // Initialize useNavigate

    const handleTogglePassword = () => {
        setShowPassword(!showPassword);
    };

    const handleLogin = async () => {
        if (!usernameEmail || !password) {
            showNotification({ type: 'error', message: 'Please fill in all required fields.' });
            return;
        }
        try {
            const response = await fetch(`${config.apiBaseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernameEmail, password }),
            });

            if (response.ok) {
              showNotification({ type: 'success', message: 'Login successful!' });
                // Redirect to the user dashboard using navigate from react router
               navigate('/dashboard');
            } else {
                 const errorData = await response.json();
                 showNotification({ type: 'error', message: `Invalid login credentials. Please try again.: ${errorData.message}` });
            }
        } catch (error) {
             showNotification({ type: 'error', message: `An error occurred. Please try again later: ${error.message}` });
            console.error('Error:', error);
        }
    };

    const handleForgotPassword = async () => {
        if (!usernameEmail) {
              showNotification({ type: 'error', message: 'Please enter your email to reset your password.' });
              return;
         }
         try {
            // Send a password reset request
             const response = await fetch(`${config.apiBaseUrl}/reset-password-request`, { // Updated endpoint here
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: usernameEmail }),
            });
            if (response.ok) {
                showNotification({ type: 'success', message: 'Password reset email sent successfully. Please check your inbox.' });
            } else {
                  const errorData = await response.json();
                  showNotification({ type: 'error', message: `Unable to send password reset email. Please try again later: ${errorData.message}` });
             }
         } catch (error) {
             showNotification({ type: 'error', message: `An error occurred. Please try again later: ${error.message}` });
            console.error('Error:', error);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <h1 style={{ textAlign: 'right', color: 'white' }}>Sign In</h1>
            <div className={styles.inputGroup}>
                <input
                    type="text"
                    id="usernameEmail"
                    name="usernameEmail"
                    placeholder="Username or Email..."
                    required
                    onChange={(e) => setUsernameEmail(e.target.value)}
                />
            </div>
            <div style={{ position: 'relative' }}>
                <input
                    type={showPassword ? 'text' : 'password'}
                    id="loginPassword"
                    name="password"
                    placeholder="Enter password..."
                    required
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    type="button"
                    id="togglePassword"
                    onClick={handleTogglePassword}
                    className={styles.togglePassword}
                >
                    {showPassword ? 'Hide' : 'Show'}
                </button>
            </div>
            <div style={{ textAlign: 'right', margin: '10px 0' }}>
                <a href="#" id="forgotPassword" style={{ color: '#35424a', fontSize: '14px' }} onClick={handleForgotPassword}>Forgot Password?</a>
            </div>
            <button type="button" id="loginButton" className={styles.button1} onClick={handleLogin}>
                Login
            </button>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <button type="button" className={styles.button1}>
                   <a href="/registration" style={{color:'white', textDecoration: 'none'}}>Create Account</a>
                </button>
            </div>
        </div>
    );
};

export default Login;