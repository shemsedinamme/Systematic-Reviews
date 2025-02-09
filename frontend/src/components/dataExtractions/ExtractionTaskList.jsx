// ExtractionTaskList.js
import React, { useState, useEffect } from 'react';
import styles from './ExtractionTaskList.module.css';
import config from '../config';
import { useNotification } from '../useNotification'; // Import the custom hook

const ExtractionTaskList = ({ projectId }) => {
    const [tasks, setTasks] = useState([]);
    const { showNotification } = useNotification(); // Initialize notification hook
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/extraction-tasks?project_id=${projectId}`,
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
                    setTasks(data);
                } else {
                     const errorData = await response.json();
                     showNotification({type: 'error', message: `Failed to fetch extraction tasks: ${errorData.message}`});
                    console.error('Failed to fetch extraction tasks');
                }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching extraction tasks: ${error.message}`});
                console.error('Error fetching extraction tasks:', error);
            }
        };
        if (projectId) {
            fetchTasks();
        }
    }, [projectId, showNotification, token]); // Include showNotification and token in dependency array


    if (!projectId) {
        return <p>Select a project to view extraction tasks.</p>;
    }
    if (!tasks || tasks.length === 0) {
        return <p>No data extraction tasks available.</p>;
    }

    return (
        <div className={styles.taskListContainer}>
            <h1>Data Extraction Tasks</h1>
            <table className={styles.taskTable}>
                <thead>
                    <tr>
                        <th>Task ID</th>
                        <th>Article ID</th>
                        <th>Form ID</th>
                        <th>Assigned User ID</th>
                        <th>Status</th>
                        <th>Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task) => (
                        <tr key={task.task_id}>
                            <td>{task.task_id}</td>
                            <td>{task.article_id}</td>
                            <td>{task.form_id}</td>
                            <td>{task.assigned_user_id}</td>
                            <td>{task.task_status}</td>
                            <td>{new Date(task.due_date).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ExtractionTaskList;