import mock from 'react-native-permissions/mock';

jest.mock('react-native-permissions', () => {
  return mock;
});
