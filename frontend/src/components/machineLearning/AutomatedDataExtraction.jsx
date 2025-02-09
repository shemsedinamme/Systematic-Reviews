// AutomatedDataExtraction.js
import React, { useState } from 'react';
import styles from './AutomatedDataExtraction.module.css';

const AutomatedDataExtraction = () => {
  const [textToExtract, setTextToExtract] = useState('');
  const [template, setTemplate] = useState('');
  const [extractionResults, setExtractionResults] = useState(null);
    const token = localStorage.getItem('token');

  const handleTextChange = (e) => {
    setTextToExtract(e.target.value);
  };

   const handleTemplateChange = (e) => {
      setTemplate(e.target.value);
   };


  const handleExtractData = async () => {
       if(!textToExtract){
           alert('Please provide text to extract data from.');
         return;
        }
    try {
          const response = await fetch('http://10.180.50.140:3306/ml/data-extraction', {
            method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`,
            },
           body: JSON.stringify({text: textToExtract, template: template}),
       });

        if (response.ok) {
             const data = await response.json();
           setExtractionResults(data)
             alert('Data extraction completed, check console for data.');
            console.log('Automated data extraction results:', data);
      } else {
          const errorData = await response.json();
          console.error('Failed to extract data:', errorData);
           alert('Failed to extract data.');
      }
   } catch (error) {
      console.error('Error extracting data:', error);
        alert('An error occurred while extracting the data.');
    }
  };

  return (
    <div className={styles.extractionContainer}>
      <h1>Automated Data Extraction</h1>
      <textarea
        placeholder="Enter text for data extraction"
        value={textToExtract}
         onChange={handleTextChange}
         className={styles.textInput}
      />
        <input
            type="text"
             placeholder="Enter extraction template if needed"
            value={template}
            onChange={handleTemplateChange}
            className={styles.templateInput}
         />
       <button onClick={handleExtractData} className={styles.extractButton}>
       Extract Data
      </button>
      {extractionResults &&
        <div className={styles.resultsData}>
            <h3>Extracted Data:</h3>
             {Object.keys(extractionResults).map(key =>(
              <p key={key}>
                  {key} : {extractionResults[key]}
              </p>
           ))}
       </div>
    }
    </div>
  );
};

export default AutomatedDataExtraction;