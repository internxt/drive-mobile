export function isValidEmail(email: string) {
    let re = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    return re.test(String(email).toLowerCase());
}

export function sendDeactivationsEmail(email: string) {
    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/reset/${email}`, {
    }).then(async res => {
        if (res.status != 200) {
            throw Error();
        }
    })
}