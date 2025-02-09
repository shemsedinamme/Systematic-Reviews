// SystemSettings.js
import React, { useState, useEffect } from 'react';
import styles from './SystemSettings.module.css';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
     email_notifications: false,
      default_settings: '',
       branding: '',
    });
  const token = localStorage.getItem('token');


  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('http://10.180.50.140:3306/admin/settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
            setSettings(data);
         } else {
            console.error('Failed to fetch system settings');
        }
       } catch (error) {
         console.error('Error fetching system settings:', error);
       }
    };
    fetchSettings();
  }, []);

  const handleSettingChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  };
    const handleSaveSettings = async () => {
       try {
         const response = await fetch('http://10.180.50.140:3306/admin/settings', {
            method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`,
             },
              body: JSON.stringify(settings),
         });
            if (response.ok) {
              alert('System settings updated successfully');
           } else {
               console.error('Failed to update system settings');
               alert('Failed to update system settings')
          }
      } catch (error) {
           console.error('Error updating system settings:', error);
            alert('An error occurred while updating system settings.')
       }
    };

  return (
    <div className={styles.settingsContainer}>
      <h1>System Configuration</h1>
      <div className={styles.settingItem}>
          <label>
          Email Notifications:
              <input
                  type="checkbox"
                   name="email_notifications"
                    checked={settings.email_notifications}
                 onChange={handleSettingChange}
             />
         </label>
       </div>
        <div className={styles.settingItem}>
            <label>Default Settings</label>
          <textarea
             name="default_settings"
               value={settings.default_settings}
           onChange={handleSettingChange}
                className={styles.settingsInput}
          />
       </div>
        <div className={styles.settingItem}>
            <label>Branding</label>
             <input
                 type="text"
                 name="branding"
                 value={settings.branding}
                 onChange={handleSettingChange}
                className={styles.settingsInput}
          />
       </div>
      <button onClick={handleSaveSettings} className={styles.saveButton}>Save Settings</button>
    </div>
  );
};

export default SystemSettings;