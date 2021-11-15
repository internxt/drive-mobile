class ValidationService {
  public validateEmail(email: string): boolean {
    const emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

    return emailPattern.test(email);
  }

  public validate2FA(code: string): boolean {
    return /^[0-9]{6}$/.test(code);
  }
}

export default new ValidationService();
