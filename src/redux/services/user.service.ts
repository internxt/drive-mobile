import { decryptText, decryptTextWithKey, deviceStorage, encryptText, passToHash } from "../../helpers";

export const userService = {
    signin,
    signout,
    payment
};

function signin(email: string, password: string, sKey: string, twoFactorCode: string) {
    return new Promise((resolve, reject) => {
        const salt = decryptText(sKey);
        const hashObj = passToHash({ password, salt });
        const encPass = encryptText(hashObj.hash);

        fetch(`${process.env.REACT_NATIVE_API_URL}/api/access`, {
            method: 'POST',
            headers: { 'content-type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                email,
                password: encPass,
                tfa: twoFactorCode
            })
        }).then(async response => {
            return { response, data: await response.json() };
        }).then(async response => {
            const body = response.data;

            if (response.response.status === 200) {
                // Manage successfull login
                const user = body.user;
                user.mnemonic = user.mnemonic ? decryptTextWithKey(user.mnemonic, password) : null

                // Store login data
                await deviceStorage.saveItem('xToken', body.token);
                await deviceStorage.saveItem('xUser', JSON.stringify(user));

                resolve({ token: body.token, user });
            } else {
                throw body.error ? body.error : 'Unkown error';
            }
        }).catch(err => {
            reject(err);
        });
    });
}

async function signout() {
    try {
        // Delete login data
        await Promise.all([
            deviceStorage.deleteItem('xToken'),
            deviceStorage.deleteItem('xUser')
        ]);
    } catch (error) {
        console.log('signout', error);
    }
}

function payment(token: string, stripePlan: string) {
    return new Promise((resolve, reject) => {
        fetch(`${process.env.REACT_APP_API_URL}/api/buy`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                token: JSON.stringify(token),
                plan: stripePlan
            })
        }).then(async response => {
            const body = await response.json();
            resolve(body.message);
        }).catch(error => {
            reject(error);
        });
    });
}
