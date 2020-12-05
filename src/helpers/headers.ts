
export function getHeaders(authToken?: string, mnemonic?: string) {

    const headers = new Headers()
    headers.append('content-type', 'application/json; charset=utf-8')
    headers.append('internxt-version', '1.0.0')
    headers.append('internxt-client', 'drive-mobile')

    if (authToken) {
        headers.append('Authorization', `Bearer ${authToken}`);
    }

    if (mnemonic) {
        headers.append('internxt-mnemonic', mnemonic);
    }

    return headers;
}

