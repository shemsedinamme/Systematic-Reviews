import { useState } from 'react';

export const useForm = () => {
  const [formData, setFormData] = useState({});

  const handleInputChange = (fieldId, value) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      [fieldId]: value,
    }));
  };

  return {
      formData,
      setFormData,
    handleInputChange,
  };
};