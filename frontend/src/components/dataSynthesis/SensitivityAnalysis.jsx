import React, { useState } from 'react';
import styles from './SensitivityAnalysis.module.css';
import config from '../config'; // Import the configuration file

const SensitivityAnalysis = ({ projectId }) => {
  const [sensitivitySettings, setSensitivitySettings] = useState('');
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const handleSettingsChange = (e) => {
    setSensitivitySettings(e.target.value);
  };

  const handlePerformSensitivityAnalysis = async () => {
    if (!sensitivitySettings) {
      setMessage('Please provide settings for the sensitivity analysis');
      return;
    }
    try {
      const response = await fetch(`${config.apiBaseUrl}/sensitivity-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: sensitivitySettings }),
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setMessage('Sensitivity analysis performed successfully, check console for results.');
        console.log('Sensitivity Analysis results:', data);
      } else {
        const errorData = await response.json();
        console.error('Failed to perform sensitivity analysis:', errorData);
        setMessage('Failed to perform sensitivity analysis.');
      }
    } catch (error) {
      console.error('Error performing sensitivity analysis:', error);
      setMessage('An error occurred while performing sensitivity analysis.');
    }
  };

  return (
    <div className={styles.sensitivityContainer}>
      <h1>Sensitivity Analysis</h1>
      {projectId ? (
        <>
          <textarea
            placeholder="Enter sensitivity analysis settings"
            value={sensitivitySettings}
            onChange={handleSettingsChange}
            className={styles.settingInput}
          />
          <button onClick={handlePerformSensitivityAnalysis} className={styles.analyzeButton}>
            Perform Sensitivity Analysis
          </button>
          {message && <p className={styles.message}>{message}</p>}
        </>
      ) : (
        <p>Select a project to perform sensitivity analysis.</p>
      )}
    </div>
  );
};

export default SensitivityAnalysis;
