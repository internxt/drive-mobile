jest.mock('react-native-image-resizer', () => {
  return {
    default: {
      createResizedImage: jest.fn(),
    },
    createResizedImage: jest.fn(),
  };
});
