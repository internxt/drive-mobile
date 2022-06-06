import { expect } from 'detox';
import user from '../../fixtures/user.json';

describe('Sign in flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('Should login successfully', async () => {
    const emailInput = element(by.id('email-input'));
    const passwordInput = element(by.id('password-input'));
    const signInButton = element(by.id('sign-in-button'));

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await emailInput.typeText(user.email);
    await passwordInput.typeText(user.password);

    await signInButton.tap();
  });
});
