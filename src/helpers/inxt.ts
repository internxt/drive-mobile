function isUserActivated(email: string): Promise<Response> {
  // Set api call settings
  const headers = { 'Content-Type': 'application/json', email };

  // Do api call
  return fetch(`${process.env.REACT_NATIVE_BRIDGE_URL}/users/isactivated`, {
    method: 'GET',
    headers,
  });
}

export const inxt = {
  isUserActivated,
};
