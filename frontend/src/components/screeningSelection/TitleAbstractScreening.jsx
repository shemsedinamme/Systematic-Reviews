import React, { useState, useEffect } from 'react';
import styles from './TitleAbstractScreening.module.css';
import config from '../config';
import { useNotification } from './useNotification';


const TitleAbstractScreening = ({ projectId }) => {
    const [articles, setArticles] = useState([]);
    const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
    const [decision, setDecision] = useState('');
    const [exclusionReason, setExclusionReason] = useState('');
    const [screenedCount, setScreenedCount] = useState(0);
    const [remainingCount, setRemainingCount] = useState(0);
    const [selectedArticles, setSelectedArticles] = useState([]);
      const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    useEffect(() => {
      const fetchArticles = async () => {
           try {
               const response = await fetch(
                 `${config.apiBaseUrl}/screening/title-abstract?project_id=${projectId}`,
                  {
                      method: 'GET',
                    headers: {
                         'Authorization': `Bearer ${token}`,
                     },
                  }
            );
           if (response.ok) {
              const data = await response.json();
               setArticles(data);
           } else {
                 const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to fetch articles for screening: ${errorData.message}`});
               console.error('Failed to fetch articles for screening');
            }
        } catch (error) {
            showNotification({type: 'error', message: `Error fetching articles for screening: ${error.message}`});
           console.error('Error fetching articles for screening:', error);
      }
    };
      if (projectId) {
        fetchArticles();
      }
    }, [projectId, showNotification, token]);//Include notification and token in dependency array


    useEffect(() => {
         const fetchCounts = async () => {
          try {
           const response = await fetch(
            `${config.apiBaseUrl}/screening/title-abstract?project_id=${projectId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
               }
           );
            if (response.ok) {
                 const data = await response.json();
                 setScreenedCount(data.screened_count);
                setRemainingCount(data.remaining_count);
            } else {
               const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to fetch screened and remaining articles: ${errorData.message}`});
                 console.error('Failed to fetch screened and remaining articles.');
            }
         } catch (error) {
            showNotification({type: 'error', message: `Error fetching screened and remaining articles: ${error.message}`});
             console.error('Error fetching screened and remaining articles:', error);
        }
      };
      if(projectId){
         fetchCounts();
        }
    }, [projectId, articles, showNotification, token]);//Include notification and token in dependency array

  const handleDecision = async (articleId, decision) => {
      try {
          const response = await fetch(
              `${config.apiBaseUrl}/screening/title-abstract`,
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
                        screening_stage: 'title/abstract',
                   }),
                }
            );
            if (response.ok) {
                setExclusionReason('');
               if(currentArticleIndex < articles.length-1){
                   setCurrentArticleIndex(currentArticleIndex + 1);
                }else {
                     setArticles(articles.filter((article)=>article.article_id !== articleId))
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


   const handleSelectArticle = (articleId) => {
    if (selectedArticles.includes(articleId)) {
        setSelectedArticles(selectedArticles.filter((id) => id !== articleId));
      } else {
          setSelectedArticles([...selectedArticles, articleId]);
       }
  };
  const handleBatchAction = async (action) => {
    try {
         const response = await fetch(
              `${config.apiBaseUrl}/screening/title-abstract`,
                {
                    method: 'POST',
                   headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`,
                    },
                     body: JSON.stringify({
                         articles: selectedArticles,
                       decision: action,
                        reason_for_exclusion: action === 'exclude' ? exclusionReason : '',
                         screening_stage: 'title/abstract',
                   }),
               }
           );

         if (response.ok) {
             showNotification({type: 'success', message: 'Successfully applied batch actions'});
             if(currentArticleIndex < articles.length -1){
               setCurrentArticleIndex(currentArticleIndex+1)
              } else {
                setArticles(articles.filter((article)=> !selectedArticles.includes(article.article_id)))
                   setCurrentArticleIndex(0);
               }
           setSelectedArticles([]);
           setExclusionReason('');
       } else {
          const errorData = await response.json();
            showNotification({type: 'error', message: `Failed to update selected articles: ${errorData.message}`});
             console.error('Failed to update selected articles.');
         }
      } catch (error) {
        showNotification({type: 'error', message: `Error applying batch actions: ${error.message}`});
          console.error('Error applying batch actions:', error);
       }
 };


    if (!projectId) {
        return <p>Select a project to start screening.</p>;
    }

     if (!articles || articles.length === 0) {
        return <p>No articles to screen.</p>
    }

    const currentArticle = articles[currentArticleIndex];
  return (
        <div className={styles.screeningContainer}>
             <h1>Title & Abstract Screening</h1>
              <div className={styles.statusDisplay}>
               <span>Screened: {screenedCount}</span>
                <span>Remaining: {remainingCount}</span>
            </div>
            <div className={styles.articleDisplay}>
             <div className={styles.articleCard}>
                    <h2>{currentArticle.title}</h2>
                   <p>
                     <strong>Authors:</strong> {currentArticle.authors}
                   </p>
                   <p>
                     <strong>Journal:</strong> {currentArticle.journal}
                   </p>
                    <p><strong>Published Date:</strong> {new Date(currentArticle.publication_date).toLocaleDateString()}</p>
                   <p>
                       <strong>Abstract:</strong> {currentArticle.abstract}
                    </p>
                </div>
                <div className={styles.decisionForm}>
                    <div className={styles.singleDecision}>
                      <button
                           onClick={() => handleDecision(currentArticle.article_id, 'include')}
                            className={styles.includeButton}
                        >
                            Include
                       </button>
                        <button
                           onClick={() => handleDecision(currentArticle.article_id, 'exclude')}
                            className={styles.excludeButton}
                        >
                            Exclude
                        </button>
                        <button
                          onClick={() => handleDecision(currentArticle.article_id, 'postpone')}
                           className={styles.postponeButton}
                       >
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
            {articles.length > 1 && (
                <div className={styles.batchActions}>
                    <h2>Batch Actions:</h2>
                     <label className={styles.checkBoxContainer}>
                         <input
                           type="checkbox"
                           onChange={()=>handleSelectArticle(currentArticle.article_id)}
                       />
                           Select this article for batch actions.
                      </label>
                    <button onClick={() => handleBatchAction('include')} className={styles.includeButton}>
                        Include Selected
                     </button>
                    <button onClick={() => handleBatchAction('exclude')} className={styles.excludeButton}>
                        Exclude Selected
                    </button>
                    <button onClick={() => handleBatchAction('postpone')} className={styles.postponeButton}>
                        Postpone Selected
                    </button>
               </div>
          )}
        </div>
    );
};

export default TitleAbstractScreening;