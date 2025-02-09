// TaskManagement.js
import React, { useState, useEffect } from 'react';
import styles from './TaskManagement.module.css';
import config from '../config'; // Configuration file
const TaskManagement = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]);
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
                  setAvailableUsers(data)
               } else {
                    console.error('Failed to fetch users');
              }
          } catch (error) {
             console.error('Error fetching users:', error);
         }
      };
     const fetchTasks = async () => {
        try {
             const response = await fetch(`${config.apiBaseUrl}/tasks?project_id=${projectId}`, {
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
                 console.error('Failed to fetch tasks');
             }
          } catch (error) {
           console.error('Error fetching tasks:', error);
        }
     };
         if (projectId) {
             fetchUsers()
             fetchTasks();
        }
   }, [projectId]);


  const handleCreateTask = async () => {
    if (!newTaskName) return;
      try {
            const response = await fetch(`${config.apiBaseUrl}/tasks`, {
                method: 'POST',
               headers: {
                   'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`,
                },
               body: JSON.stringify({ task_name: newTaskName, task_description: newTaskDescription, project_id: projectId, due_date: dueDate, assigned_user_id: selectedUser }),
           });
            if (response.ok) {
                const updatedData = await response.json();
                setTasks([...tasks, updatedData]);
                 setNewTaskName('');
                 setNewTaskDescription('');
                  setDueDate('');
                  setSelectedUser('');
           } else {
                console.error('Failed to create new task.');
               alert('Failed to create new task.')
           }
       } catch (error) {
          console.error('Error creating new task:', error);
            alert('Error creating new task.')
       }
  };

    if (!projectId) {
        return <p>Select a project to manage tasks.</p>
    }

  return (
    <div className={styles.taskManagementContainer}>
      <h1>Task Management</h1>
      <div className={styles.newTaskForm}>
          <input
            type="text"
            placeholder="Enter new task name"
             value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            className={styles.taskInput}
           />
           <textarea
             placeholder="Enter new task description"
              value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
             className={styles.taskInput}
           />
          <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
                className={styles.selectInput}
            >
                <option value="" disabled selected>Select an user for task assignment</option>
              {availableUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.username}
                    </option>
             ))}
            </select>
           <input
             type="date"
            placeholder="Enter due date for the task"
             value={dueDate}
           onChange={(e) => setDueDate(e.target.value)}
               className={styles.taskInput}
          />
        <button onClick={handleCreateTask} className={styles.createButton}>
          Create Task
        </button>
      </div>
      <ul className={styles.taskList}>
        {tasks.map((task) => (
            <li key={task.task_id} className={styles.taskItem}>
            Task: {task.task_name} - Assigned To: {availableUsers.find(user=> user.user_id === task.assigned_user_id)?.username} - Due Date: {new Date(task.due_date).toLocaleDateString()} - status: {task.task_status}
           </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskManagement;