import React, { useState } from 'react';
import styles from './ProjectCreate.module.css';
import config from '../config';
import { useNotification } from './useNotification'; // Import the notification hook
import { useForm } from './useForm'; // Import the custom hook
import Project from '../models/project.model'

const ProjectCreate = () => {
    const { formData, handleInputChange, setFormData } = useForm(); // Use the custom form hook
    const { showNotification } = useNotification(); // Initialize notification hook
    const [message, setMessage] = useState('');
    const token = localStorage.getItem('token');

     const isValidDateFormat = (dateString) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

         if (!isValidDateFormat(formData.start_date)) {
            showNotification({ type: 'error', message: "Invalid Start date format. Please use YYYY-MM-DD format." });
             return;
        }

        if (!isValidDateFormat(formData.end_date)) {
            showNotification({ type: 'error', message: "Invalid End date format. Please use YYYY-MM-DD format." });
            return;
        }
        // Validate start and end dates
        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
           showNotification({type: 'error', message: "Start date must be before the end date."});
           return;
        }

        try {
            const response = await fetch(`${config.apiBaseUrl}/projects`, { // Using config.apiBaseUrl
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                 const data = await response.json();
                  const newProject = new Project(data);
                 showNotification({type: 'success', message: `Project "${newProject.title}" created successfully!`});
                setFormData({ // Reset form data after success
                   title: '',
                   description: '',
                   start_date: '',
                   end_date: '',
                  });
            } else {
                const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to create project: ${errorData.message}`});
                console.error('Failed to create project:', errorData);
            }
        } catch (error) {
            console.error('Error creating project:', error);
             showNotification({type: 'error', message: `An error occurred while creating the project: ${error.message}`});
        }
    };

    return (
        <div className={styles.projectCreateContainer}>
            <h1>Create New Project</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="title"
                    placeholder="Project Title"
                    value={formData.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                    className={styles.projectInput}
                />
                <textarea
                    name="description"
                    placeholder="Project Description"
                    value={formData.description || ''}
                     onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                     className={styles.projectInput}
                />
                <input
                    type="date"
                    name="start_date"
                    placeholder="Start Date"
                    value={formData.start_date || ''}
                     onChange={(e) => handleInputChange('start_date', e.target.value)}
                    required
                     className={styles.projectInput}
                />
                <input
                    type="date"
                    name="end_date"
                    placeholder="End Date"
                    value={formData.end_date || ''}
                     onChange={(e) => handleInputChange('end_date', e.target.value)}
                    required
                    className={styles.projectInput}
                />
                <button type="submit" className={styles.createButton}>
                    Create Project
                </button>
            </form>
             {message && <p className={styles.message}>{message}</p>}
        </div>
    );
};

export default ProjectCreate;