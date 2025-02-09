import React, { useState, useEffect } from 'react';
import styles from './CriteriaManagement.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import { useForm } from './useForm';

const CriteriaManagement = ({ projectId }) => {
    const [inclusionCriteria, setInclusionCriteria] = useState([]);
    const [exclusionCriteria, setExclusionCriteria] = useState([]);
    const { showNotification } = useNotification();
     const {formData, handleInputChange, setFormData } = useForm();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchCriteria = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/screening/criteria?project_id=${projectId}`,
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
                  setInclusionCriteria(data.inclusion_criteria);
                    setExclusionCriteria(data.exclusion_criteria);
               } else {
                     const errorData = await response.json();
                      showNotification({type: 'error', message: `Failed to fetch criteria: ${errorData.message}`});
                   console.error('Failed to fetch criteria');
               }
            } catch (error) {
                showNotification({type: 'error', message: `Error fetching criteria: ${error.message}`});
                console.error('Error fetching criteria:', error);
            }
        };
       if(projectId){
         fetchCriteria();
       }
    }, [projectId, showNotification, token]);//Include showNotification and token in dependency array


    const handleAddInclusionCriteria = async () => {
          if (!formData.newInclusion) return;
        try {
             const response = await fetch(
                `${config.apiBaseUrl}/screening/criteria`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                   body: JSON.stringify({ criterion: formData.newInclusion, type: 'inclusion', project_id: projectId }),
                }
             );
            if (response.ok) {
                 const data = await response.json();
                  showNotification({type: 'success', message: 'Inclusion criteria added successfully'});
                setInclusionCriteria([...inclusionCriteria, data]);
              setFormData(prevState => ({ ...prevState, newInclusion: '' })); //clear input field after added
             } else {
                  const errorData = await response.json();
                    showNotification({type: 'error', message: `Failed to add inclusion criteria: ${errorData.message}`});
                console.error('Failed to add inclusion criteria.');
            }
         } catch (error) {
            showNotification({type: 'error', message: `Error adding inclusion criteria: ${error.message}`});
              console.error('Error adding inclusion criteria:', error);
        }
    };

    const handleAddExclusionCriteria = async () => {
         if (!formData.newExclusion) return;
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/screening/criteria`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ criterion: formData.newExclusion, type: 'exclusion', project_id: projectId }),
                }
            );
           if (response.ok) {
                const data = await response.json();
               showNotification({type: 'success', message: 'Exclusion criteria added successfully'});
              setExclusionCriteria([...exclusionCriteria, data]);
                setFormData(prevState => ({ ...prevState, newExclusion: '' })); //clear input field after added
          } else {
               const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to add exclusion criteria: ${errorData.message}`});
              console.error('Failed to add exclusion criteria.');
            }
        } catch (error) {
            showNotification({type: 'error', message: `Error adding exclusion criteria: ${error.message}`});
            console.error('Error adding exclusion criteria:', error);
      }
    };
 const handleDeleteCriteria = async (criteriaId, type) => {
    try {
           const response = await fetch(
               `${config.apiBaseUrl}/screening/criteria/${criteriaId}`,
               {
                   method: 'DELETE',
                    headers: {
                       'Authorization': `Bearer ${token}`,
                    },
               }
           );
          if (response.ok) {
              showNotification({type: 'success', message: 'Criteria deleted successfully.'});
            if (type === 'inclusion') {
                 setInclusionCriteria(inclusionCriteria.filter(criterion => criterion.criterion_id !== criteriaId))
            } else {
                  setExclusionCriteria(exclusionCriteria.filter(criterion => criterion.criterion_id !== criteriaId));
            }
         } else {
               const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to delete criteria: ${errorData.message}`});
            console.error('Failed to delete criteria.');
        }
    } catch (error) {
        showNotification({type: 'error', message: `Error deleting criteria: ${error.message}`});
       console.error('Error deleting criteria:', error);
      }
  };

    return (
        <div className={styles.criteriaContainer}>
            <h1>Inclusion/Exclusion Criteria</h1>
            {projectId ? (
                <>
                    <div className={styles.criteriaSection}>
                        <h2>Inclusion Criteria</h2>
                         <div className={styles.addCriteria}>
                          <input
                              type="text"
                             placeholder="Add inclusion criteria"
                             value={formData.newInclusion || ''}
                             onChange={(e) => handleInputChange('newInclusion', e.target.value)}
                               className={styles.criteriaInput}
                           />
                           <button onClick={handleAddInclusionCriteria} className={styles.addButton}>
                            Add
                            </button>
                        </div>
                         <ul className={styles.criteriaList}>
                            {inclusionCriteria.map((criteria) => (
                                <li key={criteria.criterion_id} className={styles.criteriaItem}>
                                    {criteria.criterion}
                                    <button onClick={()=>handleDeleteCriteria(criteria.criterion_id, 'inclusion')} className={styles.deleteButton}>Delete</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                   <div className={styles.criteriaSection}>
                       <h2>Exclusion Criteria</h2>
                       <div className={styles.addCriteria}>
                         <input
                               type="text"
                               placeholder="Add exclusion criteria"
                             value={formData.newExclusion || ''}
                             onChange={(e) => handleInputChange('newExclusion', e.target.value)}
                               className={styles.criteriaInput}
                         />
                         <button onClick={handleAddExclusionCriteria} className={styles.addButton}>
                              Add
                         </button>
                        </div>
                        <ul className={styles.criteriaList}>
                            {exclusionCriteria.map((criteria) => (
                                <li key={criteria.criterion_id} className={styles.criteriaItem}>
                                    {criteria.criterion}
                                      <button onClick={()=>handleDeleteCriteria(criteria.criterion_id, 'exclusion')} className={styles.deleteButton}>Delete</button>
                                </li>
                           ))}
                       </ul>
                   </div>
               </>
            ) : (
                <p>Select a project to manage criteria.</p>
            )}
        </div>
    );
};

export default CriteriaManagement;