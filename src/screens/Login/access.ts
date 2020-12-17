import { decryptText, encryptText, encryptTextWithKey, passToHash } from "../../helpers"
import { getHeaders } from "../../helpers/headers"
import { IsJsonString } from "../Register/registerUtils"

export async function apiLogin(email: string) {
  console.log('-------------- apiLogin EMAIL ------------------', email)
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email: email })
  }).then(async res => {
    console.log('----------- apiLogin FIRST THEN ------------')
    const data = await res.text()
    const json = IsJsonString(data)

    if (res.status === 200) {
      console.log('----------- apiLogin RES ------------', json)
      return json
    } else {
      if (json) {
        console.log('----------- ERROR ------------', json.error)
        throw Error(json.error)
      } else {
        throw Error(data)
      }
    }
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