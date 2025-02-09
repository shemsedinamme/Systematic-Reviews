import React, { useState } from 'react';
import styles from './NarrativeSynthesis.module.css';
import config from '../config'; // Import the configuration file

const NarrativeSynthesis = ({ projectId }) => {
  const [codingData, setCodingData] = useState('');
  const [themes, setThemes] = useState('');
  const [summary, setSummary] = useState('');
  const [metaData, setMetaData] = useState('');
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const handleCodeChange = (e) => {
    setCodingData(e.target.value);
  };

  const handleThemeChange = (e) => {
    setThemes(e.target.value);
  };

  const handleMetaDataChange = (e) => {
    setMetaData(e.target.value);
  };

  const handlePerformSynthesis = async () => {
    if (!codingData) {
      setMessage('Please enter coding data.');
      return;
    }
    try {
      const response = await fetch(`${config.apiBaseUrl}/narrative-synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ data: codingData, themes: themes, metadata: metaData }),
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setMessage('Narrative synthesis done successfully. Check the console for summary and the themes.');
        console.log('Narrative synthesis results:', data);
      } else {
        const errorData = await response.json();
        console.error('Failed to perform narrative synthesis', errorData);
        setMessage('Failed to perform narrative synthesis');
      }
    } catch (error) {
      console.error('Error performing narrative synthesis:', error);
      setMessage('Error performing narrative synthesis.');
    }
  };

  return (
    <div className={styles.synthesisContainer}>
      <h1>Narrative Synthesis</h1>
      {projectId ? (
        <>
          <textarea
            placeholder="Enter data for qualitative data coding"
            value={codingData}
            onChange={handleCodeChange}
            className={styles.dataInput}
          />
          <textarea
            placeholder="Enter themes associated with the data"
            value={themes}
            onChange={handleThemeChange}
            className={styles.dataInput}
          />
          <textarea
            placeholder="Enter metadata"
            value={metaData}
            onChange={handleMetaDataChange}
            className={styles.dataInput}
          />
          <button onClick={handlePerformSynthesis} className={styles.synthesisButton}>
            Perform Narrative Synthesis
          </button>
          {summary && (
            <div className={styles.summaryData}>
              <h2>Generated Summary</h2>
              <p>{summary}</p>
            </div>
          )}
          {message && <p className={styles.message}>{message}</p>}
        </>
      ) : (
        <p>Select a project to perform narrative synthesis.</p>
      )}
    </div>
  );
};

export default NarrativeSynthesis;
