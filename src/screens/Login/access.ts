export function doAccess() {

}

export async function doLogin(username: string, password: string, twofactor: string) {
  fetch(process.env.REACT_NATIVE_API_URL)
  return
}

export function validateEmail(email: string) {
  let emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  return emailPattern.test(email);
}

export function validate2FA(code: string) {
  return /^[0-9]{6}$/.test(code);
}

export function checkPasswordStrength(password: string) {
  return password.length >= 5;
}