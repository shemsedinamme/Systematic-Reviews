import React, { useState, useEffect } from 'react';
import styles from './DataExtraction.module.css';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { useForm } from '../useForm'; // Custom hook for form management
import { useNotification } from '../useNotification'; // Notification Hook
import config from '../config'; // Configuration file

const DataExtraction = ({ projectId, taskId }) => {
    const [task, setTask] = useState(null);
    const { formData, handleInputChange, handleEditorChange, setFormData } = useForm(); // Custom hook for form state
    const { showNotification } = useNotification(); // Hook for notifications
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchTask = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${config.apiBaseUrl}/extraction-tasks/${taskId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setTask(data);
                } else {
                    const errorData = await response.json();
                    showNotification({ type: 'error', message: `Failed to fetch extraction task: ${errorData.message}` });
                }
            } catch (error) {
                showNotification({ type: 'error', message: `Error fetching extraction task: ${error.message}` });
            } finally {
                setLoading(false);
            }
        };

        if (taskId) {
            fetchTask();
        }
    }, [taskId, showNotification, token]);

    useEffect(() => {
        if (task && task.form && task.form.fields) {
            const initialFormData = {};
            task.form.fields.forEach(field => {
                initialFormData[field.field_id] = '';
            });
            setFormData(initialFormData);
        }
    }, [task, setFormData]);

    const handleSubmitData = async () => {
        try {
            const response = await fetch(`${config.apiBaseUrl}/extraction-tasks/${taskId}/data`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                showNotification({ type: 'success', message: 'Data submitted successfully' });
            } else {
                const errorData = await response.json();
                showNotification({ type: 'error', message: `Failed to submit data extraction task: ${errorData.message}` });
            }
        } catch (error) {
            showNotification({ type: 'error', message: `Error submitting data extraction task: ${error.message}` });
        }
    };

    if (!taskId) {
        return <p>Select a task to perform data extraction.</p>;
    }

    if (loading) {
        return <p>Loading task details...</p>;
    }

    if (!task) {
        return <p>No task details available.</p>;
    }

    return (
        <div className={styles.extractionContainer}>
            <h1>Data Extraction for Article: {task.article_id}</h1>
            {task.form && task.form.fields && (
                <div className={styles.extractionForm}>
                    {task.form.fields.map((field) => (
                        <div key={field.field_id} className={styles.formItem}>
                            <label htmlFor={field.field_id}>{field.field_label}</label>
                            {field.field_type === 'text' && (
                                <input
                                    id={field.field_id}
                                    type="text"
                                    value={formData[field.field_id] || ''}
                                    onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                                    className={styles.dataInput}
                                />
                            )}
                            {field.field_type === 'numeric' && (
                                <input
                                    id={field.field_id}
                                    type="number"
                                    value={formData[field.field_id] || ''}
                                    onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                                    className={styles.dataInput}
                                />
                            )}
                            {field.field_type === 'date' && (
                                <input
                                    id={field.field_id}
                                    type="date"
                                    value={formData[field.field_id] || ''}
                                    onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                                    className={styles.dataInput}
                                />
                            )}
                            {field.field_type === 'dropdown' && (
                                <select
                                    id={field.field_id}
                                    value={formData[field.field_id] || ''}
                                    onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                                    className={styles.dataInput}
                                >
                                    <option value="" disabled>Select an option</option>
                                    {field.field_options && field.field_options.split(',').map((option, index) => (
                                        <option key={index} value={option}>{option}</option>
                                    ))}
                                </select>
                            )}
                            {field.field_type === 'checkbox' && (
                                <input
                                    id={field.field_id}
                                    type="checkbox"
                                    checked={formData[field.field_id] === true}
                                    onChange={(e) => handleInputChange(field.field_id, e.target.checked)}
                                    className={styles.dataInput}
                                />
                            )}
                            {field.field_type === 'text' && field.conditional_logic && (
                                <CKEditor
                                    editor={ClassicEditor}
                                    data={formData[field.field_id] || ''}
                                    onChange={(event, editor) => handleEditorChange(event, editor, field.field_id)}
                                />
                            )}
                        </div>
                    ))}
                    <button onClick={handleSubmitData} className={styles.submitButton}>
                        Submit Data
                    </button>
                </div>
            )}
        </div>
    );
};

export default DataExtraction;
