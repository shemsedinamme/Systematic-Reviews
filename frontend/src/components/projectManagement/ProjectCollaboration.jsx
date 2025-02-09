import React, { useState, useEffect, useRef } from 'react';
import styles from './ProjectCollaboration.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import ProjectDocument from '../models/projectDocument.model';
import ProjectComment from '../models/projectComment.model';
import ProjectFile from '../models/projectFile.model';

const ProjectCollaboration = ({ projectId }) => {
    const [documentContent, setDocumentContent] = useState('');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [files, setFiles] = useState([]);
    const [newFile, setNewFile] = useState(null);
    const [versionHistory, setVersionHistory] = useState([]);
    const { showNotification } = useNotification();
    const token = localStorage.getItem('token');
    const editorRef = useRef(null);
    const documentId = '1';


  useEffect(() => {
       const fetchDocument = async () => {
            try {
                 const response = await fetch(
                      `${config.apiBaseUrl}/projects/${projectId}/documents/${documentId}`,
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
                      const document = new ProjectDocument(data)
                      setDocumentContent(document.content);
                  } else {
                      const errorData = await response.json();
                    showNotification({type: 'error', message: `Failed to fetch document: ${errorData.message}`});
                      console.error('Failed to fetch document');
                  }
              } catch (error) {
                    showNotification({type: 'error', message: `Error fetching document: ${error.message}`});
                    console.error('Error fetching document:', error);
               }
        };
        const fetchComments = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/projects/${projectId}/comments`,
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
                  const commentList = data.map(item => new ProjectComment(item));
                    setComments(commentList.map(item => item.toJSON()));
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
      const fetchFiles = async () => {
           try {
               const response = await fetch(
                   `${config.apiBaseUrl}/projects/${projectId}/files`,
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
                   const fileList = data.map(item => new ProjectFile(item));
                   setFiles(fileList.map(file => file.toJSON()));
               } else {
                    const errorData = await response.json();
                     showNotification({type: 'error', message: `Failed to fetch files: ${errorData.message}`});
                  console.error('Failed to fetch files');
               }
           } catch (error) {
                 showNotification({type: 'error', message: `Error fetching files: ${error.message}`});
               console.error('Error fetching files:', error);
           }
       };
       const fetchVersionHistory = async () => {
          try {
              const response = await fetch(
                `${config.apiBaseUrl}/projects/${projectId}/documents/1/version`,
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

    if (projectId) {
       fetchDocument();
       fetchComments();
       fetchFiles();
        fetchVersionHistory();
        }
  }, [projectId, showNotification, token]);
    const handleContentChange = async (e) => {
        setDocumentContent(e.target.value);
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/projects/${projectId}/documents/1`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ content: e.target.value }),
                }
            );
            if (response.ok) {
                const data = await response.json();
                const newDocument = new ProjectDocument(data);
                setDocumentContent(newDocument.content)
                console.log('Document content saved');
            } else {
               const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to save document content: ${errorData.message}`});
                console.error('Failed to save document content');
            }
        } catch (error) {
            showNotification({type: 'error', message: `Error saving document content: ${error.message}`});
           console.error('Error saving document content:', error);
        }
    };

    const handleAddComment = async () => {
        if (!newComment) {
           showNotification({type: 'error', message: 'Comment cannot be empty'});
           return;
        }
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/projects/${projectId}/comments`,
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
               const newCommentObj = new ProjectComment(data)
                showNotification({type: 'success', message: `Comment added successfully`});
                 setComments([...comments, newCommentObj.toJSON()]);
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

     const handleFileUpload = async () => {
        if (!newFile) {
          showNotification({type: 'error', message: 'Please select a file.'});
          return;
      }
      const formData = new FormData();
       formData.append('file', newFile);

        try {
            const response = await fetch(
                `${config.apiBaseUrl}/projects/${projectId}/files`,
                {
                   method: 'POST',
                   headers: {
                       Authorization: `Bearer ${token}`,
                   },
                  body: formData,
                }
            );
            if (response.ok) {
               const data = await response.json();
               const newFileObj = new ProjectFile(data);
                showNotification({type: 'success', message: `File uploaded successfully`});
              setFiles([...files, newFileObj.toJSON()]);
               setNewFile(null);
           } else {
               const errorData = await response.json();
                showNotification({type: 'error', message: `File upload failed: ${errorData.message}`});
                 console.error('File upload failed');
           }
       } catch (error) {
              showNotification({type: 'error', message: `Error uploading file: ${error.message}`});
            console.error('Error uploading file:', error);
       }
   };
   const handleRevertVersion = async (versionId) => {
    try {
        const response = await fetch(
           `${config.apiBaseUrl}/documents/1/versions/${versionId}/revert`,
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
             const document = new ProjectDocument(data);
             showNotification({type: 'success', message: `Document version reverted to ${versionId}`});
            setDocumentContent(document.content);
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

    if (!projectId) {
        return <p>Select a project to collaborate.</p>;
    }

    return (
        <div className={styles.collaborationContainer}>
            <h1>Project Collaboration</h1>
            <div className={styles.documentEditor}>
                <textarea
                    ref={editorRef}
                    value={documentContent}
                    onChange={handleContentChange}
                    placeholder="Type document content here..."
                    className={styles.documentTextArea}
                />
            </div>
            <div className={styles.commentsSection}>
                <h2>Comments</h2>
                <div className={styles.commentsList}>
                    {comments.map((comment) => (
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
           <div className={styles.fileSharing}>
               <h2>File Sharing</h2>
               <div className={styles.fileUpload}>
                   <input
                       type="file"
                       onChange={(e) => setNewFile(e.target.files[0])}
                        className={styles.fileInput}
                    />
                   <button onClick={handleFileUpload} className={styles.uploadButton}>
                       Upload File
                    </button>
               </div>
               <ul className={styles.fileList}>
                   {files.map((file) => (
                      <li key={file.file_id}>
                           <a href={file.file_path} target="_blank" rel="noopener noreferrer">
                               {file.file_name}
                           </a>
                       </li>
                    ))}
                </ul>
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

export default ProjectCollaboration;
