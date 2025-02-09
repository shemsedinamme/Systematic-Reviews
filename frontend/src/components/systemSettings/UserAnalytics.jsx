// UserAnalytics.js
import React, { useState, useEffect } from 'react';
import styles from './UserAnalytics.module.css';

const UserAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
         const fetchAnalytics = async () => {
          try {
            const response = await fetch('http://10.180.50.140:3306/admin/analytics', {
              method: 'GET',
                 headers: {
                    'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                 },
            });
            if (response.ok) {
                  const data = await response.json();
                 setAnalyticsData(data);
              } else {
                  console.error('Failed to fetch user analytics data');
              }
         } catch (error) {
            console.error('Error fetching user analytics data:', error);
         }
      };
      fetchAnalytics();
   }, []);

   if (!analyticsData) {
        return <p>Loading user analytics...</p>;
   }
  return (
    <div className={styles.analyticsContainer}>
      <h1>User Analytics</h1>
       {analyticsData &&
        <div className={styles.analyticsDisplay}>
            <p> <strong>Total Users:</strong> {analyticsData.total_users}</p>
            <p><strong>Active Users:</strong> {analyticsData.active_users}</p>
            <p><strong>Average Time spent per user:</strong> {analyticsData.average_time_spent} mins</p>
            </div>}
    </div>
  );
};

export default UserAnalytics;