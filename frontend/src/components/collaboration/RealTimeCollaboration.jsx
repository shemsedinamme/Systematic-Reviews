// RealTimeCollaboration.js
import React, { useState, useEffect, useRef } from 'react';
import styles from './RealTimeCollaboration.module.css';
import { useNotification } from '../useNotification'; // Notification Hook
import config from '../config'; // Configuration file
import { io } from 'socket.io-client';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';


const RealTimeCollaboration = ({ documentType, documentId }) => {
    const [content, setContent] = useState('');
    const token = localStorage.getItem('token');
    const editorRef = useRef(null);
    const quillRef = useRef(null);
    const socketRef = useRef(null);

  useEffect(() => {
    const fetchDocument = async () => {
     try {
       const response = await fetch(`${config.apiBaseUrl}/collaboration/${documentType}/${documentId}`, {
            method: 'GET',
             headers: {
                'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`,
             },
        });
            if (response.ok) {
                  const data = await response.json();
                setContent(data.content);
             } else {
                 console.error('Failed to fetch document content');
          }
       } catch (error) {
          console.error('Error fetching document content:', error);
       }
    };
       if(documentType && documentId){
           fetchDocument();
        }

     // set up web socket connection
      socketRef.current = io(`${config.apiBaseUrl}`, {
          auth: { token: `Bearer ${token}` },
        });

       socketRef.current.on('connect', () => {
             console.log('Connected to WebSocket');
        });


      socketRef.current.on('document-update', (data) => {
        if (data.documentId !== documentId || data.documentType !== documentType) {
           return;
          }
       if (quillRef.current) {
           quillRef.current.updateContents(data.delta)
        }
      });
      return () => {
          if (socketRef.current) {
              socketRef.current.disconnect();
             console.log("Disconnected from WebSocket")
           }
      };
  }, [documentType, documentId, token]);



    useEffect(() => {
        if (!editorRef.current) {
            const quill = new Quill(editorRef.current, {
                modules: {
                    toolbar: [
                       [{ header: [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        ['image', 'code-block']
                    ],
                },
              placeholder: 'Compose your document...',
               theme: 'snow',
          });
         quillRef.current = quill;

            quill.on('text-change', (delta, oldDelta, source) => {
                if (source !== 'api' && socketRef.current) {
                   socketRef.current.emit('document-update', {
                        documentId,
                         documentType,
                       delta,
                   });
                   setContent(quill.getText());
                }
          });

        }
   }, [documentId, documentType]);


    const handleRevert = async () => {
      //TODO - handle revert version using API endpoints created in module 10
     alert('Implement Revert operation with a version id')
  };
  return (
    <div className={styles.collaborationContainer}>
      <h1>Real-Time Collaboration</h1>
      <div ref={editorRef} className={styles.editor} />
      <div className={styles.toolbar}>
        <button onClick={handleRevert} className={styles.revertButton}>
          Revert
         </button>
       </div>
    </div>
  );
};

export default RealTimeCollaboration;