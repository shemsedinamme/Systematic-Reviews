// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom'; // Import useHistory
import styles from './Dashboard.module.css';
import { mainListItems, getMenuItems } from './ListItems'; // Updated import
import SimpleTable from './SimpleTable';
import config from '../../config';
import { useNotification } from '../hooks/useNotification';


const Dashboard = () => {
  const [menuItems, setMenuItems] = useState([]);
  const { showNotification } = useNotification();
  const history = useHistory(); // Initialize useHistory hook
  const token = localStorage.getItem('token');


  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const menu = getMenuItems(data.role);
          setMenuItems(menu);
        } else {
          const errorData = await response.json();
          showNotification({ type: 'error', message: `Failed to fetch user profile data: ${errorData.message}` });
          console.error('Failed to fetch user profile');
        }
      } catch (error) {
        showNotification({ type: 'error', message: `Error during user data fetching ${error.message}` });
        console.error('Error fetching user profile data:', error);
      }
    };
    fetchMenuItems();
  }, [showNotification, token]);
  const handleLogout = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok)
      {
        localStorage.removeItem('token'); // clear the token on frontend.
        history.push('/login'); // redirect to login page by useHistory
        showNotification({ type: 'success', message: 'Logged out successfully' });
      } else {
        const errorData = await response.json();
        showNotification({ type: 'error', message: `Error while logging out ${errorData.message}` })
        console.error("error while logout:", errorData)
      }
    } catch (error) {
      showNotification({ type: 'error', message: `Error during logout: ${error.message}` });
      console.error("logout error:", error);
    }
  };
  return (
    <div className={styles.dashboardContainer}>
             <header className={styles.dashboardHeader}>
                  <h1><span className={styles.highlight}>ARMS</span> Review Hub</h1>
                <button onClick={handleLogout} type="button">Logout</button>
              </header>

            <nav className={styles.adminTaskbar}>
                  {menuItems && menuItems.map((menu, index) => (
                   <div key={index}>
                      <h2>{menu.title}</h2>
                      <ul>
                        {menu.items.map((item, i) =>(
                           <li key={i}>
                               <Link to={item.path}>{item.label}</Link>
                           </li>
                           ))}
                     </ul>
                        {menu.subMenus && menu.subMenus.map((subMenu, j) => (
                           <div key={j} className={styles.subMenu}>
                               <h3>{subMenu.title}</h3>
                              <ul>
                                 {subMenu.items.map((item, k) =>(
                                     <li key={k}>
                                         <Link to={item.path}>{item.label}</Link>
                                     </li>
                                    ))}
                                 </ul>
                             </div>
                         ))}
                     </div>
                 ))}
              </nav>
           <main className={styles.dashboardGrid}>
             <section className={styles.dashboardSection} style={{backgroundColor: 'lemonchiffon'}}>
                <h2>Projects Table</h2>
                 <SimpleTable/>
             </section>
           <section className={styles.icon} style={{ backgroundImage: `url(/frontend/public/img/showcase.jpg")`}} />
             </main>
          <footer className={styles.dashboardFooter}>
             <p>© 2025 ARMS. All Rights Reserved.</p>
            </footer>
        </div>
  );
};
export default Dashboard;