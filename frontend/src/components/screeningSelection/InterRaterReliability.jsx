import React, { useState, useEffect } from 'react';
import styles from './InterRaterReliability.module.css';
import config from '../config';
import { useNotification } from './useNotification';


const InterRaterReliability = ({ projectId }) => {
    const [reliability, setReliability] = useState(null);
    const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchReliability = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/screening/inter-rater-reliability?project_id=${projectId}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    setReliability(data);
               } else {
                   const errorData = await response.json();
                    showNotification({type: 'error', message: `Failed to fetch inter-rater reliability: ${errorData.message}`});
                     console.error('Failed to fetch inter-rater reliability');
                 }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching inter-rater reliability: ${error.message}`});
                console.error('Error fetching inter-rater reliability:', error);
            }
        };
         if(projectId){
           fetchReliability();
         }

  }, [projectId, showNotification, token]); //Include showNotification and token in dependency array

    if (!projectId) {
        return <p>Select a project to view the inter-rater reliability.</p>;
    }

    return (
        <div className={styles.reliabilityContainer}>
            <h1>Inter-Rater Reliability Assessment</h1>
             {reliability ? (
                <div className={styles.reliabilityData}>
                    <p>
                        <strong>Cohen's Kappa:</strong> {reliability.cohens_kappa}
                    </p>
                   <p>
                        <strong>Fleiss' Kappa:</strong> {reliability.fleiss_kappa}
                    </p>
                </div>
            ) : (
                <p>Inter-rater reliability data is not available.</p>
            )}
        </div>
    );
};

export default InterRaterReliability;