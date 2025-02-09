import React, { useState } from 'react';
import styles from './SubgroupAnalysis.module.css';
import config from '../config'; // Import the configuration file

const SubgroupAnalysis = ({ projectId }) => {
  const [subgroupCriteria, setSubgroupCriteria] = useState('');
  const [data, setData] = useState('');
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const handleCriteriaChange = (e) => {
    setSubgroupCriteria(e.target.value);
  };

  const handleDataChange = (e) => {
    setData(e.target.value);
  };

  const handlePerformSubgroupAnalysis = async () => {
    if (!subgroupCriteria || !data) {
      setMessage('Please enter subgroup criteria and dataset.');
      return;
    }
    try {
      const response = await fetch(`${config.apiBaseUrl}/subgroup-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subgroup_criteria: subgroupCriteria, data: data }),
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setMessage('Subgroup analysis performed successfully, check console for results.');
        console.log('Subgroup Analysis Results:', data);
      } else {
        const errorData = await response.json();
        console.error('Failed to perform subgroup analysis:', errorData);
        setMessage('Failed to perform subgroup analysis.');
      }
    } catch (error) {
      console.error('Error performing subgroup analysis:', error);
      setMessage('An error occurred while performing subgroup analysis.');
    }
  };

  return (
    <div className={styles.subgroupContainer}>
      <h1>Subgroup Analysis</h1>
      {projectId ? (
        <>
          <input
            type="text"
            placeholder="Enter subgroup criteria"
            value={subgroupCriteria}
            onChange={handleCriteriaChange}
            className={styles.criteriaInput}
          />
          <textarea
            placeholder="Enter dataset for subgroup analysis"
            value={data}
            onChange={handleDataChange}
            className={styles.dataInput}
          />
          <button onClick={handlePerformSubgroupAnalysis} className={styles.analyzeButton}>
            Perform Subgroup Analysis
          </button>
          {message && <p className={styles.message}>{message}</p>}
        </>
      ) : (
        <p>Select a project to perform subgroup analysis.</p>
      )}
    </div>
  );
};

export default SubgroupAnalysis;
