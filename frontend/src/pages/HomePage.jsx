import React from 'react';
import styles from './HomePage.module.css';
import Login from './Login';
import Registration from './Registration';
import Post from './Post';

const HomePage = ({ onLoginSuccess }) => {
    return (
        <div className={styles.homePage}>
            <header className={styles.header}>
                <div className={styles.container}>
                    <div className={styles.branding}>
                        <h1>
                            <span className={styles.highlight}>ARMS</span> Review Hub
                        </h1>
                    </div>
                    <nav>
                        <ul className={styles.navMenu}>
                            <li>
                                <a href="#blog">Blog</a>
                            </li>
                            <li>
                                <a href="#home">Home</a>
                            </li>
                            <li>
                                <a href="#about">About</a>
                            </li>
                            <li>
                                <a href="#services">Services</a>
                            </li>
                            <li>
                                <a href="#login">Sign In</a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>
            <section id="showcase" className={styles.showcase}>
                <div className={styles.container}>
                    <h1>Streamlined management for systematic reviews and meta-analyses</h1>
                    <p>Discover ARMS: Transforming Systematic Reviews and Meta-Analyses for Researchers</p>
                </div>
            </section>
            <section id="newsletter" className={styles.newsletter}>
                <div className={styles.container}>
                    <h1>Subscribe To Our Updates</h1>
                    <form>
                        <input type="email" placeholder="Enter Email..." required />
                        <button type="submit" className={styles.button1}>
                            Subscribe
                        </button>
                    </form>
                </div>
            </section>
            <section id="login" className={styles.loginSection}>
                <Login onLoginSuccess={onLoginSuccess} />
            </section>
            <section id="registration" className={styles.registrationSection}>
                <Registration />
            </section>
            <section id="boxes" className={styles.boxes}>
                <Post />
            </section>
            <footer className={styles.footer}>
                <p>Review Hub Net, Copyright © 2024</p>
            </footer>
        </div>
    );
};

export default HomePage;