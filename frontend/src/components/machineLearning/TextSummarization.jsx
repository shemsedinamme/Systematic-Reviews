// TextSummarization.js
import React, { useState } from 'react';
import styles from './TextSummarization.module.css';

const TextSummarization = () => {
  const [textToSummarize, setTextToSummarize] = useState('');
    const [summaryResults, setSummaryResults] = useState(null)
    const token = localStorage.getItem('token');
  const handleTextChange = (e) => {
    setTextToSummarize(e.target.value);
  };


  const handleSummarizeText = async () => {
      if(!textToSummarize){
          alert('Please provide text to summarize.')
        return
      }
      try {
           const response = await fetch('http://10.180.50.140:3306/ml/text-summarization', {
             method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            body: JSON.stringify({text: textToSummarize}),
         });
        if (response.ok) {
           const data = await response.json();
             setSummaryResults(data);
             alert('Text summarization completed, check the console for summary')
               console.log('Text summarization Results:', data);
          } else {
            const errorData = await response.json();
              console.error('Failed to summarize text:', errorData);
               alert('Failed to summarize text')
         }
       } catch (error) {
          console.error('Error summarizing text:', error);
         alert('An error occurred while summarizing text')
     }
  };
  return (
    <div className={styles.summarizationContainer}>
      <h1>Automated Text Summarization</h1>
      <textarea
          placeholder="Enter text to summarize"
          value={textToSummarize}
          onChange={handleTextChange}
          className={styles.textInput}
      />
      <button onClick={handleSummarizeText} className={styles.summarizeButton}>
         Summarize Text
      </button>
        {summaryResults &&
            <div className={styles.summaryData}>
                <h3>Summary :</h3>
              <p>{summaryResults.summary}</p>
            </div>
        }
    </div>
  );
};

export default TextSummarization;