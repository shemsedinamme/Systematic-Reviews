import React, { useState } from 'react';
import styles from './AutomatedQuery.module.css';
import config from '../config';
import { useNotification } from './useNotification';


const AutomatedQuery = ({ selectedDatabases }) => {
    const [keywords, setKeywords] = useState('');
    const [pico, setPico] = useState({
        population: '',
        intervention: '',
        comparison: '',
        outcome: '',
    });
    const [generatedQuery, setGeneratedQuery] = useState('');
     const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    const handleInputChange = (e) => {
      if (e.target.name === 'keywords') {
           setKeywords(e.target.value);
      } else {
           setPico({ ...pico, [e.target.name]: e.target.value });
       }
   };
   const handleGenerateQuery = async (type) => {
       try {
          const endpoint = type === 'keywords' ? `${config.apiBaseUrl}/search/generate-query` : `${config.apiBaseUrl}/search/generate-query`;
            const queryParams = type === 'keywords' ? { keywords: keywords } : { ...pico };
          const response = await fetch(endpoint, {
                method: 'POST',
               headers: {
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${token}`,
              },
               body: JSON.stringify(queryParams),
            });

            if (response.ok) {
               const data = await response.json();
                setGeneratedQuery(data.query);
            } else {
                const errorData = await response.json();
                  showNotification({type: 'error', message: `Failed to generate query: ${errorData.message}`});
                 console.error('Failed to generate query:', errorData);
            }
        } catch (error) {
            showNotification({type: 'error', message: `An error occurred during query generation: ${error.message}`});
            console.error('Error generating query:', error);
       }
   };

  return (
        <div className={styles.automatedQueryContainer}>
            <h1>Automated Query Generation</h1>
            <div className={styles.keywordQuery}>
                <h2>Keyword-Based Search</h2>
                <textarea
                    placeholder="Enter keywords separated by commas"
                     name="keywords"
                     value={keywords}
                   onChange={handleInputChange}
                    className={styles.queryInput}
                 />
                <button onClick={() => handleGenerateQuery('keywords')} className={styles.generateButton}>
                   Generate Query
                </button>
             </div>
           <div className={styles.picoQuery}>
                <h2>PICO-Based Search</h2>
                  <input
                    type="text"
                   placeholder="Population"
                    name="population"
                     value={pico.population}
                    onChange={handleInputChange}
                      className={styles.picoInput}
                />
                 <input
                     type="text"
                   placeholder="Intervention"
                    name="intervention"
                   value={pico.intervention}
                     onChange={handleInputChange}
                   className={styles.picoInput}
                 />
                <input
                    type="text"
                     placeholder="Comparison"
                     name="comparison"
                    value={pico.comparison}
                    onChange={handleInputChange}
                   className={styles.picoInput}
                 />
               <input
                    type="text"
                   placeholder="Outcome"
                    name="outcome"
                     value={pico.outcome}
                    onChange={handleInputChange}
                   className={styles.picoInput}
                />
               <button onClick={() => handleGenerateQuery('pico')} className={styles.generateButton}>
                    Generate Query
                </button>
            </div>
           <div className={styles.generatedQuery}>
                <h2>Generated Query:</h2>
                 <textarea
                     value={generatedQuery}
                     placeholder="Generated query"
                      readOnly
                     className={styles.queryTextarea}
                 />
           </div>
       </div>
    );
};

export default AutomatedQuery;