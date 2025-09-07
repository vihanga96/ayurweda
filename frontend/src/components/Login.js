import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaUser, FaLock, FaLeaf } from 'react-icons/fa';
import './Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const { email, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5001/api/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userRole', res.data.role);
            localStorage.setItem('userName', res.data.name);
            setSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                // Redirect based on role
                switch(res.data.role) {
                    case 'admin':
                        navigate('/admin-dashboard');
                        break;
                    case 'doctor':
                        navigate('/doctor-dashboard');
                        break;
                    case 'student':
                        navigate('/student-dashboard');
                        break;
                    case 'patient':
                    default:
                        navigate('/patient-dashboard');
                        break;
                }
            }, 2000);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.msg) {
                setError(err.response.data.msg);
            } else if (err.code === 'ERR_NETWORK') {
                setError('Unable to connect to server. Please check if the backend is running.');
            } else {
                setError('An error occurred during login. Please try again.');
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <div className="logo">
                    <FaLeaf className="leaf-icon" />
                    <h1>Ayurweda</h1>
                </div>
                <h2>Welcome Back</h2>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <form onSubmit={onSubmit}>
                    <div className="form-group">
                        <label>
                            <FaUser className="input-icon" />
                            Email
                        </label>
                        <input 
                            type="email" 
                            name="email" 
                            value={email} 
                            onChange={onChange} 
                            placeholder="Enter your email"
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>
                            <FaLock className="input-icon" />
                            Password
                        </label>
                        <input 
                            type="password" 
                            name="password" 
                            value={password} 
                            onChange={onChange} 
                            placeholder="Enter your password"
                            required 
                        />
                    </div>
                    <button type="submit">Sign In</button>
                </form>
                <p className="redirect-text">
                    Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login; 