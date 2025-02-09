import React, { useState } from 'react';
import styles from './CitationManagement.module.css';
import config from '../config';
import { useNotification } from './useNotification';

const CitationManagement = () => {
    const [citationStyle, setCitationStyle] = useState('apa');
    const [citationInput, setCitationInput] = useState('');
    const [formattedCitation, setFormattedCitation] = useState('');
     const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    const handleStyleChange = (e) => {
        setCitationStyle(e.target.value);
    };
    const handleCitationInputChange = (e) => {
        setCitationInput(e.target.value);
    };
    const handleFormatCitation = async () => {
       if (!citationInput) {
           showNotification({type: 'error', message: 'Please enter a citation to format.'});
          return;
     }
        try {
          const response = await fetch(
                `${config.apiBaseUrl}/citation/format`,
              {
                method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                  },
                   body: JSON.stringify({ citation: citationInput, style: citationStyle }),
                }
            );
             if (response.ok) {
                 const data = await response.json();
               setFormattedCitation(data.formatted_citation);
            } else {
               const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to format citation: ${errorData.message}`});
                 console.error('Failed to format citation:', errorData);
            }
        } catch (error) {
             showNotification({type: 'error', message: `An error occurred formatting citation: ${error.message}`});
           console.error('Error formatting citation:', error);
        }
    };
   const handleGenerateBibliography = async () => {
        if(!citationInput){
             showNotification({type: 'error', message: 'Please enter a list of citations.'});
            return;
        }
       try {
            const response = await fetch(
               `${config.apiBaseUrl}/citation/bibliography`,
               {
                    method: 'POST',
                    headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`,
                    },
                   body: JSON.stringify({citations: citationInput, style: citationStyle}),
                }
            );
          if (response.ok) {
               const data = await response.json();
               setFormattedCitation(data.bibliography);
            } else {
                const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to generate bibliography: ${errorData.message}`});
                console.error('Failed to generate bibliography:', errorData);
           }
      } catch (error) {
         showNotification({type: 'error', message: `An error occurred while generating bibliography: ${error.message}`});
        console.error('Error generating bibliography:', error);
      }
    };

    return (
        <div className={styles.citationContainer}>
           <h1>Citation Management</h1>
           <div className={styles.citationForm}>
                <select
                   value={citationStyle}
                   onChange={handleStyleChange}
                    className={styles.styleSelect}
                >
                   <option value="apa">APA</option>
                   <option value="mla">MLA</option>
                     <option value="chicago">Chicago</option>
                   <option value="vancouver">Vancouver</option>
                </select>
                <textarea
                     placeholder="Enter Citation to Format, or a list of citations for bibliography"
                      value={citationInput}
                      onChange={handleCitationInputChange}
                       className={styles.citationTextArea}
                  />
            </div>
            <div className={styles.citationActions}>
                <button onClick={handleFormatCitation} className={styles.formatButton}>
                    Format Citation
               </button>
               <button onClick={handleGenerateBibliography} className={styles.bibliographyButton}>
                    Generate Bibliography
              </button>
           </div>

            {formattedCitation && (
                <div className={styles.formattedCitation}>
                    <h2>Formatted Citation</h2>
                     <p>{formattedCitation}</p>
                 </div>
            )}
        </div>
   );
};

export default CitationManagement;