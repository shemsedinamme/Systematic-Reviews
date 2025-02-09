//ExtractionFormBuilder.js
import React, { useState, useEffect } from 'react';
import styles from './ExtractionFormBuilder.module.css';
import { v4 as uuidv4 } from 'uuid';
import config from '../config'; // Import the configuration file

const ExtractionFormBuilder = ({ projectId }) => {
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formTemplates, setFormTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [fields, setFields] = useState([]);
    const [selectedField, setSelectedField] = useState(null);
    const [fieldLabel, setFieldLabel] = useState('');
    const [fieldType, setFieldType] = useState('text');
    const [fieldOptions, setFieldOptions] = useState('');
    const [conditionalLogic, setConditionalLogic] = useState('');
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchFormTemplates = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${config.apiBaseUrl}/extraction-forms/templates`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setFormTemplates(data);
                } else {
                    console.error('Failed to fetch form templates');
                }
            } catch (error) {
                console.error('Error fetching form templates:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFormTemplates();
    }, [token]);

    const handleAddField = () => {
        if (!fieldLabel || !fieldType) return;
        setFields([
            ...fields,
            { field_id: uuidv4(), field_label: fieldLabel, field_type: fieldType, field_options: fieldOptions, conditional_logic: conditionalLogic }
        ]);
        resetFieldInputs();
    };

    const resetFieldInputs = () => {
        setFieldLabel('');
        setFieldType('text');
        setFieldOptions('');
        setConditionalLogic('');
        setSelectedField(null);
    };

    const handleSelectField = (fieldId) => {
        const field = fields.find((field) => field.field_id === fieldId);
        if (field) {
            setFieldLabel(field.field_label);
            setFieldType(field.field_type);
            setFieldOptions(field.field_options);
            setConditionalLogic(field.conditional_logic);
            setSelectedField(fieldId);
        }
    };

    const handleUpdateField = () => {
        setFields(fields.map(field =>
            field.field_id === selectedField
                ? { field_id: selectedField, field_label: fieldLabel, field_type: fieldType, field_options: fieldOptions, conditional_logic: conditionalLogic }
                : field
        ));
        resetFieldInputs();
    };

    const handleDeleteField = (fieldId) => {
        setFields(fields.filter((field) => field.field_id !== fieldId));
    };

    const handleSelectTemplate = (e) => {
        setSelectedTemplate(e.target.value);
    };

    const handleCreateForm = async () => {
        try {
            const response = await fetch(`${config.apiBaseUrl}/extraction-forms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ form_name: formName, form_description: formDescription, fields: fields, template_id: selectedTemplate, project_id: projectId }),
            });

            if (response.ok) {
                alert('Data extraction form created successfully');
                setFormName('');
                setFormDescription('');
                setFields([]);
            } else {
                const errorData = await response.json();
                console.error('Failed to create form', errorData);
                alert('Failed to create form');
            }
        } catch (error) {
            console.error('Error creating form:', error);
            alert('An error occurred during form creation.');
        }
    };

    return (
        <div className={styles.formBuilderContainer}>
            <h1>Create Data Extraction Form</h1>
            {projectId ? (
                <>
                    <div className={styles.formDetails}>
                        <input
                            type="text"
                            placeholder="Form name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className={styles.formInput}
                        />
                        <textarea
                            placeholder="Form description"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            className={styles.formInput}
                        />
                        <select
                            value={selectedTemplate}
                            onChange={handleSelectTemplate}
                            className={styles.templateSelect}
                        >
                            <option value="" disabled>Select a template</option>
                            {formTemplates.map(template => (
                                <option key={template.template_id} value={template.template_id}>
                                    {template.template_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formFields}>
                        <div className={styles.fieldInput}>
                            <input
                                type="text"
                                placeholder="Field Label"
                                value={fieldLabel}
                                onChange={(e) => setFieldLabel(e.target.value)}
                                className={styles.fieldInputText}
                            />
                            <select
                                value={fieldType}
                                onChange={(e) => setFieldType(e.target.value)}
                                className={styles.fieldSelect}
                            >
                                <option value="text">Text</option>
                                <option value="numeric">Numeric</option>
                                <option value="date">Date</option>
                                <option value="dropdown">Dropdown</option>
                                <option value="checkbox">Checkbox</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Field Options (comma separated)"
                                value={fieldOptions}
                                onChange={(e) => setFieldOptions(e.target.value)}
                                className={styles.fieldInputText}
                            />
                            <input
                                type="text"
                                placeholder="Conditional Logic (e.g. field1=='yes')"
                                value={conditionalLogic}
                                onChange={(e) => setConditionalLogic(e.target.value)}
                                className={styles.fieldInputText}
                            />
                            <button onClick={handleAddField} className={styles.addButton}>Add Field</button>
                        </div>
                        <div className={styles.fieldsList}>
                            {fields.map((field) => (
                                <div key={field.field_id} className={styles.fieldItem}>
                                    <span onClick={() => handleSelectField(field.field_id)}>{field.field_label} ({field.field_type})</span>
                                    <button onClick={() => handleDeleteField(field.field_id)} className={styles.deleteButton}>Delete</button>
                                </div>
                            ))}
                        </div>
                        {selectedField && (
                            <div className={styles.editFields}>
                                <input
                                    type="text"
                                    placeholder="Field Label"
                                    value={fieldLabel}
                                    onChange={(e) => setFieldLabel(e.target.value)}
                                    className={styles.fieldInputText}
                                />
                                <select
                                    value={fieldType}
                                    onChange={(e) => setFieldType(e.target.value)}
                                    className={styles.fieldSelect}
                                >
                                    <option value="text">Text</option>
                                    <option value="numeric">Numeric</option>
                                    <option value="date">Date</option>
                                    <option value="dropdown">Dropdown</option>
                                    <option value="checkbox">Checkbox</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Field Options (comma separated)"
                                    value={fieldOptions}
                                    onChange={(e) => setFieldOptions(e.target.value)}
                                    className={styles.fieldInputText}
                                />
                                <input
                                    type="text"
                                    placeholder="Conditional Logic (e.g. field1=='yes')"
                                    value={conditionalLogic}
                                    onChange={(e) => setConditionalLogic(e.target.value)}
                                    className={styles.fieldInputText}
                                />
                                <button onClick={handleUpdateField} className={styles.updateButton}>Update Field</button>
                            </div>
                        )}
                    </div>
                    <button onClick={handleCreateForm} className={styles.createButton}>Create Form</button>
                </>
            ) : (
                <p>Select a project to create a data extraction form.</p>
            )}
        </div>
    );
};

export default ExtractionFormBuilder;
