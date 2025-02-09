// RiskOfBiasAssessment.js
import React, { useState, useEffect } from 'react';
import styles from './RiskOfBiasAssessment.module.css';

const RiskOfBiasAssessment = ({ projectId }) => {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [assessments, setAssessments] = useState({});
  const [comments, setComments] = useState({});
    const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchTools = async () => {
      try {
          const response = await fetch('http://10.180.50.140:3306/risk-of-bias/tools', {
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
              console.error('Failed to fetch risk of bias tools');
          }
      } catch (error) {
        console.error('Error fetching risk of bias tools:', error);
      }
    };
        if (projectId){
            fetchTools()
        }
  }, [projectId]);

  const handleToolChange = async (e) => {
      setSelectedTool(e.target.value);
      try {
          const response = await fetch(`http://10.180.50.140:3306/risk-of-bias/tools/${e.target.value}/criteria`, {
              method: 'GET',
              headers: {
                   'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`,
                },
          });
            if (response.ok) {
                 const data = await response.json();
                setCriteria(data);
                 const initialAssessment = {};
                   data.forEach(c=> initialAssessment[c.criteria_id] = '');
                setAssessments(initialAssessment);
                 setComments({});
            } else {
                console.error('Failed to fetch criteria for the selected tool');
            }
        } catch (error) {
            console.error('Error fetching criteria for the selected tool:', error);
        }
  };
    const handleRatingChange = (criteriaId, value) => {
       setAssessments({...assessments, [criteriaId]: value})
  };
    const handleCommentChange = (criteriaId, value) => {
       setComments({...comments, [criteriaId]: value})
    };


    const handleSaveAssessment = async () => {
      try {
          const assessmentPayload = Object.keys(assessments).map(criteriaId =>({
            criteria_id: criteriaId,
             rating: assessments[criteriaId],
              comment: comments[criteriaId]
          }));
        const response = await fetch('http://10.180.50.140:3306/risk-of-bias/assessments', {
            method: 'POST',
          headers: {
            'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({tool_id: selectedTool, assessments: assessmentPayload, study_id: 1}),
         });
          if(response.ok){
            alert('Risk of bias assessment submitted successfully');
          } else {
              const errorData = await response.json();
             console.error('Failed to save risk of bias assessment', errorData);
               alert('Failed to save risk of bias assessment')
        }
      } catch (error) {
           console.error('Error saving risk of bias assessment:', error);
           alert('An error occurred while saving risk of bias assessment.')
       }

    };


  if (!projectId) {
    return <p>Select a project to perform risk of bias assessment.</p>;
  }

  return (
    <div className={styles.riskOfBiasContainer}>
      <h1>Risk of Bias Assessment</h1>
        {tools && tools.length > 0 ? (
             <>
          <select
             value={selectedTool}
              onChange={handleToolChange}
                className={styles.toolSelect}
            >
           <option value="" disabled selected>Select a Risk of Bias Tool</option>
            {tools.map((tool) => (
             <option key={tool.tool_id} value={tool.tool_id}>
             {tool.tool_name}
             </option>
            ))}
           </select>
           {criteria && criteria.length > 0 && (
            <div className={styles.criteriaList}>
              {criteria.map((criterion) => (
                  <div key={criterion.criteria_id} className={styles.criteriaItem}>
                       <h3>{criterion.criteria_text}</h3>
                    {criterion.criteria_type === 'rating' && (
                          <select
                             value={assessments[criterion.criteria_id]}
                             onChange={(e) => handleRatingChange(criterion.criteria_id, e.target.value)}
                             className={styles.ratingSelect}
                            >
                            <option value="">Select a rating</option>
                              {criterion.criteria_options && criterion.criteria_options.split(',').map((option, index) => (
                                  <option key={index} value={option}>{option}</option>
                              ))}
                          </select>
                    )}
                      <textarea
                           placeholder="Add a justification or comment"
                         value={comments[criterion.criteria_id] || ''}
                         onChange={(e)=>handleCommentChange(criterion.criteria_id, e.target.value)}
                           className={styles.commentText}
                     />
                  </div>
              ))}
           <button onClick={handleSaveAssessment} className={styles.saveButton}>Save Assessment</button>
           </div>
        )}
             </>
        ) : (
           <p>No available risk of bias assessment tools.</p>
        )}
    </div>
  );
};

export default RiskOfBiasAssessment;