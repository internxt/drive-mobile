import { render, RenderAPI } from '@testing-library/react-native';
import { MlKem768 } from 'mlkem';
import React from 'react';

describe('MlKem768 Component', () => {
  it('should render correctly', () => {
    const { getByTestId }: RenderAPI = render(<MlKem768 />);

    const component = getByTestId('mlkem768-component');
    expect(component).toBeTruthy();
  });

  it('should display the correct content', () => {
    // Renderiza el componente y verifica el contenido
    const { getByText }: RenderAPI = render(<MlKem768 />);

    const text = getByText('Expected Text');
    expect(text).toBeTruthy();
  });
});
