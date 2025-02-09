import React, { useState, useEffect } from 'react';
import styles from './UserList.module.css';
import config from '../config';
import { useNotification } from './useNotification'; // Import the notification hook
import { useForm } from './useForm'; // Import the form hook

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [editUserId, setEditUserId] = useState(null);
    const {formData, handleInputChange, setFormData} = useForm(); // Use custom form hook for update
    const { showNotification } = useNotification(); // Initialize notification hook
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
                    setUsers(data);
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
        fetchUsers();
    }, [showNotification, token]);// Include showNotification in dependency array

   const handleEdit = (user) => {
      setEditUserId(user.user_id);
      setFormData({
          username: user.username,
          email: user.email,
          role: user.role,
           user_id: user.user_id,
      })
    };

 const handleUpdateUser = async () => {
       try {
            const response = await fetch(
                `${config.apiBaseUrl}/admin/users/${editUserId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(formData),
                }
            );
            if (response.ok) {
                const updatedData = await response.json();
                 showNotification({type: 'success', message: 'User updated successfully'});
                 setUsers(users.map((user) =>
                   user.user_id === updatedData.user_id ? updatedData : user
                   ));
                setEditUserId(null);
              } else {
                  const errorData = await response.json();
                   showNotification({type: 'error', message: `Failed to update user: ${errorData.message}`});
                console.error('Failed to update user');
           }
        } catch (error) {
              showNotification({type: 'error', message: `Error updating user: ${error.message}`});
           console.error('Error updating user:', error);
       }
   };

 const handleDeleteUser = async (userId) => {
    try {
          const response = await fetch(
                `${config.apiBaseUrl}/admin/users/${userId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                   },
              }
         );
          if (response.ok) {
             showNotification({type: 'success', message: 'User deleted successfully'});
             setUsers(users.filter((user) => user.user_id !== userId));
         } else {
             const errorData = await response.json();
              showNotification({type: 'error', message: `Failed to delete user: ${errorData.message}`});
            console.error('Failed to delete user');
        }
     } catch (error) {
        showNotification({type: 'error', message: `Error deleting user: ${error.message}`});
        console.error('Error deleting user:', error);
     }
    };

    const handleCancelEdit = () => {
      setFormData({}); //reset form data.
       setEditUserId(null);
    };

    if (!users) {
        return <div>Loading users...</div>;
    }

    return (
        <div className={styles.userListContainer}>
            <h1>User List</h1>
            {users.length === 0 ? (
                <p>No users are available.</p>
            ) : (
                <table className={styles.userTable}>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.user_id}>
                                <td>
                                    {editUserId === user.user_id ? (
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                             onChange={(e) => handleInputChange('username', e.target.value)}
                                        />
                                    ) : (
                                        user.username
                                    )}
                                </td>
                                <td>
                                    {editUserId === user.user_id ? (
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                        />
                                    ) : (
                                        user.email
                                    )}
                                </td>
                                <td>
                                    {editUserId === user.user_id ? (
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={(e) => handleInputChange('role', e.target.value)}
                                            >
                                            <option value="lead_author">Lead Author</option>
                                            <option value="reviewer">Reviewer</option>
                                            <option value="data_extractor">Data Extractor</option>
                                             <option value="admin">Admin</option>
                                        </select>
                                    ) : (
                                        user.role
                                    )}
                                </td>
                                <td>
                                    {editUserId === user.user_id ? (
                                        <>
                                            <button
                                                className={styles.updateButton}
                                                onClick={handleUpdateUser}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className={styles.cancelButton}
                                                onClick={handleCancelEdit}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className={styles.editButton}
                                                onClick={() => handleEdit(user)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={() => handleDeleteUser(user.user_id)}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default UserList;