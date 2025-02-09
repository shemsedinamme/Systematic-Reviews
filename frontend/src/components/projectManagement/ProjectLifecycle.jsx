import React, { useState, useEffect } from 'react';
import styles from './ProjectLifecycle.module.css';
import config from '../config';
import { useNotification } from './useNotification'; // Import the notification hook
import ProjectLifecycleModel from '../models/projectLifecycle.model';

const ProjectLifecycle = ({ projectId }) => {
    const [lifecycleState, setLifecycleState] = useState('');
    const { showNotification } = useNotification(); // Initialize notification hook
    const token = localStorage.getItem('token');


    useEffect(() => {
        const fetchLifecycleState = async () => {
            if (!projectId) return;
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/projects/${projectId}/lifecycle`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    const lifecycle = new ProjectLifecycleModel(data);
                    setLifecycleState(lifecycle.state);
                 } else {
                     const errorData = await response.json();
                     showNotification({type: 'error', message: `Failed to fetch project lifecycle state: ${errorData.message}`});
                     console.error('Failed to fetch project lifecycle state');
                }
            } catch (error) {
                  showNotification({type: 'error', message: `Error fetching lifecycle state: ${error.message}`});
                console.error('Error fetching lifecycle state:', error);
            }
        };
        fetchLifecycleState();
    }, [projectId, showNotification, token]); // Include showNotification in the dependency array

    const handleLifecycleTransition = async (action) => {
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/projects/${projectId}/${action}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );
            if (response.ok) {
                 const data = await response.json();
               const lifecycle = new ProjectLifecycleModel(data);
               setLifecycleState(lifecycle.state);
               showNotification({type: 'success', message: `Project transitioned to: ${lifecycle.state}`});
           } else {
               const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to transition project lifecycle: ${errorData.message}`});
                console.error('Failed to transition project lifecycle:', errorData);
           }
       } catch (error) {
             showNotification({type: 'error', message: `Error transitioning project lifecycle: ${error.message}`});
            console.error('Error transitioning project lifecycle:', error);
        }
    };

    return (
        <div className={styles.lifecycleContainer}>
            <h1>Project Lifecycle Management</h1>
            {projectId ? (
                <>
                    <p>Current Phase: {lifecycleState || 'Not Started'}</p>
                    <div className={styles.lifecycleActions}>
                        <button
                            onClick={() => handleLifecycleTransition('initiation')}
                            className={styles.actionButton}
                        >
                            Initiation
                        </button>
                        <button
                            onClick={() => handleLifecycleTransition('planning')}
                            className={styles.actionButton}
                        >
                            Planning
                        </button>
                        <button
                            onClick={() => handleLifecycleTransition('execution')}
                            className={styles.actionButton}
                        >
                            Execution
                        </button>
                        <button
                            onClick={() => handleLifecycleTransition('monitoring')}
                            className={styles.actionButton}
                        >
                            Monitoring
                        </button>
                        <button
                            onClick={() => handleLifecycleTransition('closure')}
                            className={styles.actionButton}
                        >
                            Closure
                        </button>
                    </div>
                </>
            ) : (
                <p>Select a project to manage lifecycle.</p>
            )}
        </div>
    );
};

export default ProjectLifecycle;