import React, { useState, useEffect, useRef } from 'react';
import styles from './ProtocolEdit.module.css';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import config from '../config';
import { useNotification } from './useNotification';

const ProtocolEdit = ({ protocolId }) => {
    const [protocol, setProtocol] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [versionHistory, setVersionHistory] = useState([]);
     const { showNotification } = useNotification();
    const token = localStorage.getItem('token');
    const editorRef = useRef(null);

    useEffect(() => {
        const fetchProtocol = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/protocols/${protocolId}`,
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
                    setProtocol(data);
                } else {
                    const errorData = await response.json();
                    showNotification({type: 'error', message: `Failed to fetch protocol: ${errorData.message}`});
                   console.error('Failed to fetch protocol');
              }
            } catch (error) {
               showNotification({type: 'error', message: `Error fetching protocol: ${error.message}`});
                console.error('Error fetching protocol:', error);
            }
        };

        const fetchComments = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/protocols/${protocolId}/comments`,
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
                    setComments(data);
                } else {
                   const errorData = await response.json();
                     showNotification({type: 'error', message: `Failed to fetch comments: ${errorData.message}`});
                   console.error('Failed to fetch comments');
                }
            } catch (error) {
                  showNotification({type: 'error', message: `Error fetching comments: ${error.message}`});
                console.error('Error fetching comments:', error);
            }
        };
      const fetchVersionHistory = async () => {
            try {
               const response = await fetch(
                 `${config.apiBaseUrl}/protocols/${protocolId}/versions`,
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
                    setVersionHistory(data);
                } else {
                     const errorData = await response.json();
                     showNotification({type: 'error', message: `Failed to fetch version history: ${errorData.message}`});
                    console.error('Failed to fetch version history');
              }
         } catch (error) {
              showNotification({type: 'error', message: `Error fetching version history: ${error.message}`});
            console.error('Error fetching version history:', error);
          }
      };
       if(protocolId){
            fetchProtocol();
            fetchComments();
            fetchVersionHistory();
        }
    }, [protocolId, showNotification, token]);//Include showNotification and token in dependency array

    const handleEditorChange = (event, editor, sectionId) => {
        const data = editor.getData();
        setProtocol((prevProtocol) => ({
            ...prevProtocol,
            sections: prevProtocol.sections.map((section) =>
                section.section_id === sectionId ? { ...section, content: data } : section
            ),
        }));
    };
   const handleUpdateSection = async (sectionId) => {
       try {
           const response = await fetch(
              `${config.apiBaseUrl}/protocols/${protocolId}/sections/${sectionId}`,
               {
                  method: 'PUT',
                  headers: {
                      'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`,
                  },
                    body: JSON.stringify(protocol.sections.find(section => section.section_id === sectionId)),
                }
          );
           if (response.ok) {
              showNotification({type: 'success', message: 'Protocol section updated successfully.'});
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
   const handleAddComment = async () => {
       if (!newComment) return;
       try {
          const response = await fetch(
                `${config.apiBaseUrl}/protocols/${protocolId}/comments`,
              {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ text: newComment }),
            }
        );
            if (response.ok) {
               const data = await response.json();
              showNotification({type: 'success', message: `Comment added successfully`});
               setComments([...comments, data]);
                setNewComment('');
           } else {
               const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to add comment: ${errorData.message}`});
               console.error('Failed to add comment');
           }
        } catch (error) {
             showNotification({type: 'error', message: `Error adding comment: ${error.message}`});
          console.error('Error adding comment:', error);
     }
    };

  const handleRevertVersion = async (versionId) => {
       try {
          const response = await fetch(
                `${config.apiBaseUrl}/protocols/${protocolId}/versions/${versionId}/revert`,
                {
                   method: 'POST',
                    headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`,
                    },
               }
           );
            if (response.ok) {
                 const data = await response.json();
                  showNotification({type: 'success', message: `Document version reverted to ${versionId}`});
                setProtocol(data);
           } else {
               const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to revert to a version: ${errorData.message}`});
               console.error('Failed to revert to a version.');
            }
      } catch (error) {
          showNotification({type: 'error', message: `Error reverting to version: ${error.message}`});
         console.error('Error reverting to version', error);
       }
    };

   if (!protocol) {
        return <p>Select a Protocol to edit.</p>;
    }
    return (
        <div className={styles.protocolEditContainer}>
           <h1>Edit Protocol: {protocol.title}</h1>
             <div className={styles.sectionList}>
                {protocol.sections.map((section) => (
                    <div key={section.section_id} className={styles.sectionItem}>
                        <h2>{section.section_name}</h2>
                        <CKEditor
                            editor={ClassicEditor}
                           data={section.content || ''}
                            onChange={(event, editor) => handleEditorChange(event, editor, section.section_id)}
                         />
                       <button className={styles.saveButton} onClick={()=>handleUpdateSection(section.section_id)}>
                          Save Section
                      </button>
                    </div>
                ))}
            </div>
            <div className={styles.commentsSection}>
               <h2>Comments</h2>
              <div className={styles.commentsList}>
                  {comments.map(comment => (
                      <div key={comment.comment_id} className={styles.comment}>
                            <p>{comment.text}</p>
                      </div>
                  ))}
              </div>
               <div className={styles.addComment}>
                    <input
                        type="text"
                        placeholder="Add a comment"
                        value={newComment}
                       onChange={(e) => setNewComment(e.target.value)}
                      className={styles.commentInput}
                    />
                    <button onClick={handleAddComment} className={styles.addButton}>
                        Add Comment
                    </button>
                </div>
            </div>
           <div className={styles.versionHistory}>
              <h2>Version History</h2>
              <ul>
                {versionHistory.map(version => (
                      <li key={version.version_id}>
                         <button onClick={() => handleRevertVersion(version.version_id)}>
                                Version: {version.version_id} - Date: {new Date(version.version_date).toLocaleString()}
                        </button>
                    </li>
                 ))}
             </ul>
         </div>
      </div>
    );
};

export default ProtocolEdit;