import { useState } from 'react';

const useFormValidation = (initialState, validate) => {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues({
      ...values,
      [name]: value,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setSubmitting(true);
  };

  return {
    handleChange,
    handleSubmit,
    values,
    errors,
    isSubmitting,
    setValues, // Permitir actualizar los valores desde fuera si es necesario
    setErrors, // Permitir limpiar errores desde fuera si es necesario
    setSubmitting, // Permitir controlar el estado de envío desde fuera
  };
};

export default useFormValidation;
