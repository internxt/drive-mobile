import { expect } from 'detox';
import user from '../../fixtures/signUpUser.json';

describe('Sign up flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('Should sign up successfully', async () => {
    const firstNameInput = element(by.id('first-name-input'));
    const lastNameInput = element(by.id('last-name-input'));
    const emailInput = element(by.id('email-input'));
    const passwordInput = element(by.id('password-input'));
    const confirmPasswordInput = element(by.id('confirm-password-input'));
    const termsAndConditionsCheckbox = element(by.id('terms-and-conditions-checkbox'));
    const signUpButton = element(by.id('sign-up-button'));

    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(termsAndConditionsCheckbox).toBeVisible();

    await firstNameInput.typeText(user.firstName);
    await lastNameInput.typeText(user.lastName);
    await emailInput.typeText(user.email);
    await passwordInput.typeText(user.password);
    await confirmPasswordInput.typeText(user.password);
    await termsAndConditionsCheckbox.tap();

    await signUpButton.tap();
  });
});
