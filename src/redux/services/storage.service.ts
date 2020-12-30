import { getHeaders } from "../../helpers/headers";

export const storageService = {
    loadAvailableProducts,
    loadAvailablePlans
};

const STRIPE_DEBUG = false;
const apiUrl = 'https://drive.internxt.com';

function loadAvailableProducts(userToken: string): Promise<JSON> {
    return fetch(`${apiUrl}/api/stripe/products${(STRIPE_DEBUG ? '?test=true' : '')}`, {
        headers: getHeaders(userToken)
    }).then(res => res.json())
}

function loadAvailablePlans(userToken: string, productId: string): Promise<JSON> {
    const body = { product: productId };
    return fetch(`${apiUrl}/api/stripe/plans${(STRIPE_DEBUG ? '?test=true' : '')}`, {
        method: 'post',
        headers: getHeaders(userToken),
        body: JSON.stringify(body)
    })
        .then(res => res.json())
}