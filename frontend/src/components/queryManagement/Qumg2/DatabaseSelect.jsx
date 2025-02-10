import React, { useState } from 'react';
import styles from './DatabaseSelect.module.css';

const DatabaseSelect = () => {
    const [selectedDatabases, setSelectedDatabases] = useState([]);

    const handleCheckboxChange = (e) => {
        const databaseName = e.target.value;
        if (e.target.checked) {
            setSelectedDatabases([...selectedDatabases, databaseName]);
        } else {
            setSelectedDatabases(selectedDatabases.filter((db) => db !== databaseName));
        }
    };

    return (
        <div className={styles.databaseSelectContainer}>
            <h1>Select Databases</h1>
            <div className={styles.databaseList}>
                <label>
                    <input
                        type="checkbox"
                        value="PubMed"
                        onChange={handleCheckboxChange}
                    />
                    PubMed
                </label>
                <label>
                    <input
                        type="checkbox"
                        value="Scopus"
                        onChange={handleCheckboxChange}
                    />
                    Scopus
                </label>
                <label>
                    <input
                        type="checkbox"
                        value="Web of Science"
                        onChange={handleCheckboxChange}
                    />
                    Web of Science
                </label>
                {/* Add more databases as needed */}
            </div>
            {selectedDatabases.length > 0 && (
                <div className={styles.selectedDatabases}>
                    <h2>Selected Databases</h2>
                    <ul>
                        {selectedDatabases.map((db, index) => (
                            <li key={index}>{db}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DatabaseSelect;
