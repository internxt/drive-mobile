import { expect } from 'detox';

describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('Should login successfully', async () => {
    const emailInput = element(by.id('email-input'));
    const passwordInput = element(by.id('password-input'));
    const loginButton = element(by.id('login-button'));

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await emailInput.typeText('carlossala95@gmail.com');
    await passwordInput.typeText('Znmfyf795');

    await loginButton.tap();
  });
});
