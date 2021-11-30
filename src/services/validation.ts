import _ from 'lodash';
import { auth } from '@internxt/lib';

class ValidationService {
  public validateEmail(email: string): boolean {
    return auth.isValidEmail(email);
  }

  public validate2FA(code: string): boolean {
    return /^[0-9]{6}$/.test(code);
  }

  public isStrongPassword(pwd: string): boolean {
    return /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/.test(pwd);
  }

  public isNullOrEmpty(input: string): boolean {
    return _.isEmpty(input);
  }
}

export default new ValidationService();
