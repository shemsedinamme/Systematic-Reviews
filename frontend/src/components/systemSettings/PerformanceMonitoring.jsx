// PerformanceMonitoring.js
import React, { useState, useEffect } from 'react';
import styles from './PerformanceMonitoring.module.css';

const PerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState(null);
  const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchMetrics = async () => {
             try {
                  const response = await fetch('http://10.180.50.140:3306/admin/monitoring', {
                    method: 'GET',
                       headers: {
                        'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                      },
                 });
                if (response.ok) {
                    const data = await response.json();
                     setMetrics(data);
                } else {
                    console.error('Failed to fetch system metrics');
                 }
            } catch (error) {
               console.error('Error fetching system metrics:', error);
            }
        };
        fetchMetrics();
    }, []);


   if (!metrics) {
     return <p>Loading system metrics...</p>;
  }

  return (
    <div className={styles.monitoringContainer}>
      <h1>System Monitoring and Performance</h1>
      <div className={styles.metricsDisplay}>
            <p><strong>CPU Usage:</strong> {metrics.cpu_usage} %</p>
          <p><strong>Memory Usage:</strong> {metrics.memory_usage} MB</p>
          <p><strong>Disk I/O:</strong> {metrics.disk_io} KB/s</p>
         {/* Implement a graph using metrics data if required.  */}
      </div>
    </div>
  );
};

export default PerformanceMonitoring;