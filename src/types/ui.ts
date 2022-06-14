export interface BaseModalProps {
  onClose: () => void;
  isOpen: boolean;
}

export interface BaseFormProps {
  renderActionsContainer: (context: {
    onSubmitButtonPressed: () => void;
    isLoading: boolean;
    isValid: boolean;
  }) => JSX.Element;
}

export interface ChangePasswordFormData {
  newPassword: string;
  confirmNewPassword: string;
}
