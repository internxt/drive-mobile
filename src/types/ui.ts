export interface BaseModalProps {
  onClose: () => void;
  isOpen: boolean;
}

export interface BaseFormProps {
  onFormLoadingChange?: (isLoading: boolean) => void;
  onFormSubmitSuccess?: () => void;
  renderActionsContainer: (context: {
    onSubmitButtonPressed: () => void;
    isLoading: boolean;
    isValid: boolean;
    isDirty: boolean;
  }) => JSX.Element;
}

export interface ChangePasswordFormData {
  newPassword: string;
  confirmNewPassword: string;
}

export interface EditNameFormData {
  name: string;
  lastName: string;
}
