import React, { useState } from 'react';
import styles from './NetworkMetaAnalysis.module.css';
import config from '../config'; // Import the configuration file

const NetworkMetaAnalysis = ({ projectId }) => {
  const [data, setData] = useState('');
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const handleDataChange = (e) => {
    setData(e.target.value);
  };

  const handlePerformAnalysis = async () => {
    if (!data) {
      setMessage('Please enter dataset for Network meta analysis');
      return;
    }
    try {
      const response = await fetch(`${config.apiBaseUrl}/network-meta-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ data: data }),
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setMessage('Network meta analysis performed successfully, check console for results.');
        console.log('Network Meta-Analysis Results:', data);
      } else {
        const errorData = await response.json();
        console.error('Failed to perform network meta analysis:', errorData);
        setMessage('Failed to perform network meta analysis.');
      }
    } catch (error) {
      console.error('Error performing network meta-analysis:', error);
      setMessage('An error occurred while performing network meta analysis.');
    }
  };

  return (
    <div className={styles.networkMetaContainer}>
      <h1>Network Meta-Analysis</h1>
      {projectId ? (
        <>
          <textarea
            placeholder="Enter dataset for network meta analysis"
            value={data}
            onChange={handleDataChange}
            className={styles.dataInput}
          />
          <button onClick={handlePerformAnalysis} className={styles.analyzeButton}>
            Perform Network Meta-Analysis
          </button>
          {message && <p className={styles.message}>{message}</p>}
        </>
      ) : (
        <p>Select a project to perform network meta analysis</p>
      )}
    </div>
  );
};

export default NetworkMetaAnalysis;
