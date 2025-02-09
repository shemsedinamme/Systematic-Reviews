// frontend/src/config.js
const config = {
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3306', //Default url if not defined
    // Other frontend configurations can be added here
  };
  
  export default config;