import React, { useState, useEffect } from 'react';
import styles from './RiskOfBiasAssessment.module.css';
import config from '../config';
import { useNotification } from './useNotification';


const RiskOfBiasAssessment = ({ articleId }) => {
    const [tools, setTools] = useState([]);
    const [selectedTool, setSelectedTool] = useState('');
    const [criteria, setCriteria] = useState([]);
     const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchTools = async () => {
            try {
                const response = await fetch(`${config.apiBaseUrl}/quality-assessment/risk-of-bias/tools`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`,
                   },
              });
                if (response.ok) {
                    const data = await response.json();
                    setTools(data);
                } else {
                    const errorData = await response.json();
                      showNotification({type: 'error', message: `Failed to fetch risk of bias tools: ${errorData.message}`});
                    console.error('Failed to fetch risk of bias tools');
                }
           } catch (error) {
              showNotification({type: 'error', message: `Error fetching risk of bias tools: ${error.message}`});
               console.error('Error fetching risk of bias tools:', error);
         }
      };
        const fetchCriteria = async () => {
          if (!selectedTool) return;
            try {
              const response = await fetch(`${config.apiBaseUrl}/quality-assessment/risk-of-bias/tools/${selectedTool}/criteria`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                         'Authorization': `Bearer ${token}`,
                  },
              });
                if (response.ok) {
                     const data = await response.json();
                    setCriteria(data)
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

        fetchTools();
        if(selectedTool){
         fetchCriteria();
      }
    }, [selectedTool, showNotification, token]);//Include notification and token in dependency array

    const handleToolChange = (e) => {
      setSelectedTool(e.target.value);
    };

  const handleAssessment = async (criterionId, rating, comment) => {
    try {
        const response = await fetch(
            `${config.apiBaseUrl}/quality-assessment/risk-of-bias/assessments`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`,
                 },
                 body: JSON.stringify(
                     [{study_id: articleId, tool_id: selectedTool, criteria_id: criterionId, rating: rating, comment: comment}],
                 ),
             }
        );
         if (response.ok) {
              showNotification({type: 'success', message: 'Assessment submitted successfully.'});
            } else {
                 const errorData = await response.json();
                   showNotification({type: 'error', message: `Failed to submit assessment: ${errorData.message}`});
                 console.error('Failed to submit assessment:');
             }
       } catch (error) {
            showNotification({type: 'error', message: `Error submitting assessment: ${error.message}`});
            console.error('Error submitting assessment:', error);
      }
  };
   if (!articleId) {
      return <p>Select an article to perform quality assessment.</p>;
  }
    if (!tools || tools.length === 0) {
        return <p>Loading risk of bias tools...</p>;
    }

    return (
        <div className={styles.assessmentContainer}>
            <h1>Risk of Bias Assessment</h1>
           <select
             value={selectedTool}
              onChange={handleToolChange}
              className={styles.toolSelect}
           >
              <option value="" disabled selected>Select a Risk of Bias Tool</option>
               {tools.map((tool)=>(
                 <option key={tool.tool_id} value={tool.tool_id}>{tool.tool_name}</option>
              ))}
            </select>
            {criteria && (
                <ul className={styles.criteriaList}>
                 {criteria.map((criterion) => (
                        <li key={criterion.criteria_id} className={styles.criteriaItem}>
                            <p>{criterion.criteria_text}</p>
                           <div className={styles.assessmentArea}>
                               <select className={styles.ratingSelect} id={`rating-${criterion.criteria_id}`} defaultValue="" >
                                   <option value="" disabled>Select a Rating</option>
                                   <option value="Low">Low</option>
                                   <option value="High">High</option>
                                   <option value="Unclear">Unclear</option>
                              </select>
                           <textarea
                                placeholder="Add Comment"
                             id={`comment-${criterion.criteria_id}`}
                            className={styles.commentTextarea}
                           />
                           <button  onClick={()=>handleAssessment(criterion.criteria_id, document.getElementById(`rating-${criterion.criteria_id}`).value,  document.getElementById(`comment-${criterion.criteria_id}`).value)} className={styles.submitButton}>
                             Submit
                           </button>
                         </div>
                       </li>
                     ))}
              </ul>
            )}
        </div>
    );
};

export default RiskOfBiasAssessment;