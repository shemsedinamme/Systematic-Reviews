import React, { useState, useEffect } from 'react';
import styles from './ProtocolTemplate.module.css';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import { useNotification } from './useNotification';
import { useForm } from './useForm';


const ProtocolTemplate = () => {
    const { formData, handleInputChange, setFormData } = useForm();
    const [templates, setTemplates] = useState([]);
     const [selectedTemplate, setSelectedTemplate] = useState('');
    const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch(`${config.apiBaseUrl}/templates`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                   },
              });
                if (response.ok) {
                  const data = await response.json();
                     setTemplates(data);
                 } else {
                    const errorData = await response.json();
                    showNotification({type: 'error', message: `Failed to fetch protocol templates: ${errorData.message}`});
                    console.error('Failed to fetch protocol templates');
                }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching protocol templates: ${error.message}`});
              console.error('Error fetching protocol templates:', error);
            }
        };
       fetchTemplates();
  }, [showNotification, token]);//Include showNotification in dependency array


   const handleAddSection = () => {
     if(!formData.newSection) return;
      setFormData(prevFormData => ({
          ...prevFormData,
         sections: [...prevFormData.sections, { section_id: uuidv4(), section_name: formData.newSection, data_fields: [], }],
      }));
         setFormData(prevState => ({ ...prevState, newSection: '' }));// clear input field after added
     };

    const handleAddDataField = (sectionId, dataField) => {
      setFormData(prevFormData =>({
            ...prevFormData,
             sections: prevFormData.sections.map((section) =>
               section.section_id === sectionId ?
             {...section, data_fields: [...section.data_fields, {field_id: uuidv4(), field_name: dataField}]}
              : section
           )
       }))
    };

    const handleDeleteSection = (sectionId) => {
          setFormData(prevFormData =>({
           ...prevFormData,
            sections: prevFormData.sections.filter(section => section.section_id !== sectionId)
         }))
    };
  const handleCreateTemplate = async () => {
      try {
         const response = await fetch(`${config.apiBaseUrl}/templates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
               },
               body: JSON.stringify(formData),
          });
            if (response.ok) {
                const updatedData = await response.json();
                 showNotification({type: 'success', message: 'New template created successfully'});
                 setTemplates([...templates, updatedData]);
              setFormData({template_name: '', template_description:'', sections: []});
         } else {
              const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to create new template: ${errorData.message}`});
               console.error('Failed to create new template');
           }
      } catch (error) {
            showNotification({type: 'error', message: `Error creating new template: ${error.message}`});
            console.error('Error creating new template:', error);
       }
    };
  const handleShareTemplate = async (templateId) => {
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/templates/${templateId}/share`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ share: true }),
                }
            );
            if (response.ok) {
               showNotification({type: 'success', message: 'Template shared successfully'});
             } else {
                  const errorData = await response.json();
                   showNotification({type: 'error', message: `Failed to share template: ${errorData.message}`});
                  console.error('Failed to share template');
           }
        } catch (error) {
             showNotification({type: 'error', message: `Error sharing template: ${error.message}`});
            console.error('Error sharing template:', error);
       }
    };

  const fetchTemplate = async (templateId) => {
        try {
          const response = await fetch(`${config.apiBaseUrl}/templates/${templateId}`, {
             method: 'GET',
               headers: {
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${token}`,
                },
          });
            if (response.ok) {
                const data = await response.json();
                setFormData(data);
               setSelectedTemplate(templateId);
            } else {
                const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to fetch template: ${errorData.message}`});
               console.error('Failed to fetch template');
            }
       } catch (error) {
             showNotification({type: 'error', message: `Error fetching template: ${error.message}`});
            console.error('Error fetching template:', error);
        }
    };

    return (
        <div className={styles.templateContainer}>
            <h1>Protocol Templates</h1>
             <div className={styles.templateList}>
                <h2>Existing Templates</h2>
                {templates.map(template => (
                    <div key={template.template_id} className={styles.templateItem}>
                       <span>{template.template_name}</span>
                       <button onClick={()=>fetchTemplate(template.template_id)} className={styles.selectButton}>Select</button>
                       <button onClick={()=>handleShareTemplate(template.template_id)} className={styles.shareButton}>Share</button>
                     </div>
                  ))}
            </div>

            <div className={styles.newTemplate}>
                <h2>Create Template</h2>
                  <input
                      type="text"
                      name="template_name"
                    placeholder="Template title"
                    value={formData.template_name || ''}
                       onChange={(e)=> handleInputChange('template_name', e.target.value)}
                     className={styles.templateInput}
                  />
                <textarea
                     name="template_description"
                      placeholder="Template description"
                    value={formData.template_description || ''}
                     onChange={(e)=> handleInputChange('template_description', e.target.value)}
                     className={styles.templateInput}
                 />
                <div className={styles.addSection}>
                  <input
                         type="text"
                        placeholder="Add new section"
                       value={formData.newSection || ''}
                      onChange={(e)=> handleInputChange('newSection', e.target.value)}
                      className={styles.templateInput}
                  />
                     <button onClick={handleAddSection} className={styles.addButton}>
                         Add section
                      </button>
                   </div>
                   {formData.sections && formData.sections.map(section => (
                     <div key={section.section_id} className={styles.sectionItem}>
                           <h3>{section.section_name}</h3>
                         <div className={styles.addDataField}>
                                 <input
                                     type="text"
                                     placeholder="Add new data field"
                                   className={styles.templateInput}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddDataField(section.section_id, e.target.value)}
                                 />
                            </div>
                              {section.data_fields && (
                                <ul className={styles.dataFieldList}>
                                  {section.data_fields.map(field => (
                                     <li key={field.field_id}>{field.field_name}</li>
                                  ))}
                            </ul>
                         )}
                        <button onClick={()=>handleDeleteSection(section.section_id)} className={styles.deleteButton}>Delete Section</button>
                    </div>
                 ))}

                <button onClick={handleCreateTemplate} className={styles.createButton}>
                   Create Template
                 </button>
            </div>
        </div>
    );
};

export default ProtocolTemplate;