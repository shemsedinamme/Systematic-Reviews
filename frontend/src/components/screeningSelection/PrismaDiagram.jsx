import React, { useState, useEffect } from 'react';
import styles from './PrismaDiagram.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import mermaid from 'mermaid';

const PrismaDiagram = ({ projectId }) => {
    const [diagram, setDiagram] = useState('');
    const [customizations, setCustomizations] = useState({
        fontFamily: 'Arial',
        fontSize: '12px',
        nodeColor: '#f9f9f9',
        textColor: '#333'
    });
    const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'forest',
        });
      const fetchPrismaData = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/screening/prisma-diagram?project_id=${projectId}`,
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
                      setDiagram(data.mermaid_diagram);
                } else {
                     const errorData = await response.json();
                      showNotification({type: 'error', message: `Failed to fetch PRISMA Diagram Data: ${errorData.message}`});
                    console.error('Failed to fetch PRISMA Diagram Data.');
               }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching PRISMA Diagram Data: ${error.message}`});
                console.error('Error fetching PRISMA Diagram Data:', error);
           }
        };
        if(projectId){
            fetchPrismaData();
       }
    }, [projectId, showNotification, token]); //Include showNotification and token in dependency array

    useEffect(() => {
        if(diagram){
            mermaid.contentLoaded();
        }
    }, [diagram])
    const handleCustomizationChange = (e) => {
        setCustomizations({ ...customizations, [e.target.name]: e.target.value });
    };

    const handleExportDiagram = (format) => {
         //TODO: Implement diagram export functionality using mermaid or a client side pdf library.
         showNotification({type: 'warning', message: 'Implement Export using mermaid client library'});
    };

    if (!projectId) {
        return <p>Select a project to generate PRISMA diagram.</p>;
    }
    return (
        <div className={styles.diagramContainer}>
            <h1>PRISMA Flow Diagram</h1>
            {diagram ? (
                <>
                    <div className={styles.customizationForm}>
                         <h2>Diagram Customization</h2>
                        <input
                            type="text"
                             placeholder="Font Family"
                             name="fontFamily"
                            value={customizations.fontFamily}
                             onChange={handleCustomizationChange}
                              className={styles.diagramInput}
                       />
                        <input
                            type="text"
                             placeholder="Font Size"
                             name="fontSize"
                            value={customizations.fontSize}
                           onChange={handleCustomizationChange}
                            className={styles.diagramInput}
                       />
                        <input
                            type="text"
                            placeholder="Node Color"
                           name="nodeColor"
                             value={customizations.nodeColor}
                            onChange={handleCustomizationChange}
                            className={styles.diagramInput}
                       />
                     <input
                            type="text"
                            placeholder="Text Color"
                             name="textColor"
                           value={customizations.textColor}
                             onChange={handleCustomizationChange}
                            className={styles.diagramInput}
                      />
                    </div>
                    <div className="mermaid" data-mermaid={diagram} style={{ fontFamily: customizations.fontFamily, fontSize: customizations.fontSize, backgroundColor: customizations.nodeColor, color: customizations.textColor }}></div>
                    <div className={styles.exportActions}>
                        <button onClick={() => handleExportDiagram('pdf')}  className={styles.exportButton}>Export PDF</button>
                         <button onClick={() => handleExportDiagram('png')} className={styles.exportButton}>Export PNG</button>
                      <button onClick={() => handleExportDiagram('svg')}  className={styles.exportButton}>Export SVG</button>
                    </div>
                </>
            ) : (
                <p>Unable to generate PRISMA diagram.</p>
            )}
        </div>
    );
};

export default PrismaDiagram;