import React, { useState, useEffect } from 'react';
import styles from './FullTextScreening.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const FullTextScreening = ({ projectId }) => {
    const [articles, setArticles] = useState([]);
    const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
    const [decision, setDecision] = useState('');
    const [exclusionReason, setExclusionReason] = useState('');
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const { showNotification } = useNotification();
     const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/screening/full-text?project_id=${projectId}`,
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
                    setArticles(data);
                 } else {
                    const errorData = await response.json();
                    showNotification({type: 'error', message: `Failed to fetch articles for full text screening: ${errorData.message}`});
                    console.error('Failed to fetch articles for full text screening');
                }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching articles for full text screening: ${error.message}`});
                console.error('Error fetching articles for full text screening:', error);
            }
        };
      if (projectId) {
            fetchArticles();
      }
    }, [projectId, showNotification, token]);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

 const handleDecision = async (articleId, decision) => {
     try {
         const response = await fetch(
            `${config.apiBaseUrl}/screening/full-text`,
             {
                method: 'POST',
                  headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`,
                  },
                    body: JSON.stringify({
                         article_id: articleId,
                        decision: decision,
                       reason_for_exclusion: decision === 'exclude' ? exclusionReason : '',
                       screening_stage: 'full-text',
                    }),
              }
           );
            if (response.ok) {
                setExclusionReason('');
             if(currentArticleIndex < articles.length - 1){
                setCurrentArticleIndex(currentArticleIndex + 1)
              } else {
                 setArticles(articles.filter(article => article.article_id !== articleId));
                 setCurrentArticleIndex(0);
                }
             } else {
               const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to save decision for article ${articleId}: ${errorData.message}`});
                 console.error('Failed to save decision for article:', articleId);
             }
        } catch (error) {
            showNotification({type: 'error', message: `Error setting decision for article ${articleId}: ${error.message}`});
            console.error(`Error setting decision for article ${articleId}:`, error);
       }
    };

    if (!projectId) {
        return <p>Select a project to start full text screening</p>;
    }

    if (!articles || articles.length === 0) {
        return <p>No articles for full text screening.</p>;
    }
    const currentArticle = articles[currentArticleIndex];
  return (
        <div className={styles.fullTextContainer}>
            <h1>Full Text Screening</h1>
           {currentArticle && (
            <div className={styles.articleDisplay}>
                   <div className={styles.articleContent}>
                       <h2>{currentArticle.title}</h2>
                    {currentArticle.fulltext ? (
                         <div className={styles.pdfViewer}>
                         <Document
                            file={currentArticle.fulltext}
                            onLoadSuccess={onDocumentLoadSuccess}
                         >
                               <Page pageNumber={pageNumber} />
                          </Document>
                            <div className={styles.pageNav}>
                                 <button onClick={() => setPageNumber(pageNumber - 1)} disabled={pageNumber <= 1} className={styles.navButton}>
                                        Previous
                                     </button>
                                     {pageNumber && numPages && <span>Page {pageNumber} of {numPages}</span>}
                                  <button onClick={() => setPageNumber(pageNumber + 1)} disabled={pageNumber >= numPages} className={styles.navButton}>
                                       Next
                                  </button>
                            </div>
                        </div>
                     ) : (
                        <p> Full text is not available for this article.</p>
                    )}
                 </div>
                 <div className={styles.decisionForm}>
                    <div className={styles.decisionButtons}>
                          <button onClick={() => handleDecision(currentArticle.article_id, 'include')} className={styles.includeButton}>
                            Include
                         </button>
                         <button onClick={() => handleDecision(currentArticle.article_id, 'exclude')} className={styles.excludeButton}>
                              Exclude
                         </button>
                      <button onClick={() => handleDecision(currentArticle.article_id, 'postpone')} className={styles.postponeButton}>
                             Postpone
                       </button>
                     </div>
                     <textarea
                           placeholder="Reason for exclusion"
                           value={exclusionReason}
                            onChange={(e) => setExclusionReason(e.target.value)}
                           className={styles.exclusionText}
                    />
                </div>
             </div>
          )}
        </div>
    );
};

export default FullTextScreening;