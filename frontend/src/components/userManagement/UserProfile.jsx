//userlists.jsx
import React, { useState, useEffect } from 'react';
import styles from './UserProfile.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import { useForm } from './useForm';

const UserProfile = () => {
    const { formData, handleInputChange, setFormData } = useForm(); // Use custom form hook
    const { showNotification } = useNotification(); // Initialize notification hook
    const [editMode, setEditMode] = useState(false);
     const [user, setUser] = useState(null); // store original user details here
    const token = localStorage.getItem('token');


    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetch(`${config.apiBaseUrl}/profile`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                   setFormData(data);
                     setUser(data); // keep the original data
                } else {
                    const errorData = await response.json();
                    showNotification({ type: 'error', message: `Failed to fetch user profile: ${errorData.message}` });
                    console.error('Failed to fetch user profile');
                }
            } catch (error) {
                showNotification({ type: 'error', message: `Error fetching user profile: ${error.message}` });
                console.error('Error fetching user profile:', error);
            }
        };
        fetchUserProfile();
    }, [showNotification, token]); // Include showNotification in dependency array

  const handleUpdateProfile = async () => {
        try {
            const response = await fetch(`${config.apiBaseUrl}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const updatedData = await response.json();
                showNotification({ type: 'success', message: 'User profile updated successfully' });
                setFormData(updatedData)
                setUser(updatedData);
                setEditMode(false);
            } else {
                const errorData = await response.json();
                showNotification({ type: 'error', message: `Failed to update user profile: ${errorData.message}` });
                console.error('Failed to update user profile');
            }
        } catch (error) {
            showNotification({ type: 'error', message: `Error updating user profile: ${error.message}` });
            console.error('Error updating user profile:', error);
        }
    };

  const handleCancelEdit = () => {
       setEditMode(false);
        setFormData(user);
    };


    if (!formData) {
        return <div>Loading user profile...</div>;
    }

    return (
        <div className={styles.profileContainer}>
            <h1>User Profile</h1>
            {!editMode ? (
                <div className={styles.profileDetails}>
                    <p>
                        <strong>Username:</strong> {formData.username}
                    </p>
                    <p>
                        <strong>Email:</strong> {formData.email}
                    </p>
                    <p>
                        <strong>Role:</strong> {formData.role}
                    </p>
                    {formData.subscriptionOption && (
                        <p>
                            <strong>Subscription Type:</strong> {formData.subscriptionOption}
                        </p>
                    )}
                   {formData.studentId && (
                        <p>
                           <strong>Student ID:</strong> {formData.studentId}
                        </p>
                    )}
                    <button type="button" className={styles.editButton} onClick={() => setEditMode(true)}>
                        Edit Profile
                    </button>
                </div>
            ) : (
                <div className={styles.profileEditForm}>
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username || ''}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className={styles.profileInput}
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email || ''}
                         onChange={(e) => handleInputChange('email', e.target.value)}
                        className={styles.profileInput}
                    />
                   <button type="button" className={styles.saveButton} onClick={handleUpdateProfile}>
                       Save
                   </button>
                    <button type="button" className={styles.cancelButton} onClick={handleCancelEdit}>
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserProfile;