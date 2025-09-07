import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaUser, FaLock, FaEnvelope, FaLeaf } from 'react-icons/fa';
import './Register.css';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const { name, email, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5001/api/auth/register', { name, email, password });
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.msg) {
                setError(err.response.data.msg);
            } else if (err.code === 'ERR_NETWORK') {
                setError('Unable to connect to server. Please check if the backend is running.');
            } else {
                setError('An error occurred during registration. Please try again.');
            }
        }
    };

    return (
        <div className="register-container">
            <div className="register-form">
                <div className="logo">
                    <FaLeaf className="leaf-icon" />
                    <h1>Ayurweda</h1>
                </div>
                <h2>Create Patient Account</h2>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <form onSubmit={onSubmit}>
                    <div className="form-group">
                        <label>
                            <FaUser className="input-icon" />
                            Name
                        </label>
                        <input 
                            type="text" 
                            name="name" 
                            value={name} 
                            onChange={onChange} 
                            placeholder="Enter your name"
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>
                            <FaEnvelope className="input-icon" />
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
                    <button type="submit">Sign Up as Patient</button>
                </form>
                <p className="redirect-text">
                    Already have an account? <Link to="/login">Sign In</Link>
                </p>
                <p className="info-text">
                    <small>Note: Only patients can register here. Students and doctors are registered by administrators.</small>
                </p>
            </div>
        </div>
    );
};

export default Register; 