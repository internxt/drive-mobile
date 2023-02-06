import { BiometricAccessType } from '@internxt-mobile/types/app';
import * as LocalAuth from 'expo-local-authentication';
import { Platform } from 'react-native';

export class BiometricsService {
  /**
   * Checks if the device has biometric hardware
   *
   * @returns If the device has biometric hardware such faceId or fingerprint
   */
  deviceHasBiometricHardware() {
    return LocalAuth.hasHardwareAsync();
  }

  /**
   * Checks if the device has a faceId or fingerprint configured
   *
   * @returns A boolean indicating if the device has faceId or fingerprint configured
   */
  deviceHasBiometricHardwareConfigured() {
    return LocalAuth.isEnrolledAsync();
  }

  /**
   * Determines if the biometric access can be used based on:
   *
   * - If the device has biometric hardware
   * - If the device has biometric hardware configured
   * - If the enrolled level is different than NONE
   * @returns A boolean indicating if the biometric access can be used
   */
  async canUseBiometricAccess() {
    try {
      const enrolledLevel = await LocalAuth.getEnrolledLevelAsync();

      if (enrolledLevel === LocalAuth.SecurityLevel.NONE) return false;

      if (enrolledLevel === LocalAuth.SecurityLevel.SECRET) return true;
      const biometricAccessIsConfigured = await this.deviceHasBiometricHardwareConfigured();

      if (!biometricAccessIsConfigured) return false;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Prompts the user a native biometric access,
   * returns false if the authentication fails
   */
  async authenticate() {
    const authenticationResult = await LocalAuth.authenticateAsync();

    return authenticationResult.success;
  }

  async getBiometricAccessType() {
    const enrolledLevel = await LocalAuth.getEnrolledLevelAsync();
    const supported = await LocalAuth.supportedAuthenticationTypesAsync();
    if (enrolledLevel === LocalAuth.SecurityLevel.NONE) return null;
    if (enrolledLevel === LocalAuth.SecurityLevel.SECRET) return BiometricAccessType.Pin;
    if (enrolledLevel === LocalAuth.SecurityLevel.BIOMETRIC) {
      if (Platform.OS === 'android') return BiometricAccessType.FingerPrint;
      if (Platform.OS === 'ios') {
        const hasFaceId = supported.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION);
        const hasTouchId = supported.includes(LocalAuth.AuthenticationType.FINGERPRINT);
        if (hasFaceId) return BiometricAccessType.FaceId;
        if (hasTouchId) return BiometricAccessType.TouchId;

        return null;
      }

      return null;
    }

    return null;
  }
}

export const biometrics = new BiometricsService();
