import { render } from '@testing-library/react-native';
import { MlKem768 } from 'mlkem';
import React from 'react';
import 'react-native';

it('should match the snapshot', () => {
  const { toJSON } = render(<MlKem768 />);
  expect(toJSON()).toMatchSnapshot();
});
