// AutomatedTextMining.js
import React, { useState } from 'react';
import styles from './AutomatedTextMining.module.css';

const AutomatedTextMining = () => {
  const [text, setText] = useState('');
  const [miningType, setMiningType] = useState('classification');
  const [results, setResults] = useState(null);
    const token = localStorage.getItem('token');


    const handleTextChange = (e) => {
      setText(e.target.value);
    };

    const handleTypeChange = (e) => {
        setMiningType(e.target.value);
    };


  const handlePerformMining = async () => {
     if(!text){
       alert('Please enter a text to perform text mining')
        return
      }
    try {
      const response = await fetch(`http://10.180.50.140:3306/ml/text-${miningType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
         body: JSON.stringify({text: text}),
      });
      if (response.ok) {
        const data = await response.json();
          setResults(data);
          alert('Text mining completed, see the console for the results.')
         console.log('Text mining results:', data);
      } else {
          const errorData = await response.json();
          console.error('Failed to perform text mining:', errorData);
            alert('Failed to perform text mining');
      }
    } catch (error) {
        console.error('Error performing text mining:', error);
          alert('An error occurred while performing text mining');
    }
  };

  return (
    <div className={styles.miningContainer}>
      <h1>Automated Text Mining</h1>
      <select
         value={miningType}
          onChange={handleTypeChange}
           className={styles.typeSelect}
       >
        <option value="classification">Text Classification</option>
          <option value="ner">Named Entity Recognition (NER)</option>
         <option value="sentiment">Sentiment Analysis</option>
        <option value="topic-modeling">Topic Modeling</option>
      </select>
       <textarea
        placeholder="Enter text for mining"
        value={text}
        onChange={handleTextChange}
          className={styles.textInput}
      />
      <button onClick={handlePerformMining} className={styles.analyzeButton}>
        Perform Mining
      </button>
        {results && (
            <div className={styles.results}>
              {Object.keys(results).map(key=> (
                  <p key={key}>
                      {key} : {results[key]}
                  </p>
              ))}
             </div>
            )}

    </div>
  );
};

export default AutomatedTextMining;