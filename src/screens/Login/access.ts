export function access() {

}

export function login() {
  
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