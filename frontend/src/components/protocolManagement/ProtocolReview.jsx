import React, { useState, useEffect } from 'react';
import styles from './ProtocolReview.module.css';
import config from '../config';
import { useNotification } from './useNotification'; // Import the notification hook
const ProtocolReview = ({ protocolId }) => {
    const [reviews, setReviews] = useState([]);
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedReviewer, setSelectedReviewer] = useState('');
     const [availableUsers, setAvailableUsers] = useState([]);
    const { showNotification } = useNotification(); // Initialize notification hook
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${config.apiBaseUrl}/admin/users`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                         'Authorization': `Bearer ${token}`,
                    },
                });
                 if (response.ok) {
                    const data = await response.json();
                    setAvailableUsers(data);
                 } else {
                      const errorData = await response.json();
                       showNotification({type: 'error', message: `Failed to fetch users: ${errorData.message}`});
                     console.error('Failed to fetch users');
                 }
            } catch (error) {
                  showNotification({type: 'error', message: `Error fetching users: ${error.message}`});
                console.error('Error fetching users:', error);
            }
        };
        const fetchReviews = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/protocols/${protocolId}/reviews`,
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
                  setReviews(data);
                 } else {
                      const errorData = await response.json();
                       showNotification({type: 'error', message: `Failed to fetch reviews: ${errorData.message}`});
                    console.error('Failed to fetch reviews');
              }
            } catch (error) {
                   showNotification({type: 'error', message: `Error fetching reviews: ${error.message}`});
               console.error('Error fetching reviews:', error);
           }
       };

      const fetchApprovalHistory = async () => {
         try {
            const response = await fetch(
                `${config.apiBaseUrl}/protocols/${protocolId}/approvals`,
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
                setApprovalHistory(data);
            } else {
                 const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to fetch approval history: ${errorData.message}`});
               console.error('Failed to fetch approval history');
           }
        } catch (error) {
               showNotification({type: 'error', message: `Error fetching approval history: ${error.message}`});
             console.error('Error fetching approval history:', error);
       }
      };
    if(protocolId){
      fetchUsers();
        fetchReviews();
        fetchApprovalHistory();
      }
    }, [protocolId, showNotification, token]); //Include notification and token in dependency array


 const handleAssignReviewer = async () => {
      if (!selectedSection || !selectedReviewer) return;
    try {
          const response = await fetch(
              `${config.apiBaseUrl}/protocols/${protocolId}/reviews`,
              {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                  },
                   body: JSON.stringify({
                      section_id: selectedSection,
                      reviewer_id: selectedReviewer,
                  }),
              }
          );
          if (response.ok) {
             const updatedData = await response.json();
             showNotification({type: 'success', message: `Reviewer assigned successfully`});
             setReviews([...reviews, updatedData])
             setSelectedSection('');
             setSelectedReviewer('');
          } else {
              const errorData = await response.json();
              showNotification({type: 'error', message: `Failed to assign reviewer: ${errorData.message}`});
            console.error('Failed to assign reviewer');
          }
     } catch (error) {
         showNotification({type: 'error', message: `Error assigning reviewer: ${error.message}`});
        console.error('Error assigning reviewer:', error);
    }
 };


   const handleAddComment = async (reviewId) => {
       if(!newComment) return;
       try {
         const response = await fetch(
              `${config.apiBaseUrl}/reviews/${reviewId}`,
                {
                    method: 'PUT',
                   headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`,
                   },
                    body: JSON.stringify({ comment: newComment }),
                }
            );
           if (response.ok) {
              const updatedData = await response.json();
                showNotification({type: 'success', message: `Review comment added successfully`});
              setReviews(reviews.map(review=> review.review_id === updatedData.review_id? updatedData: review));
              setNewComment('');
            } else {
                 const errorData = await response.json();
                  showNotification({type: 'error', message: `Failed to add review comment: ${errorData.message}`});
               console.error('Failed to add review comment');
           }
       } catch (error) {
             showNotification({type: 'error', message: `Error adding review comment: ${error.message}`});
          console.error('Error adding review comment:', error);
       }
   };


    const handleApprove = async () => {
       try {
             const response = await fetch(
                `${config.apiBaseUrl}/protocols/${protocolId}/approvals`,
               {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`,
                   },
               }
            );
           if (response.ok) {
              const updatedData = await response.json();
                showNotification({type: 'success', message: 'Protocol Approved'});
               setApprovalHistory([...approvalHistory, updatedData]);
           } else {
               const errorData = await response.json();
               showNotification({type: 'error', message: `Failed to approve protocol: ${errorData.message}`});
               console.error('Failed to approve protocol');
           }
      } catch (error) {
            showNotification({type: 'error', message: `Error approving protocol: ${error.message}`});
            console.error('Error approving protocol:', error);
      }
    };


    if (!protocolId) {
        return <p>Select a protocol to manage review and approval.</p>;
    }
    return (
        <div className={styles.reviewContainer}>
            <h1>Protocol Review and Approval</h1>
            <div className={styles.assignReviewer}>
              <select
                     value={selectedSection}
                     onChange={(e) => setSelectedSection(e.target.value)}
                    className={styles.selectInput}
                    >
                        <option value="" disabled selected>
                            Select a section to assign reviewer
                        </option>
                        {reviews && reviews.map(review=>(
                            <option key={review.section_id} value={review.section_id}>
                                {review.section_name}
                            </option>
                        ))}
                   </select>
                   <select
                       value={selectedReviewer}
                       onChange={(e) => setSelectedReviewer(e.target.value)}
                        className={styles.selectInput}
                    >
                     <option value="" disabled selected>
                        Select a Reviewer
                      </option>
                        {availableUsers.map((user) => (
                             <option key={user.user_id} value={user.user_id}>
                                 {user.username}
                             </option>
                         ))}
                   </select>
                 <button onClick={handleAssignReviewer} className={styles.assignButton}>
                   Assign Reviewer
                </button>
            </div>
            <div className={styles.reviewList}>
                {reviews.map((review) => (
                    <div key={review.review_id} className={styles.reviewItem}>
                        <h3>Review for {review.section_name}</h3>
                        <p>Reviewer: {availableUsers.find(user=>user.user_id === review.reviewer_id)?.username}</p>
                       {review.comment && <p>Comment: {review.comment}</p>}
                     <div className={styles.commentAction}>
                        <input
                            type="text"
                           placeholder="Add comment"
                            value={newComment}
                           onChange={(e) => setNewComment(e.target.value)}
                            className={styles.commentInput}
                        />
                        <button onClick={() => handleAddComment(review.review_id)} className={styles.commentButton}>
                            Add Comment
                        </button>
                   </div>
                </div>
             ))}
         </div>
         <div className={styles.approvalSection}>
                <h2>Approval History:</h2>
                <ul>
                   {approvalHistory.map(approval =>(
                       <li key={approval.approval_id}> Approved on : {new Date(approval.approval_date).toLocaleDateString()} </li>
                    ))}
               </ul>
                <button onClick={handleApprove} className={styles.approveButton}>
                    Approve Protocol
              </button>
        </div>
    </div>
    );
};

export default ProtocolReview;