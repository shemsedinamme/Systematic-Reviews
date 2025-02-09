// BackupRecovery.js
import React from 'react';
import styles from './BackupRecovery.module.css';

const BackupRecovery = () => {
    const handleInitiateBackup = async () => {
      //TODO Implement API call to backup data.
      alert('Implement a logic to call a backup API')
    };
     const handleTestRecovery = async () => {
        //TODO Implement API call to test recovery.
      alert('Implement API call to test backup recovery.')
    };

  return (
    <div className={styles.backupContainer}>
      <h1>Backup and Recovery</h1>
        <p>Implement Backup and Recovery operation using the API endpoints. A backup will be automatically created every day</p>
        <div className={styles.actions}>
            <button onClick={handleInitiateBackup} className={styles.backupButton}> Initiate Data Backup </button>
             <button onClick={handleTestRecovery} className={styles.testButton}> Test Data Recovery </button>
       </div>
    </div>
  );
};

export default BackupRecovery;