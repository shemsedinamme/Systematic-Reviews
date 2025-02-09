// QualityAssessmentWorkflow.js
import React, { useState, useEffect } from 'react';
import styles from './QualityAssessmentWorkflow.module.css';

const QualityAssessmentWorkflow = ({ projectId }) => {
  const [workflows, setWorkflows] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
    const [selectedReviewer, setSelectedReviewer] = useState('');
      const [tasks, setTasks] = useState([]);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchUsers = async () => {
          try {
              const response = await fetch('http://10.180.50.140:3306/admin/users', {
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
                   console.error('Failed to fetch users');
              }
          } catch (error) {
              console.error('Error fetching users:', error);
         }
       };
      const fetchWorkflows = async () => {
        try {
          const response = await fetch(`http://10.180.50.140:3306/quality-assessment/workflows?project_id=${projectId}`, {
              method: 'GET',
               headers: {
                'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`,
             },
          });
           if (response.ok) {
                 const data = await response.json();
                 setWorkflows(data);
            } else {
                console.error('Failed to fetch quality assessment workflows');
             }
         } catch (error) {
             console.error('Error fetching quality assessment workflows:', error);
        }
      };
       const fetchTasks = async () => {
         try {
           const response = await fetch(`http://10.180.50.140:3306/quality-assessment/tasks?project_id=${projectId}`, {
             method: 'GET',
              headers: {
                 'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
          });
             if (response.ok) {
                 const data = await response.json();
                 setTasks(data);
              } else {
                 console.error('Failed to fetch quality assessment tasks');
             }
         } catch (error) {
            console.error('Error fetching quality assessment tasks:', error);
         }
       };
        if (projectId){
            fetchUsers();
            fetchWorkflows();
           fetchTasks()
        }

    }, [projectId]);

  const handleAssignTask = async (stage_name) => {
    if (!selectedReviewer) return;
      try {
         const response = await fetch('http://10.180.50.140:3306/quality-assessment/tasks', {
             method: 'POST',
                headers: {
                   'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({reviewer_id: selectedReviewer, stage_name: stage_name, project_id: projectId}),
         });
            if (response.ok) {
                const data = await response.json()
                setTasks([...tasks, data]);
                setSelectedReviewer('');
             } else {
               console.error('Failed to assign reviewer');
                alert('Failed to assign reviewer');
             }
        } catch (error) {
             console.error('Error assigning reviewer:', error);
             alert('Error assigning reviewer.');
         }
 };


  if (!projectId) {
        return <p>Select a project to view quality assessment workflow</p>
    }

  return (
    <div className={styles.workflowContainer}>
      <h1>Quality Assessment Workflow</h1>
        {workflows &&
           workflows.map((workflow) =>(
               <div key={workflow.workflow_id} className={styles.workflowStage}>
                    <h2>{workflow.workflow_name}</h2>
                   {workflow.workflow_stages && workflow.workflow_stages.map((stage)=>(
                      <div key={uuidv4()} className={styles.stageItem}>
                       <h3>Stage: {stage}</h3>
                             <div className={styles.assignReviewer}>
                              <select
                                value={selectedReviewer}
                                onChange={(e) => setSelectedReviewer(e.target.value)}
                                  className={styles.selectInput}
                              >
                                 <option value="" disabled selected>Select a reviewer</option>
                                 {availableUsers.map((user) => (
                                    <option key={user.user_id} value={user.user_id}>
                                    {user.username}
                                   </option>
                                  ))}
                           </select>
                            <button onClick={()=> handleAssignTask(stage)} className={styles.assignButton}>
                                 Assign Reviewer
                            </button>
                            </div>
                            {tasks.filter(task => task.stage_name === stage).map(task => (
                                <div key={task.task_id} className={styles.taskItem}>
                                     Reviewer Assigned: {availableUsers.find(user=> user.user_id === task.reviewer_id)?.username}
                                </div>
                            ))}
                         </div>
                    ))}
               </div>
           ))
        }
    </div>
  );
};

export default QualityAssessmentWorkflow;

