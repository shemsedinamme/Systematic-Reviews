import React, { useState, useEffect } from 'react';
import styles from './ProtocolVersion.module.css';
import config from '../config';
import { useNotification } from './useNotification';


const ProtocolVersion = ({ protocolId }) => {
    const [versions, setVersions] = useState([]);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [versionContent, setVersionContent] = useState(null);
    const { showNotification } = useNotification();
     const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchVersionHistory = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/protocols/${protocolId}/versions`,
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
                   setVersions(data);
              } else {
                 const errorData = await response.json();
                    showNotification({type: 'error', message: `Failed to fetch version history: ${errorData.message}`});
                   console.error('Failed to fetch version history');
               }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching version history: ${error.message}`});
                console.error('Error fetching version history:', error);
            }
        };
        if(protocolId)
            fetchVersionHistory();
  }, [protocolId, showNotification, token]);


 const handleViewVersion = async (versionId) => {
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/versions/${versionId}`,
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
                setVersionContent(data.content);
               setSelectedVersion(versionId);
            } else {
               const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to view version: ${errorData.message}`});
               console.error('Failed to view version');
           }
        } catch (error) {
             showNotification({type: 'error', message: `Error viewing version: ${error.message}`});
          console.error('Error viewing version:', error);
       }
    };

    const handleRevertVersion = async (versionId) => {
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/protocols/${protocolId}/versions/${versionId}/revert`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                   },
                }
             );
            if (response.ok) {
               showNotification({type: 'success', message: 'Protocol version reverted successfully'});
            } else {
                const errorData = await response.json();
               showNotification({type: 'error', message: `Failed to revert to version: ${errorData.message}`});
                 console.error('Failed to revert to version');
             }
        } catch (error) {
             showNotification({type: 'error', message: `Error reverting to version: ${error.message}`});
          console.error('Error reverting to version:', error);
      }
   };
    if (!protocolId) {
        return <p>Select a protocol to manage versions.</p>;
    }
    return (
        <div className={styles.versionContainer}>
           <h1>Protocol Version History</h1>
          {versions && (
            <div className={styles.versionList}>
                <ul>
                    {versions.map((version) => (
                        <li key={version.version_id} className={styles.versionItem}>
                            Version: {version.version_id} - Date: {new Date(version.version_date).toLocaleString()}
                            <button onClick={()=>handleViewVersion(version.version_id)} className={styles.viewButton}>View</button>
                             <button onClick={()=>handleRevertVersion(version.version_id)} className={styles.revertButton}>Revert</button>
                        </li>
                     ))}
                </ul>
            </div>
         )}
           {selectedVersion &&  versionContent &&
              <div className={styles.versionContent}>
                  <h3>Version : {selectedVersion}</h3>
                  <p>Content: {versionContent}</p>
               </div>
          }
       </div>
    );
};

export default ProtocolVersion;