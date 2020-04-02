function headers(withAuth, withMnemonic) {
  const headers = {
    'content-type': 'application/json; charset=utf-8'
  };

  if (withAuth) {
    headers['Authorization'] = `Bearer ${withAuth}`;
  }

  if (withMnemonic) {
    headers['internxt-mnemonic'] = withMnemonic;
  }

  return headers;
}

export const getHeaders = headers;
