import _ from 'lodash'

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

export function doRegister() {

}