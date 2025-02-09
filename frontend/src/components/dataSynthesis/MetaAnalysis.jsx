import React, { useState } from 'react';
import styles from './MetaAnalysis.module.css';
import config from '../config'; // Import the configuration file

const MetaAnalysis = ({ projectId }) => {
  const [analysisType, setAnalysisType] = useState('');
  const [data, setData] = useState('');
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const handleTypeChange = (e) => {
    setAnalysisType(e.target.value);
  };

  const handleDataChange = (e) => {
    setData(e.target.value);
  };

  const handlePerformMetaAnalysis = async () => {
    if (!analysisType || !data) {
      setMessage('Please select a meta-analysis method and provide data');
      return;
    }
    try {
      const response = await fetch(`${config.apiBaseUrl}/meta-analysis/${analysisType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ data: data }),
      });
      if (response.ok) {
        const results = await response.json();
        setResults(results);
        setMessage('Meta-analysis performed successfully, check console for results.');
        console.log('Meta Analysis results:', results);
      } else {
        const errorData = await response.json();
        console.error('Failed to perform meta analysis:', errorData);
        setMessage('Failed to perform meta analysis.');
      }
    } catch (error) {
      console.error('Error performing meta-analysis:', error);
      setMessage('Error performing meta analysis.');
    }
  };

  return (
    <div className={styles.metaAnalysisContainer}>
      <h1>Meta-Analysis</h1>
      {projectId ? (
        <>
          <select
            value={analysisType}
            onChange={handleTypeChange}
            className={styles.analysisSelect}
          >
            <option value="" disabled>Select Meta-Analysis Type</option>
            <option value="fixed-effect">Fixed-Effect</option>
            <option value="random-effect">Random-Effect</option>
            <option value="sensitivity">Sensitivity Analysis</option>
            <option value="publication-bias">Publication Bias</option>
          </select>
          <textarea
            placeholder="Enter dataset for meta analysis"
            value={data}
            onChange={handleDataChange}
            className={styles.dataInput}
          />
          <button onClick={handlePerformMetaAnalysis} className={styles.metaButton}>
            Perform Meta-Analysis
          </button>
          {message && <p className={styles.message}>{message}</p>}
        </>
      ) : (
        <p>Select a project to perform meta analysis.</p>
      )}
    </div>
  );
};

export default MetaAnalysis;
