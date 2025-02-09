import React, { useState, useEffect } from 'react';
import styles from './ProjectMetadata.module.css';
import config from '../config';
import { useNotification } from './useNotification'; // Import the notification hook
import { useForm } from './useForm'; // Import the custom hook
import ProjectMetadataModel from '../models/projectMetadata.model'

const ProjectMetadata = ({ projectId }) => {
    const [metadata, setMetadata] = useState([]);
    const { formData, handleInputChange, setFormData } = useForm(); // Use custom form hook
    const { showNotification } = useNotification(); // Initialize notification hook
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const token = localStorage.getItem('token');
    const [editMetaId, setEditMetaId] = useState(null);
    const [editValue, setEditValue] = useState('');
    

    useEffect(() => {
        const fetchMetadata = async () => {
            if (!projectId) return;
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/projects/${projectId}/metadata`,
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
                      const metadataList = data.map(item => new ProjectMetadataModel(item));
                       setMetadata(metadataList.map(item => item.toJSON()));
                } else {
                     const errorData = await response.json();
                      showNotification({type: 'error', message: `Failed to fetch metadata: ${errorData.message}`});
                    console.error('Failed to fetch metadata');
                }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching metadata: ${error.message}`});
                console.error('Error fetching metadata:', error);
            }
        };
        fetchMetadata();
    }, [projectId, showNotification, token]); // Include notification in the dependency array

    const handleAddMetadata = async () => {
        if (!formData.newMetadataField) {
               showNotification({type: 'error', message: 'Metadata field name cannot be empty'});
               return;
         }
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/projects/${projectId}/metadata`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ field_name: formData.newMetadataField }),
                }
            );
            if (response.ok) {
                 const data = await response.json();
                const newMeta = new ProjectMetadataModel(data);
                showNotification({type: 'success', message: `Metadata added successfully`});
                 setMetadata([...metadata, newMeta.toJSON()]);
               setFormData(prevState => ({ ...prevState, newMetadataField: '' }));// clear input field after added
            } else {
               const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to add metadata: ${errorData.message}`});
              console.error('Failed to add metadata: ', errorData);
          }
        } catch (error) {
            showNotification({type: 'error', message: `Error adding metadata: ${error.message}`});
            console.error('Error adding metadata:', error);
        }
    };


  const handleUpdateMetadata = async (meta_id, value) => {
         try {
           const response = await fetch(`${config.apiBaseUrl}/projects/${projectId}/metadata`, {
               method: 'PUT',
               headers: {
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${token}`,
               },
                body: JSON.stringify({meta_id:meta_id, value: value}),
            });
             if (response.ok) {
                  const updatedData = await response.json();
                   const updatedMeta = new ProjectMetadataModel(updatedData);
                  showNotification({type: 'success', message: `Metadata updated successfully`});
                  setMetadata(metadata.map(meta=> meta.meta_id === updatedMeta.meta_id? updatedMeta.toJSON() : meta));
                setEditMetaId(null);
               setEditValue('');
             } else {
                const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to update metadata: ${errorData.message}`});
                  console.error('Failed to update metadata');
              }
         } catch (error) {
             showNotification({type: 'error', message: `Error updating metadata: ${error.message}`});
             console.error('Error updating metadata:', error);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) {
            showNotification({ type: 'error', message: "Please provide a search term." });
             setSearchResults([]);
            return;
         }
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/projects/search?query=${searchQuery}`,
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
                   setSearchResults(data);
                   setSearchQuery('');
            } else {
               const errorData = await response.json();
                showNotification({type: 'error', message: `Search failed, try another search query: ${errorData.message}`});
                console.error('Search failed:', response);
                setSearchResults([]);
            }
        } catch (error) {
             showNotification({ type: 'error', message: `Error while searching: ${error.message}` });
            console.error('Error searching:', error);
             setSearchResults([]);
        }
    };
 const handleEditValue = (meta_id, value ) => {
        setEditMetaId(meta_id);
        setEditValue(value);
 };

 const handleCancelEdit = () => {
        setEditMetaId(null);
      setEditValue('');
 };


    return (
        <div className={styles.metadataContainer}>
            <h1>Project Metadata</h1>
            {projectId ? (
                <>
                    <div className={styles.metadataSearch}>
                        <input
                            type="text"
                            placeholder="Search project based on metadata"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.metadataSearchInput}
                        />
                        <button onClick={handleSearch} className={styles.searchButton}>
                            Search
                        </button>
                    </div>
                    {searchResults.length > 0 ? (
                        <div className={styles.searchResults}>
                            <h2>Search Results:</h2>
                            <ul>
                                {searchResults.map((result) => (
                                    <li key={result.project_id}>{result.title}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className={styles.metadataList}>
                            {metadata.map((item) => (
                                <div key={item.meta_id} className={styles.metadataItem}>
                                    <label>{item.field_name}: </label>
                                    {editMetaId === item.meta_id? (
                                       <>
                                         <input
                                              type="text"
                                             value={editValue || ''}
                                            onChange={(e) => setEditValue(e.target.value)}
                                             className={styles.metadataInput}
                                         />
                                        <button onClick={() => handleUpdateMetadata(item.meta_id, editValue)}>
                                              Save
                                         </button>
                                           <button onClick={() => handleCancelEdit()}>
                                                Cancel
                                          </button>
                                       </>
                                    ) :
                                    (
                                     <span onDoubleClick={() => handleEditValue(item.meta_id, item.value)} style={{ cursor: 'pointer' }}>{item.value || 'No value set'}</span>

                                    )}
                                </div>
                            ))}
                            <div className={styles.addMetadata}>
                                <input
                                    type="text"
                                     placeholder="Add new metadata"
                                    value={formData.newMetadataField || ''}
                                    onChange={(e)=> handleInputChange('newMetadataField', e.target.value)}
                                      className={styles.metadataInput}
                                />
                                <button onClick={handleAddMetadata} className={styles.addButton}>
                                    Add
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <p>Select a project to view or add metadata.</p>
            )}
        </div>
    );
};

export default ProjectMetadata;