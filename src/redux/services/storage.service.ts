import { getHeaders } from "../../helpers/headers";

export const storageService = {
    loadAvailableProducts,
    loadAvailablePlans
};

const STRIPE_DEBUG = false;
const apiUrl = 'https://drive.internxt.com';

function loadAvailableProducts(userToken: string) {
    return new Promise((resolve, reject) => {
        fetch(`${apiUrl}/api/stripe/products${(STRIPE_DEBUG ? '?test=true' : '')}`, {
            headers: getHeaders(userToken)
        })
            .then(res => res.json())
            .then(resolve)
            .catch(reject);
    });
}

function loadAvailablePlans(userToken: string, productId: string) {
    const body = { product: productId };

    return new Promise((resolve, reject) => {
        fetch(`${apiUrl}/api/stripe/plans${(STRIPE_DEBUG ? '?test=true' : '')}`, {
            method: 'post',
            headers: getHeaders(userToken),
            body: JSON.stringify(body)
        })
            .then(res => res.json())
            .then(resolve)
            .catch(reject);
    });
}