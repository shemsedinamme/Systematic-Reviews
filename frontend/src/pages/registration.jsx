import React, { useState } from 'react';
import styles from './Registration.module.css';
import config from '../config';
import { useNotification } from './useNotification';
import { useForm } from './useForm';

const Registration = () => {
    const { formData, handleInputChange, setFormData } = useForm();
     const { showNotification } = useNotification();
    const [showStudentFields, setShowStudentFields] = useState(false);

    const handleSubscriptionChange = (e) => {
        const selectedValue = e.target.value;
       setFormData(prevState => ({ ...prevState, subscriptionType: selectedValue}));
       setShowStudentFields(selectedValue === 'Student');
    };

  const handleIdCardChange = (e) => {
        setFormData(prevState => ({ ...prevState, idCard: e.target.files[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

         const formDataToSend = new FormData();
            formDataToSend.append('username', formData.username)
            formDataToSend.append('email', formData.email)
            formDataToSend.append('password', formData.password)
            formDataToSend.append('subscriptionOption', formData.subscriptionType)
            if (formData.studentId) formDataToSend.append('studentId', formData.studentId);
            if (formData.idCard) formDataToSend.append('idCard', formData.idCard);


        // Validate required fields
        if (!formData.username || !formData.email || !formData.password || !formData.subscriptionType) {
          showNotification({type: 'error', message: 'Please fill in all required fields.'});
            return;
        }

        try {
            const response = await fetch(`${config.apiBaseUrl}/register`, {
                method: 'POST',
                body: formDataToSend,
            });

            if (response.ok) {
                // Send emails
                await sendEmails(formDataToSend);
                // Show confirmation alert
                showNotification({type: 'success', message: 'Thank you for creating an account! Your registration is successful.'});
              setFormData({
                   username: '',
                 email: '',
                   password: '',
                  subscriptionType: '',
                  studentId: '',
                 idCard: null,
              })
                setShowStudentFields(false);
            } else {
                const errorData = await response.json();
                 showNotification({type: 'error', message: `An error occurred. Please try again later: ${errorData.message}`});
                 console.error('An error occurred. Please try again later.');
            }
        } catch (error) {
             showNotification({type: 'error', message: `An error occurred. Please try again later: ${error.message}`});
            console.error('Error:', error);
        }
    };
      async function sendEmails(formData) {
          const adminEmail = 'admin@reviewhub.net.et';
          const userEmail = formData.get('email');
          // Example email sending endpoint
        const emailEndpoint = `${config.apiBaseUrl}/send-email`;

        // Send email to admin
          try{
           await fetch(emailEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: adminEmail,
                    subject: 'New Account Registration',
                    body: `A new account has been created.\n\nUsername: ${formData.get('username')}\nEmail: ${formData.get('email')}\nSubscription Type: ${formData.get('subscriptionOption')}`,
                }),
           });
           // Send confirmation email to subscriber
           await fetch(emailEndpoint, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                      to: userEmail,
                      subject: 'Account Registration Confirmation',
                      body: `Thank you for creating an account, ${formData.get('username')}! Welcome to our platform.`,
                 }),
          });
        } catch (error) {
            showNotification({type: 'error', message: `An error occurred while sending emails: ${error.message}`});
          console.error('Error while sending emails:', error);
        }

     }

    return (
        <div className={styles.createAccountContainer}>
            <h1 style={{ textAlign: 'center', color: '#35424a' }}>Create Account</h1>
            <form id="registrationForm" onSubmit={handleSubmit}>
                <input
                    type="text"
                   id="username"
                   name="username"
                    placeholder="Username..."
                    required
                    value={formData.username || ''}
                   onChange={(e) => handleInputChange('username', e.target.value)}
                />
                <input
                   type="email"
                  id="email"
                   name="email"
                   placeholder="Email..."
                  required
                    value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                <input
                    type="password"
                  id="password"
                    name="password"
                  placeholder="Enter Password..."
                   required
                    value={formData.password || ''}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />

                <label htmlFor="subscriptionOption">Subscription Type:</label>
                <select
                    id="subscriptionOption"
                    name="subscriptionOption"
                    value={formData.subscriptionType || ''}
                    onChange={handleSubscriptionChange}
                  required
                >
                    <option value="" disabled selected>
                        Select Subscription Type
                    </option>
                    <option value="Individual">Individual</option>
                    <option value="Group">Group</option>
                    <option value="Organizational">Organizational</option>
                    <option value="Student">Student</option>
                </select>
              {showStudentFields && (
                    <div id="studentFields">
                        <input
                           type="text"
                           id="studentId"
                            name="studentId"
                           placeholder="Enter Student ID or Registration Number"
                             value={formData.studentId || ''}
                           onChange={(e) => handleInputChange('studentId', e.target.value)}
                       />
                        <label htmlFor="idCard">Upload Student ID Card:</label>
                        <input
                            type="file"
                           id="idCard"
                           name="idCard"
                            onChange={handleIdCardChange}
                       />
                  </div>
               )}
              <button type="submit" className={styles.button1} id="submitButton">
                    Submit
                </button>
            </form>
        </div>
    );
};

export default Registration;