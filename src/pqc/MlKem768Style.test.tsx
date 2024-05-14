import { render, RenderAPI } from '@testing-library/react-native';
import { MlKem768 } from 'mlkem';
import React from 'react';

describe('MlKem768 Styling', () => {
  it('should have correct styles', () => {
    const { getByTestId }: RenderAPI = render(<MlKem768 />);

    const component = getByTestId('mlkem768-component');
    const style = component.props.style;

    // Verifies if the style matches the expected style
    expect(style).toMatchObject({
      backgroundColor: 'blue', // Adjust according to actual style
    });
  });
});
