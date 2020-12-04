import _ from 'lodash'
import { passToHash } from '../../helpers';

export function isStrongPassword(pwd: string) {
    return /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/.test(pwd);
}

export function isNullOrEmpty(input: any) {
    return _.isEmpty(input)
}

export function registerService() {
    
}

interface RegisterParams {
    firstName: string
    lastName: string
    email: string
    password: string
}

export async function doRegister(params: RegisterParams) {
    const pwd = passToHash({ password: params.password })
    console.log(pwd)
}