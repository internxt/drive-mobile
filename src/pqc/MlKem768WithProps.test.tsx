import { render, RenderAPI } from '@testing-library/react-native';
import { MlKem768 } from 'mlkem';
import React from 'react';

interface MlKem768Props {
  someProp?: string;
}

describe('MlKem768 Component with Props', () => {
  it('should render with a prop value', () => {
    const { getByText }: RenderAPI = render(<MlKem768 someProp="Hello" />);

    // Verifies that the text passed as a prop is displayed correctly
    const text = getByText('Hello');
    expect(text).toBeTruthy();
  });

  it('should render default content if no prop is provided', () => {
    const { getByText }: RenderAPI = render(<MlKem768 />);

    const text = getByText('Default Text'); // Replace with actual default text
    expect(text).toBeTruthy();
  });
});
