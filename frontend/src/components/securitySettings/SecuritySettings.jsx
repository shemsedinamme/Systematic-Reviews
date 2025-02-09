// SecuritySettings.js
import React, { useState } from 'react';
import styles from './SecuritySettings.module.css';

const SecuritySettings = () => {
    const [twoFactorAuthEnabled, setTwoFactorAuthEnabled] = useState(false);
    const token = localStorage.getItem('token');

  const handleToggleTwoFactorAuth = async () => {
        //TODO Implement API call to enable 2FA
        setTwoFactorAuthEnabled(!twoFactorAuthEnabled);
        alert('Implement API call to toggle 2FA')
  };
  const handleManageSSO = () => {
        //TODO: implement SSO management
       alert('Implement SSO integration using SSO endpoints');
    }

  return (
    <div className={styles.securitySettingsContainer}>
      <h1>Security Settings</h1>
      <div className={styles.settingItem}>
        <label>
          Two-Factor Authentication (2FA):
          <button
              onClick={handleToggleTwoFactorAuth}
              className={twoFactorAuthEnabled ? styles.toggleOnButton: styles.toggleOffButton}
              >
            {twoFactorAuthEnabled ? 'On' : 'Off'}
          </button>
         </label>
      </div>
       <div className={styles.settingItem}>
            <button className={styles.ssoButton} onClick={handleManageSSO}>
              Manage Single Sign-On
            </button>
       </div>
    </div>
  );
};

export default SecuritySettings;