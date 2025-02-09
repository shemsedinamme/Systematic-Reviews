import React, { useState, useEffect } from 'react';
import styles from './ReportGenerator.module.css';
import config from '../config';

const apiBaseUrl = 'http://your-api-base-url.com'; // Change to your actual base URL

const ReportGenerator = ({ projectId }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [report, setReport] = useState(null);
  const token = localStorage.getItem('token');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/reports/templates`, {
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
          setMessage('Failed to fetch report templates.');
        }
      } catch (error) {
        setMessage('Error fetching report templates.');
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

  const handleGenerateReport = async () => {
    if (!selectedTemplate) {
      setMessage('Please select a template.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ project_id: projectId, template_id: selectedTemplate }),
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data);
        setMessage('Report generated successfully. Check console for report data.');
        console.log("Generated Report:", data);
      } else {
        setMessage('Failed to generate report.');
      }
    } catch (error) {
      setMessage('Error generating report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format) => {
    if (!report) {
      setMessage('Generate report first before exporting.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/reports/${report.report_id}/export/${format}`, {
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
        a.download = `report.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setMessage(`Failed to export report as ${format}.`);
      }
    } catch (error) {
      setMessage(`An error occurred while exporting the report as ${format}.`);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return <p>Select a project to generate reports.</p>;
  }

  return (
    <div className={styles.reportContainer}>
      <h1>Report Generation</h1>
      {loading && <p>Loading...</p>}
      <select
        value={selectedTemplate}
        onChange={handleTemplateChange}
        className={styles.templateSelect}
      >
        <option value="" disabled>Select a Report Template</option>
        {templates.map((template) => (
          <option key={template.template_id} value={template.template_id}>
            {template.template_name}
          </option>
        ))}
      </select>
      <button onClick={handleGenerateReport} className={styles.generateButton}>Generate Report</button>
      {report && (
        <div className={styles.exportOptions}>
          <button onClick={() => handleExportReport('pdf')} className={styles.exportButton}>Export PDF</button>
          <button onClick={() => handleExportReport('word')} className={styles.exportButton}>Export Word</button>
          <button onClick={() => handleExportReport('excel')} className={styles.exportButton}>Export Excel</button>
          <button onClick={() => handleExportReport('csv')} className={styles.exportButton}>Export CSV</button>
        </div>
      )}
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default ReportGenerator;
