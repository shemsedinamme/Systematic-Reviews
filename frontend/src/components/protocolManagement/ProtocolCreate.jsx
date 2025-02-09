import React, { useState, useEffect } from 'react';
import styles from './ProtocolCreate.module.css';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import config from '../config';
import { useNotification } from './useNotification';
import { useForm } from './useForm';


const ProtocolCreate = ({ projectId }) => {
    const [templates, setTemplates] = useState([]);
    const { formData, handleInputChange, setFormData } = useForm();
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
    }, [showNotification, token]); // Include showNotification and token in dependency array

    const handleTemplateChange = (e) => {
      setSelectedTemplate(e.target.value)
    };

    const handleEditorChange = (event, editor, sectionId) => {
        const data = editor.getData();
        setFormData(prevFormData => ({
          ...prevFormData,
            sections: prevFormData.sections.map(section =>
                section.section_id === sectionId ? { ...section, content: data } : section
            ),
        }));
    };

     const handleTitleChange = (e) => {
         setFormData({ ...formData, title: e.target.value });
     };
  const handleCreateProtocol = async () => {
        if (!selectedTemplate) {
             showNotification({type: 'error', message: 'Please select a template to create a protocol'});
           return;
      }
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/protocols`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ template_id: selectedTemplate, title: formData.title, project_id: projectId }),
                }
            );
            if (response.ok) {
               const data = await response.json();
               showNotification({type: 'success', message: 'Protocol Created successfully'});
              setFormData(data);
            } else {
                const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to create protocol: ${errorData.message}`});
                console.error('Failed to create protocol:', errorData);
             }
        } catch (error) {
             showNotification({type: 'error', message: `Error creating protocol: ${error.message}`});
            console.error('Error creating protocol:', error);
        }
    };
   const handleUpdateSection = async (sectionId) => {
    try {
      const response = await fetch(
           `${config.apiBaseUrl}/protocols/${formData.protocol_id}/sections/${sectionId}`,
           {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(formData.sections.find(section => section.section_id === sectionId)),
        });
        if (response.ok) {
            showNotification({type: 'success', message: 'Protocol section saved successfully'});
         } else {
               const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to update section: ${errorData.message}`});
              console.error('Failed to update section');
            }
       } catch (error) {
            showNotification({type: 'error', message: `Error updating section: ${error.message}`});
          console.error('Error updating section:', error);
      }
   };

    return (
        <div className={styles.protocolCreateContainer}>
            <h1>Create Protocol</h1>
            {projectId ? (
                <>
                    <div className={styles.protocolForm}>
                      <input
                        type="text"
                         placeholder="Enter Protocol Title"
                         value={formData.title || ''}
                         onChange={handleTitleChange}
                        className={styles.protocolInput}
                      />
                        <select
                            value={selectedTemplate}
                           onChange={handleTemplateChange}
                            className={styles.templateSelect}
                        >
                            <option value="" disabled selected>
                                Select a template
                            </option>
                            {templates.map((template) => (
                                <option key={template.template_id} value={template.template_id}>
                                    {template.template_name}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleCreateProtocol} className={styles.createButton}>
                            Create Protocol
                        </button>
                    </div>
                    {formData.sections && (
                        <div className={styles.sectionList}>
                            {formData.sections.map((section) => (
                                <div key={section.section_id} className={styles.sectionItem}>
                                    <h2>{section.section_name}</h2>
                                    <CKEditor
                                        editor={ClassicEditor}
                                         data={section.content || ''}
                                        onChange={(event, editor) =>
                                          handleEditorChange(event, editor, section.section_id)}
                                      />
                                    <button onClick={() => handleUpdateSection(section.section_id)} className={styles.saveButton}>
                                      Save Section
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                  </>
            ) : (
                <p>Select a project to create a protocol.</p>
            )}
        </div>
    );
};

export default ProtocolCreate;