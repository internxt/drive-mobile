import { decryptText, encryptText, encryptTextWithKey, passToHash } from "../../helpers"
import { getHeaders } from "../../helpers/headers"
import { IsJsonString } from "../Register/registerUtils"

export function doAccess() {

}

export async function apiLogin(email: string) {
  console.log('GET /login')
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/login`, {
    method: 'POST',
    headers: getHeaders(false, false),
    body: JSON.stringify({ email: email })
  }).then(async res => {
    const data = await res.text()
    const json = IsJsonString(data)

    if (res.status === 200) {
      return json
    } else {
      if (json) {
        throw Error(json.error)
      } else {
        throw Error(data)
      }
    }
  })
}

export async function apiAccess(email: string, password: string, twoFactor: string, secretKey: string): Promise<any> {
  console.log('POST /access', secretKey)
  const hashObj = passToHash({ password: password, salt: decryptText(secretKey) })
  const encPassword = encryptText(hashObj.hash)
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/access`, {
    method: 'post',
    headers: getHeaders(false, false),
    body: JSON.stringify({
      email: email,
      password: encPassword,
      tfa: twoFactor
    })
  }).then(async res => {
    const data = await res.text()
    const json = IsJsonString(data)
    if (res.status === 200) {
      return json
    } else {
      console.log(json)
      throw Error(json && json.error ? json.error : data)
    }
  })
}

export async function doLogin(username: string, password: string, twofactor: string, secretKey: string) {
  if (twofactor) {
    return apiAccess(username, password, twofactor, secretKey);
  }

  return apiLogin(username).then(res => res).catch(err => {
    console.log(err)
  })
}

export function validateEmail(email: string): boolean {
  let emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  return emailPattern.test(email);
}

export function validate2FA(code: string): boolean {
  return /^[0-9]{6}$/.test(code);
}

export function checkPasswordStrength(password: string): boolean {
  return password.length >= 5;
}