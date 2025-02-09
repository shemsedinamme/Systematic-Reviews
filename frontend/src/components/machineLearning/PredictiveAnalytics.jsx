// PredictiveAnalytics.js
import React, { useState } from 'react';
import styles from './PredictiveAnalytics.module.css';

const PredictiveAnalytics = () => {
  const [studyData, setStudyData] = useState('');
    const [results, setResults] = useState(null);
    const [predictionType, setPredictionType] = useState('quality');
     const token = localStorage.getItem('token');

  const handleDataChange = (e) => {
    setStudyData(e.target.value);
  };
    const handleTypeChange = (e) => {
        setPredictionType(e.target.value)
    }


  const handlePredict = async () => {
    try {
      const response = await fetch(`http://10.180.50.140:3306/ml/predictive-${predictionType}`, {
        method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`,
            },
        body: JSON.stringify({ studyData: studyData }),
      });

        if (response.ok) {
            const data = await response.json();
             setResults(data);
             alert('Prediction completed, check console for results.');
           console.log(`Predictive analytics results for ${predictionType}:`, data)
         } else {
              const errorData = await response.json();
           console.error('Failed to perform predictive analytics:', errorData);
             alert('Failed to perform predictive analytics.');
        }
      } catch (error) {
         console.error('Error performing predictive analytics:', error);
            alert('An error occurred during predictive analytics.')
     }
  };

  return (
    <div className={styles.predictiveContainer}>
      <h1>Predictive Analytics</h1>
        <select
             value={predictionType}
              onChange={handleTypeChange}
               className={styles.predictSelect}
        >
              <option value="quality">Predict Quality</option>
                <option value="inclusion">Predict Inclusion</option>
           </select>
      <textarea
        placeholder="Enter study data for prediction"
         value={studyData}
        onChange={handleDataChange}
        className={styles.dataInput}
       />
        <button onClick={handlePredict} className={styles.predictButton}>
       Make Prediction
      </button>
        {results &&
           <div className={styles.resultsData}>
               <h3>Prediction results:</h3>
             {Object.keys(results).map(key=>(
                 <p key={key}>{key} : {results[key]}</p>
              ))}
           </div>
        }
    </div>
  );
};

export default PredictiveAnalytics;