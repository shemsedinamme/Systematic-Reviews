import React, { useState, useEffect } from 'react';
import styles from './ScreeningWorkflow.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import { v4 as uuidv4 } from 'uuid';

const ScreeningWorkflow = ({ projectId }) => {
    const [workflow, setWorkflow] = useState([]);
    const [assignedTasks, setAssignedTasks] = useState([]);
    const [selectedReviewer, setSelectedReviewer] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]);
    const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
               const response = await fetch(`${config.apiBaseUrl}/admin/users`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                   },
                });
                if (response.ok) {
                    const data = await response.json();
                   setAvailableUsers(data);
                } else {
                   const errorData = await response.json();
                     showNotification({type: 'error', message: `Failed to fetch users: ${errorData.message}`});
                   console.error('Failed to fetch users');
               }
            } catch (error) {
                  showNotification({type: 'error', message: `Error fetching users: ${error.message}`});
                console.error('Error fetching users:', error);
            }
        };
        const fetchWorkflow = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/screening/workflow?project_id=${projectId}`,
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
                   setWorkflow(data);
               } else {
                  const errorData = await response.json();
                   showNotification({type: 'error', message: `Failed to fetch workflow: ${errorData.message}`});
                    console.error('Failed to fetch workflow');
               }
           } catch (error) {
              showNotification({type: 'error', message: `Error fetching workflow: ${error.message}`});
              console.error('Error fetching workflow:', error);
            }
        };
        const fetchAssignments = async () => {
           try {
               const response = await fetch(
                    `${config.apiBaseUrl}/screening/workflow?project_id=${projectId}`,
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
                   setAssignedTasks(data.assignments);
                } else {
                     const errorData = await response.json();
                      showNotification({type: 'error', message: `Failed to fetch screening assignments: ${errorData.message}`});
                   console.error('Failed to fetch screening assignments.');
                }
            } catch (error) {
                  showNotification({type: 'error', message: `Error fetching screening assignments: ${error.message}`});
                 console.error('Error fetching screening assignments:', error);
          }
       };
      if (projectId) {
         fetchUsers();
            fetchWorkflow();
            fetchAssignments();
      }
    }, [projectId, showNotification, token]);//Include showNotification and token in dependency array

   const handleAssignReviewer = async (stage) => {
        try {
           const response = await fetch(
              `${config.apiBaseUrl}/screening/workflow/assign`,
                {
                  method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        stage_name: stage,
                        user_id: selectedReviewer,
                        project_id: projectId,
                   }),
                }
            );
            if (response.ok) {
                const updatedData = await response.json();
                showNotification({type: 'success', message: 'Reviewer assigned successfully'});
               setAssignedTasks([...assignedTasks, updatedData]);
              setSelectedReviewer('');
         } else {
               const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to assign reviewer to a task: ${errorData.message}`});
              console.error('Failed to assign reviewer to a task');
           }
      } catch (error) {
            showNotification({type: 'error', message: `Error assigning reviewer to a task: ${error.message}`});
           console.error('Error assigning reviewer to a task:', error);
      }
   };

    if (!projectId) {
        return <p>Select a project to manage screening workflow.</p>;
    }
    return (
        <div className={styles.workflowContainer}>
           <h1>Screening Workflow</h1>
            {workflow &&
                workflow.map((stage) => (
                    <div key={uuidv4()} className={styles.workflowStage}>
                       <h2>{stage.stage_name}</h2>
                        <div className={styles.assignReviewer}>
                          <select
                                value={selectedReviewer}
                              onChange={(e) => setSelectedReviewer(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="" disabled selected>
                                 Select a Reviewer
                                </option>
                                {availableUsers.map((user) => (
                                    <option key={user.user_id} value={user.user_id}>
                                        {user.username}
                                    </option>
                                ))}
                         </select>
                            <button onClick={() => handleAssignReviewer(stage.stage_name)} className={styles.assignButton}>
                            Assign Reviewer
                           </button>
                       </div>
                       {assignedTasks &&
                            assignedTasks
                              .filter(task => task.stage_name === stage.stage_name)
                               .map((task) => (
                                  <div key={task.task_id} className={styles.taskItem}>
                                     Reviewer: {availableUsers.find(user=> user.user_id === task.reviewer_id)?.username}
                                  </div>
                             ))}
                    </div>
                ))}
        </div>
    );
};

export default ScreeningWorkflow;