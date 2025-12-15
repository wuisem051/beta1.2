import styled from 'styled-components';

export const SolidSectionStyled = styled.section`
  background-color: var(--light-card);
  border: 1px solid var(--gray-border);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1.5rem;

  &.dark {
    background-color: var(--dark-card);
    border-color: var(--dark-border);
  }
`;

export const CardStyled = styled.div`
  background-color: var(--light-card);
  border: 1px solid var(--gray-border);
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);

  &.dark {
    background-color: var(--dark-card);
    border-color: var(--dark-border);
  }
`;

export const InputStyled = styled.input`
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gray-border);
  background-color: var(--light-bg);
  color: var(--dark-text);
  outline: none;

  &:focus {
    border-color: var(--blue-link);
  }

  &.dark {
    background-color: var(--dark-bg);
    border-color: var(--dark-border);
    color: var(--light-text);
  }
`;

export const SelectStyled = styled.select`
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gray-border);
  background-color: var(--light-bg);
  color: var(--dark-text);
  outline: none;

  &:focus {
    border-color: var(--blue-link);
  }

  &.dark {
    background-color: var(--dark-bg);
    border-color: var(--dark-border);
    color: var(--light-text);
  }
`;

export const TextareaStyled = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gray-border);
  background-color: var(--light-bg);
  color: var(--dark-text);
  outline: none;

  &:focus {
    border-color: var(--blue-link);
  }

  &.dark {
    background-color: var(--dark-bg);
    border-color: var(--dark-border);
    color: var(--light-text);
  }
`;
