export const userService = {
  signin,
  signout
};

function signin() {
  return new Promise((resolve, reject) => {
    return resolve({
      user: {
        name: "Test User"
      }
    });
  });
}

function signout() {
  // signout
}
