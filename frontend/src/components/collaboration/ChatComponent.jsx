// ChatComponent.js
import React, { useState, useEffect, useRef } from 'react';
import styles from './ChatComponent.module.css';
import { useNotification } from '../useNotification'; // Notification Hook
import config from '../config'; // Configuration file
import { io } from 'socket.io-client';

const ChatComponent = ({ projectId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
    const token = localStorage.getItem('token');
    const socketRef = useRef(null);
    useEffect(() => {
        // set up web socket connection
       socketRef.current = io(`${config.apiBaseUrl}`, {
           auth: { token: `Bearer ${token}` },
         });

        socketRef.current.on('connect', () => {
             console.log('Connected to WebSocket');
       });

     socketRef.current.on('chat-message', (message) => {
           setMessages((prevMessages) => [...prevMessages, message]);
        });

      return () => {
          if(socketRef.current)
           socketRef.current.disconnect();
          console.log("Disconnected from WebSocket");
      };
    }, [projectId]);


  const handleSendMessage = () => {
      if (newMessage && socketRef.current) {
          socketRef.current.emit('chat-message', {
            senderId: 1,
              projectId,
           messageText: newMessage,
          });
         setNewMessage('');
        }
  };

  return (
    <div className={styles.chatContainer}>
      <h1>Chat</h1>
      <div className={styles.messageList}>
        {messages.map((message, index) => (
           <div key={index} className={styles.messageItem}>
                {message.messageText}
             </div>
        ))}
      </div>
      <div className={styles.messageInput}>
        <input
          type="text"
           placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
             className={styles.messageText}
        />
        <button onClick={handleSendMessage} className={styles.sendButton}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;