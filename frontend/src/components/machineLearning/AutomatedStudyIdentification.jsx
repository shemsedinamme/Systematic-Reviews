// AutomatedStudyIdentification.js
import React, { useState } from 'react';
import styles from './AutomatedStudyIdentification.module.css';

const AutomatedStudyIdentification = () => {
  const [studyData, setStudyData] = useState('');
    const [results, setResults] = useState(null);
    const [feedback, setFeedback] = useState('');
    const token = localStorage.getItem('token');


    const handleDataChange = (e) => {
        setStudyData(e.target.value);
    };

  const handleIdentifyStudy = async () => {
    try {
        const response = await fetch('http://10.180.50.140:3306/ml/study-identification', {
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
           alert('Study identification completed, see console log for results.');
           console.log('Automated study identification results:', data)
       } else {
           const errorData = await response.json();
          console.error('Failed to identify study', errorData);
          alert('Failed to identify study')
        }
      } catch (error) {
        console.error('Error during study identification:', error);
        alert('An error occurred while identifying the study.')
    }
  };

   const handleFeedbackChange = (e) => {
        setFeedback(e.target.value);
   };
 const handleSendFeedback = async () => {
      try {
           const response = await fetch('http://10.180.50.140:3306/ml/study-identification/feedback', {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
               },
             body: JSON.stringify({ feedback: feedback, studyData: studyData }),
           });
            if (response.ok) {
                 alert('Feedback sent successfully.');
                 setFeedback('');
            } else {
                const errorData = await response.json();
                console.error('Failed to send feedback:', errorData);
              alert('Failed to send feedback')
          }
       } catch (error) {
         console.error('Error sending feedback:', error);
          alert('An error occurred while sending feedback.')
      }
    };

  return (
    <div className={styles.identificationContainer}>
      <h1>Automated Study Identification</h1>
        <textarea
           placeholder="Enter study title, abstract, and/or full text"
             value={studyData}
             onChange={handleDataChange}
            className={styles.studyInput}
       />
      <button onClick={handleIdentifyStudy}  className={styles.identifyButton}>Identify Study</button>
    {results &&
        <div className={styles.resultsData}>
         <h3>Results</h3>
         {Object.keys(results).map(key =>(
              <p key={key}>{key} : {results[key]}</p>
          ))}
        </div>
    }
    <div className={styles.feedbackForm}>
         <textarea
              placeholder="Enter feedback on study identification"
              value={feedback}
             onChange={handleFeedbackChange}
              className={styles.feedbackInput}
         />
       <button onClick={handleSendFeedback} className={styles.feedbackButton}>
            Send Feedback
          </button>
         </div>
    </div>
  );
};

export default AutomatedStudyIdentification;