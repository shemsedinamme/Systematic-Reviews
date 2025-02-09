import React, { useState, useEffect } from 'react';
import styles from './ProjectWorkflow.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import { v4 as uuidv4 } from 'uuid';
import Workflow from '../models/workflow.model';
import WorkflowStage from '../models/workflowStage.model';
import Task from '../models/task.model';
import TaskDependency from '../models/taskDependency.model';

const ProjectWorkflow = ({ projectId }) => {
    const [workflow, setWorkflow] = useState(null);
    const [newStage, setNewStage] = useState('');
    const [newTask, setNewTask] = useState('');
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedTask, setSelectedTask] = useState('');
    const [assignee, setAssignee] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dependencies, setDependencies] = useState([]);
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
                    `${config.apiBaseUrl}/projects/${projectId}/workflows`,
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
                    const newWorkflow = new Workflow(data);
                    setWorkflow(newWorkflow.toJSON());
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

        fetchUsers();
       if (projectId) {
           fetchWorkflow();
       }
    }, [projectId, showNotification, token]);

    const handleAddStage = async () => {
        if (!newStage) {
          showNotification({type: 'error', message: `Please provide with stage name.`});
          return;
      }
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/workflows/${workflow.workflow_id}/stages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ stage_name: newStage }),
                }
            );
            if (response.ok) {
                const updatedData = await response.json();
                const newStage = new WorkflowStage(updatedData);
                 showNotification({type: 'success', message: `Stage added successfully`});
                setWorkflow({
                    ...workflow,
                    stages: [...workflow.stages, newStage.toJSON()],
                });
                setNewStage('');
            } else {
                const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to add stage: ${errorData.message}`});
                 console.error('Failed to add stage');
            }
        } catch (error) {
            showNotification({type: 'error', message: `Error adding stage: ${error.message}`});
            console.error('Error adding stage:', error);
        }
    };

    const handleAddTask = async () => {
       if (!selectedStage || !newTask) {
             showNotification({type: 'error', message: `Please provide stage and task name`});
              return;
        }
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/stages/${selectedStage}/tasks`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ task_name: newTask }),
                }
            );
            if (response.ok) {
                const updatedData = await response.json();
                const newTaskObj = new Task(updatedData)
                showNotification({type: 'success', message: `Task added successfully`});
                 setWorkflow({
                    ...workflow,
                    stages: workflow.stages.map((stage) =>
                        stage.stage_id === selectedStage
                            ? { ...stage, tasks: [...stage.tasks, newTaskObj.toJSON()] }
                            : stage
                    ),
                });
                setNewTask('');
                setSelectedStage('');
            } else {
                 const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to add task: ${errorData.message}`});
                console.error('Failed to add task');
            }
        } catch (error) {
              showNotification({type: 'error', message: `Error adding task: ${error.message}`});
           console.error('Error adding task:', error);
        }
    };

   const handleAssignTask = async () => {
        if (!selectedTask || !assignee || !dueDate) {
            showNotification({type: 'error', message: `Please provide all the required fields: task, assignee and due date`});
           return;
       }
      try {
            const response = await fetch(
                `${config.apiBaseUrl}/tasks/${selectedTask}/assign`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ user_id: assignee, due_date: dueDate }),
                }
            );
           if (response.ok) {
                const updatedData = await response.json();
               const updatedTaskObj = new Task(updatedData);
                showNotification({type: 'success', message: `Task assigned successfully`});
                 setWorkflow({
                    ...workflow,
                    stages: workflow.stages.map((stage) => ({
                        ...stage,
                        tasks: stage.tasks.map((task) =>
                            task.task_id === updatedTaskObj.task_id ? updatedTaskObj.toJSON() : task
                        ),
                    })),
                });
                setAssignee('');
                setDueDate('');
                setSelectedTask('');
            } else {
                const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to assign task: ${errorData.message}`});
                console.error('Failed to assign task');
           }
        } catch (error) {
            showNotification({type: 'error', message: `Error assigning task: ${error.message}`});
            console.error('Error assigning task:', error);
       }
    };

  const handleAddDependency = async (task_id, dependency_id) => {
    try {
        const response = await fetch(
            `${config.apiBaseUrl}/tasks/${task_id}/dependencies`,
            {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                   'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ dependency_id: dependency_id }),
             }
         );
            if (response.ok) {
                const updatedData = await response.json();
                const dependency = new TaskDependency(updatedData);
                 showNotification({type: 'success', message: `Dependency added successfully`});
                setWorkflow({
                    ...workflow,
                    stages: workflow.stages.map(stage=>({
                        ...stage,
                      tasks: stage.tasks.map(task=> task.task_id === dependency.task_id? dependency.toJSON() : task)
                   }))
              });
            } else {
                 const errorData = await response.json();
                  showNotification({type: 'error', message: `Failed to add dependency: ${errorData.message}`});
                console.error('Failed to add dependency');
            }
    } catch (error) {
           showNotification({type: 'error', message: `Error adding dependency: ${error.message}`});
        console.error('Error adding dependency:', error);
     }
   };

    if (!workflow) {
        return <p>Loading workflow...</p>;
    }

    return (
        <div className={styles.workflowContainer}>
            <h1>Project Workflow</h1>
            {projectId ? (
                <>
                    <div className={styles.workflowAddStage}>
                        <input
                            type="text"
                            placeholder="Add new workflow stage"
                            value={newStage}
                            onChange={(e) => setNewStage(e.target.value)}
                             className={styles.workflowInput}
                        />
                        <button onClick={handleAddStage} className={styles.addButton}>
                            Add Stage
                        </button>
                    </div>
                    <div className={styles.workflowAddTask}>
                        <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value)}
                            className={styles.workflowSelect}
                        >
                            <option value="" disabled selected>
                                Select a Stage
                            </option>
                            {workflow.stages &&
                                workflow.stages.map((stage) => (
                                    <option key={stage.stage_id} value={stage.stage_id}>
                                        {stage.stage_name}
                                    </option>
                                ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Add new task"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            className={styles.workflowInput}
                        />
                        <button onClick={handleAddTask} className={styles.addButton}>
                            Add Task
                        </button>
                    </div>
                    <div className={styles.workflowAssignTask}>
                        <select
                            value={selectedTask}
                            onChange={(e) => setSelectedTask(e.target.value)}
                             className={styles.workflowSelect}
                        >
                            <option value="" disabled selected>
                                Select a task to assign
                            </option>
                            {workflow.stages &&
                                workflow.stages.flatMap((stage) =>
                                    stage.tasks.map((task) => (
                                        <option key={task.task_id} value={task.task_id}>
                                            {task.task_name} in {stage.stage_name}
                                        </option>
                                    ))
                                )}
                        </select>
                        <select
                            value={assignee}
                            onChange={(e) => setAssignee(e.target.value)}
                            className={styles.workflowSelect}
                        >
                            <option value="" disabled selected>
                                Select User
                            </option>
                            {availableUsers.map((user) => (
                                <option key={user.user_id} value={user.user_id}>
                                    {user.username}
                                </option>
                            ))}
                        </select>
                        <input
                            type="date"
                            placeholder="Due Date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className={styles.workflowInput}
                        />
                        <button onClick={handleAssignTask} className={styles.addButton}>
                            Assign Task
                        </button>
                    </div>
                    {workflow.stages && (
                        <div className={styles.workflowList}>
                            {workflow.stages.map((stage) => (
                                <div key={stage.stage_id} className={styles.workflowStage}>
                                    <h3>{stage.stage_name}</h3>
                                    {stage.tasks && (
                                        <ul className={styles.taskList}>
                                            {stage.tasks.map((task) => (
                                                <li key={task.task_id} className={styles.taskItem}>
                                                    {task.task_name}
                                                    {task.assigned_user_id && (
                                                        <span>
                                                            {' '}
                                                            - Assigned To:{' '}
                                                           {availableUsers.find(user=> user.user_id === task.assigned_user_id)?.username}
                                                        </span>
                                                    )}
                                                    {task.due_date && (
                                                        <span>
                                                            {' '}
                                                            - Due date:{' '}
                                                            {new Date(
                                                                task.due_date
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                     <div className={styles.dependencyList}>
                                                        <span>Dependencies:</span>
                                                        <ul>
                                                            {task.dependencies && task.dependencies.map(dep => (
                                                                <li key={dep.dependency_id}>{
                                                                  workflow.stages.flatMap(stage =>
                                                                    stage.tasks.find(task=> task.task_id === dep.dependency_id)?.task_name
                                                                )
                                                                }
                                                                  </li>
                                                            ))}
                                                        </ul>
                                                        <select
                                                            onChange={(e) => handleAddDependency(task.task_id, e.target.value)}
                                                            className={styles.workflowSelect}
                                                        >
                                                          <option value="" disabled selected>Select a task to add a dependency</option>
                                                            {workflow.stages.flatMap((stage) =>
                                                              stage.tasks
                                                                .filter(depTask => depTask.task_id !== task.task_id)
                                                                 .map(depTask =>(
                                                                    <option key={depTask.task_id} value={depTask.task_id}>
                                                                    {depTask.task_name} in {stage.stage_name}
                                                                    </option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <p>Select a project to view or manage workflow</p>
            )}
        </div>
    );
};

export default ProjectWorkflow;