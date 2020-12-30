import { getHeaders } from "../../helpers/headers";

export const storageService = {
    loadAvailableProducts,
    loadAvailablePlans
};

function loadAvailableProducts(userToken: string): Promise<JSON> {
    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/products${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
        headers: getHeaders(userToken)
    }).then(res => res.json())
}

function loadAvailablePlans(userToken: string, productId: string): Promise<JSON> {
    const body = {
        product: productId,
        test: process.env.NODE_ENV === 'development'
    };

    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/plans${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
        method: 'post',
        headers: getHeaders(userToken),
        body: JSON.stringify(body)
    })
        .then(res => {
            return res.json()
        }).then(res => {
            return res
        }).catch(() => [])
}