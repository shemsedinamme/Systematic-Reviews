import React, { useState, useEffect } from 'react';
import styles from './ProjectShare.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import ProjectShareModel from '../models/projectShare.model';

const ProjectShare = ({ projectId }) => {
    const [shareWith, setShareWith] = useState('');
    const [accessType, setAccessType] = useState('read-only');
    const [shareLink, setShareLink] = useState('');
    const [password, setPassword] = useState('');
    const { showNotification } = useNotification();
    const token = localStorage.getItem('token');


    const handleFetchShareLink = async () => {
        if (!projectId) return;
      try {
          const response = await fetch(
               `${config.apiBaseUrl}/projects/${projectId}/share`,
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
                  const newProjectShare = new ProjectShareModel(data)
                setShareLink(newProjectShare.share_link_id ? `http://localhost:3000/projects/shared/${newProjectShare.share_link_id}` : '');
          } else {
              const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to fetch share link: ${errorData.message}`});
                 console.error('Failed to fetch share link');
            }
      } catch (error) {
             showNotification({type: 'error', message: `Error fetching share link: ${error.message}`});
            console.error('Error fetching share link:', error);
       }
  };

    const handleShareProject = async () => {
        if (!shareWith) {
           showNotification({type: 'error', message: 'Share with user is required'});
            return;
        }
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/projects/${projectId}/share`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ share_with: shareWith, access_type: accessType }),
                }
            );
            if (response.ok) {
               showNotification({type: 'success', message: `Project shared successfully!`});
                 setShareWith('');
                setAccessType('read-only');
             } else {
                  const errorData = await response.json();
                  showNotification({type: 'error', message: `Failed to share project: ${errorData.message}`});
                  console.error('Failed to share project: ', errorData);
              }
        } catch (error) {
            showNotification({type: 'error', message: `An error occurred during share: ${error.message}`});
            console.error('Error sharing project:', error);
        }
    };

    const handleGenerateShareLink = async () => {
        if (!password) {
           showNotification({type: 'error', message: 'Please provide a password for the share link.'});
            return;
       }
       try {
           const response = await fetch(
              `${config.apiBaseUrl}/projects/${projectId}/share`,
                {
                   method: 'POST',
                   headers: {
                        'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`,
                   },
                   body: JSON.stringify({ share_link: true, password: password }),
               }
          );
          if (response.ok) {
              const data = await response.json();
             const newProjectShare = new ProjectShareModel(data);
               showNotification({type: 'success', message: 'Share link generated successfully!'});
               setShareLink(newProjectShare.share_link_id ? `http://localhost:3000/projects/shared/${newProjectShare.share_link_id}` : '');
               setPassword('');
           } else {
               const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to generate share link: ${errorData.message}`});
               console.error('Failed to generate share link:', errorData);
           }
        } catch (error) {
             showNotification({type: 'error', message: `An error occurred generating share link.: ${error.message}`});
             console.error('Error generating share link:', error);
        }
    };
  
    return (
        <div className={styles.shareContainer}>
            <h1>Project Sharing</h1>
            {projectId ? (
                <>
                    <div className={styles.shareForm}>
                        <input
                            type="text"
                            placeholder="Share with user (email or username)"
                            value={shareWith}
                            onChange={(e) => setShareWith(e.target.value)}
                            className={styles.shareInput}
                        />
                        <select
                            value={accessType}
                            onChange={(e) => setAccessType(e.target.value)}
                            className={styles.accessSelect}
                        >
                            <option value="read-only">Read Only</option>
                            <option value="read-write">Read Write</option>
                        </select>
                        <button onClick={handleShareProject} className={styles.shareButton}>
                            Share Project
                        </button>
                    </div>
                    <div className={styles.shareLink}>
                         <input
                              type="password"
                              placeholder="Enter password for share link"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className={styles.shareInput}
                         />
                       <button onClick={handleGenerateShareLink} className={styles.shareButton}>
                           Generate Share Link
                       </button>
                       {shareLink && (
                           <p>
                               Share Link:
                               <a href={shareLink} target="_blank" rel="noopener noreferrer">
                                   {shareLink}
                               </a>
                           </p>
                       )}
                   </div>
                  <button  onClick={handleFetchShareLink} className={styles.shareButton} style={{margin: '10px 0px 0px 20px'}}>Fetch Share Link</button>
                 </>
             ) : (
                <p>Select a project to manage project sharing.</p>
            )}
        </div>
    );
};

export default ProjectShare;
