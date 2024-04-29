import { fireEvent, render, RenderAPI } from '@testing-library/react-native';
import { MlKem768 } from 'mlkem';
import React from 'react';

describe('MlKem768 Interaction', () => {
  it('should call the onPress handler when the button is clicked', () => {
    const mockOnPress = jest.fn();
    const { getByTestId }: RenderAPI = render(<MlKem768 onPress={mockOnPress} />);

    // Assuming there is a button with a testID
    const button = getByTestId('mlkem768-button');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should update the state when an action is performed', () => {
    const { getByTestId, getByText }: RenderAPI = render(<MlKem768 />);

    // Assuming the component updates the text when interacted
    const button = getByTestId('mlkem768-button');
    fireEvent.press(button);

    const updatedText = getByText('Updated Text');
    expect(updatedText).toBeTruthy();
  });
});
