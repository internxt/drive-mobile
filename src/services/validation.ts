import _ from 'lodash';

class ValidationService {
  public validateEmail(email: string): boolean {
    const emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

    return emailPattern.test(email);
  }

  public validate2FA(code: string): boolean {
    return /^[0-9]{6}$/.test(code);
  }

  public isStrongPassword(pwd: string): boolean {
    return /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/.test(pwd);
  }

  public isNullOrEmpty(input: string): boolean {
    return _.isEmpty(input)
  }
}

export default new ValidationService();
