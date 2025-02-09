import React, { useState } from 'react';
import styles from './QueryTranslation.module.css';
import config from '../config';
import { useNotification } from './useNotification';

const QueryTranslation = ({ selectedDatabases }) => {
    const [queryToTranslate, setQueryToTranslate] = useState('');
    const [translatedQueries, setTranslatedQueries] = useState({});
    const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    const handleQueryChange = (e) => {
        setQueryToTranslate(e.target.value);
    };

    const handleTranslateQuery = async () => {
        if (!selectedDatabases || selectedDatabases.length === 0) {
           showNotification({type: 'error', message: 'Please select databases before translating query.'});
          return;
      }
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/search/translate-query`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ query: queryToTranslate, databases: selectedDatabases }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                setTranslatedQueries(data);
             } else {
               const errorData = await response.json();
               showNotification({type: 'error', message: `Failed to translate query: ${errorData.message}`});
                 console.error('Failed to translate query:', errorData);
            }
        } catch (error) {
             showNotification({type: 'error', message: `An error occurred during query translation: ${error.message}`});
            console.error('Error translating query:', error);
        }
    };

    return (
        <div className={styles.translationContainer}>
            <h1>Query Translation</h1>
            {selectedDatabases && selectedDatabases.length > 0 ? (
                <>
                    <textarea
                        placeholder="Enter Query to Translate"
                       value={queryToTranslate}
                       onChange={handleQueryChange}
                        className={styles.translationInput}
                   />
                   <button onClick={handleTranslateQuery} className={styles.translateButton}>
                        Translate
                    </button>
                    <div className={styles.translatedQueries}>
                        {Object.keys(translatedQueries).map((database) => (
                            <div key={database} className={styles.translatedQuery}>
                                <h2>{database}</h2>
                                <p>{translatedQueries[database]}</p>
                            </div>
                        ))}
                   </div>
               </>
            ) : (
                <p>Select Databases in order to Translate.</p>
            )}
        </div>
    );
};

export default QueryTranslation;