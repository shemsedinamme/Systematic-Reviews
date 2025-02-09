import React, { useState, useEffect } from 'react';
import styles from './ManuscriptWriter.module.css';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import config from '../config';
const apiBaseUrl = 'http://your-api-base-url.com'; // Change to your actual base URL

const ManuscriptWriter = ({ projectId }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [manuscript, setManuscript] = useState({ title: '', sections: {} });
  const [styleGuide, setStyleGuide] = useState('apa');
  const token = localStorage.getItem('token');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/manuscripts/templates`, {
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
          setMessage('Failed to fetch manuscript templates.');
        }
      } catch (error) {
        setMessage('Error fetching manuscript templates.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchTemplates();
    }
  }, [projectId, token]);

  const handleTemplateChange = (e) => {
    setSelectedTemplate(e.target.value);
  };

  const handleEditorChange = (event, editor, sectionId) => {
    const data = editor.getData();
    setManuscript((prevManuscript) => ({
      ...prevManuscript,
      sections: {
        ...prevManuscript.sections,
        [sectionId]: data,
      },
    }));
  };

  const handleTitleChange = (e) => {
    setManuscript({ ...manuscript, title: e.target.value });
  };

  const handleCreateManuscript = async () => {
    if (!selectedTemplate) {
      setMessage('Select a template for creating the manuscript.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/manuscripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ template_id: selectedTemplate, title: manuscript.title, project_id: projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        setManuscript(data);
        setMessage('Manuscript created successfully.');
      } else {
        setMessage('Failed to create manuscript.');
      }
    } catch (error) {
      setMessage('An error occurred during manuscript creation.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSection = async (sectionId) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/manuscripts/${manuscript.manuscript_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ...manuscript, sections: { [sectionId]: manuscript.sections[sectionId] } }),
      });

      if (response.ok) {
        setMessage('Manuscript section saved.');
      } else {
        setMessage('Failed to save manuscript section.');
      }
    } catch (error) {
      setMessage('Error saving manuscript section.');
    } finally {
      setLoading(false);
    }
  };

  const handleStyleGuideChange = (e) => {
    setStyleGuide(e.target.value);
    // TODO: Implement style guide change
  };

  const handleExportManuscript = async (format) => {
    if (!manuscript) {
      setMessage('Generate a manuscript before exporting.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/manuscripts/${manuscript.manuscript_id}/export/${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manuscript.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setMessage(`Failed to export manuscript as ${format}.`);
      }
    } catch (error) {
      setMessage(`An error occurred while exporting the manuscript as ${format}.`);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return <p>Select a project to create a manuscript.</p>;
  }

  return (
    <div className={styles.writerContainer}>
      <h1>Manuscript Writer</h1>
      {loading && <p>Loading...</p>}
      <div className={styles.manuscriptForm}>
        <input
          type="text"
          placeholder="Enter manuscript title"
          value={manuscript.title}
          onChange={handleTitleChange}
          className={styles.manuscriptInput}
        />
        <select
          value={selectedTemplate}
          onChange={handleTemplateChange}
          className={styles.templateSelect}
        >
          <option value="" disabled>Select a manuscript template</option>
          {templates.map((template) => (
            <option key={template.template_id} value={template.template_id}>
              {template.template_name}
            </option>
          ))}
        </select>
        <button onClick={handleCreateManuscript} className={styles.createButton}>Create Manuscript</button>
      </div>
      {manuscript && manuscript.sections && Object.keys(manuscript.sections).length > 0 && (
        <div className={styles.sectionList}>
          {Object.keys(manuscript.sections).map((sectionId) => (
            <div key={sectionId} className={styles.sectionItem}>
              <CKEditor
                editor={ClassicEditor}
                data={manuscript.sections[sectionId] || ''}
                onChange={(event, editor) => handleEditorChange(event, editor, sectionId)}
              />
              <button onClick={() => handleUpdateSection(sectionId)} className={styles.saveButton}>Save Section</button>
            </div>
          ))}
        </div>
      )}
      {manuscript && (
        <div className={styles.formatAndExport}>
          <select
            value={styleGuide}
            onChange={handleStyleGuideChange}
            className={styles.styleSelect}
          >
            <option value="apa">APA</option>
            <option value="mla">MLA</option>
            <option value="chicago">Chicago</option>
            <option value="vancouver">Vancouver</option>
          </select>
          <button onClick={handleCheckGrammar} className={styles.checkButton}>Check Grammar</button>
          <button onClick={() => handleFormatCitation(manuscript.sections)} className={styles.citationButton}>Format Citation</button>
          <button onClick={() => handleExportManuscript('pdf')} className={styles.exportButton}>Export PDF</button>
          <button onClick={() => handleExportManuscript('word')} className={styles.exportButton}>Export Word</button>
        </div>
      )}
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default ManuscriptWriter;
