import React, { useState } from 'react';
import styles from './DataAggregation.module.css';
import config from '../config'; // Import the configuration file

const DataAggregation = ({ projectId }) => {
    const [dataField, setDataField] = useState('');
    const [aggregatedData, setAggregatedData] = useState(null);
    const [message, setMessage] = useState('');
    const token = localStorage.getItem('token');

    const handleAggregateData = async () => {
        if (!dataField) {
            setMessage('Please enter data field for aggregation.');
            return;
        }
        try {
            const response = await fetch(`${config.apiBaseUrl}/synthesis/aggregate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ project_id: projectId, data_field: dataField }),
            });
            if (response.ok) {
                const data = await response.json();
                setAggregatedData(data);
                setMessage('Data Aggregated Successfully, check the console for data');
                console.log('Aggregated Data:', data);
            } else {
                const errorData = await response.json();
                console.error('Failed to aggregate data:', errorData);
                setMessage('Failed to Aggregate data.');
            }
        } catch (error) {
            console.error('Error during data aggregation:', error);
            setMessage('Error during data aggregation.');
        }
    };

    return (
        <div className={styles.aggregationContainer}>
            <h1>Data Aggregation and Summarization</h1>
            {projectId ? (
                <>
                    <input
                        type="text"
                        placeholder="Enter the data field for aggregation (e.g., sample_size)"
                        value={dataField}
                        onChange={(e) => setDataField(e.target.value)}
                        className={styles.dataInput}
                    />
                    <button onClick={handleAggregateData} className={styles.aggregateButton}>Aggregate Data</button>
                    {message && <p className={styles.message}>{message}</p>}
                </>
            ) : (
                <p>Select a project to perform data aggregation.</p>
            )}
        </div>
    );
};

export default DataAggregation;
