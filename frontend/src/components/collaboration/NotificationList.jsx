// NotificationList.js
import React, { useState, useEffect } from 'react';
import styles from './NotificationList.module.css';
import config from '../config'; // Configuration file

const NotificationList = ({ projectId }) => {
  const [notifications, setNotifications] = useState([]);
  const token = localStorage.getItem('token');


    useEffect(() => {
        const fetchNotifications = async () => {
           try {
                const response = await fetch(`${config.apiBaseUrl}/notifications`, {
                   method: 'GET',
                     headers: {
                         'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                     },
                });
               if (response.ok) {
                   const data = await response.json();
                 setNotifications(data);
              } else {
                 console.error('Failed to fetch notifications.');
               }
           } catch (error) {
             console.error('Error fetching notifications:', error);
           }
        };
        fetchNotifications();
    }, [projectId]);
    const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/notifications/${notificationId}`, {
             method: 'PUT',
             headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        if (response.ok) {
            setNotifications(notifications.map((notification) =>
                notification.notification_id === notificationId ? { ...notification, status: 'read' } : notification
                ));
        } else {
             console.error('Failed to mark notification as read');
              alert('Failed to mark notification as read');
        }
     } catch (error) {
      console.error('Error marking notification as read:', error);
       alert('Error marking notification as read');
     }

    };


  if(!projectId)
        return <p>Select a project to view notifications.</p>;

    if(!notifications || notifications.length === 0)
        return <p> No new notifications.</p>

  return (
    <div className={styles.notificationContainer}>
      <h1>Notifications</h1>
      <ul className={styles.notificationList}>
        {notifications.map((notification) => (
            <li key={notification.notification_id} className={`${styles.notificationItem} ${notification.status === 'read' ? styles.read : ''}`}>
                 <span>{notification.message}</span>
                 <span className={styles.timestamp}> {new Date(notification.time).toLocaleString()}</span>
                 {notification.status === 'unread' && (
                    <button onClick={() => markAsRead(notification.notification_id)} className={styles.markReadButton}>
                    Mark as Read
                     </button>
                     )}
            </li>
          ))}
      </ul>
    </div>
  );
};

export default NotificationList;