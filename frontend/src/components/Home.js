import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLeaf, FaHeart, FaSpa, FaUserMd } from 'react-icons/fa';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    return (
        <div className="home-container">
            <nav className="navbar">
                <div className="nav-brand">
                    <FaLeaf className="nav-logo" />
                    <h1>Ayurweda</h1>
                </div>
                <div className="nav-links">
                    <a href="#treatments">Treatments</a>
                    <a href="#about">About</a>
                    <a href="#contact">Contact</a>
                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                </div>
            </nav>

            <header className="hero-section">
                <h1>Welcome to Ayurweda</h1>
                <p>Discover the ancient wisdom of Sri Lankan herbal medicine</p>
            </header>

            <section className="features-section">
                <div className="feature-card">
                    <FaHeart className="feature-icon" />
                    <h3>Holistic Healing</h3>
                    <p>Experience traditional healing methods that treat both body and mind</p>
                </div>
                <div className="feature-card">
                    <FaSpa className="feature-icon" />
                    <h3>Natural Remedies</h3>
                    <p>Pure herbal treatments sourced from Sri Lanka's finest ingredients</p>
                </div>
                <div className="feature-card">
                    <FaUserMd className="feature-icon" />
                    <h3>Expert Care</h3>
                    <p>Guided by experienced practitioners of traditional medicine</p>
                </div>
            </section>

            <section className="treatments-section" id="treatments">
                <h2>Featured Treatments</h2>
                <div className="treatments-grid">
                    <div className="treatment-card">
                        <img src="https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Herbal Tea" />
                        <h3>Herbal Tea Therapy</h3>
                        <p>Customized herbal tea blends for various health conditions</p>
                    </div>
                    <div className="treatment-card">
                        <img src="https://images.unsplash.com/photo-1611241893603-3c359704e0ee?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Oil Treatment" />
                        <h3>Therapeutic Oils</h3>
                        <p>Traditional oil treatments for relaxation and healing</p>
                    </div>
                    <div className="treatment-card">
                        <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Herbal Medicine" />
                        <h3>Herbal Medicine</h3>
                        <p>Ancient remedies for modern wellness</p>
                    </div>
                </div>
            </section>

            <section className="health-tips-section">
                <h2>Daily Health Tips</h2>
                <div className="tips-container">
                    <div className="tip">
                        <h4>Morning Routine</h4>
                        <p>Start your day with warm water and fresh herbs to boost metabolism</p>
                    </div>
                    <div className="tip">
                        <h4>Natural Immunity</h4>
                        <p>Strengthen your immune system with traditional herbs and spices</p>
                    </div>
                    <div className="tip">
                        <h4>Mindful Living</h4>
                        <p>Practice mindfulness and meditation for holistic well-being</p>
                    </div>
                </div>
            </section>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3>Contact Us</h3>
                        <p>Email: info@ayurweda.com</p>
                        <p>Phone: +94 11 234 5678</p>
                    </div>
                    <div className="footer-section">
                        <h3>Location</h3>
                        <p>123 Herbal Street</p>
                        <p>Colombo, Sri Lanka</p>
                    </div>
                    <div className="footer-section">
                        <h3>Hours</h3>
                        <p>Mon - Fri: 9:00 AM - 6:00 PM</p>
                        <p>Sat: 9:00 AM - 2:00 PM</p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2024 Ayurweda. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home; 