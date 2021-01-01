import * as LocalAuthentication from 'expo-local-authentication';
import { deviceStorage } from '../../helpers';

export async function checkDeviceForHardware(): Promise<boolean>{
  return await LocalAuthentication.hasHardwareAsync();
}

export async function checkForBiometric(): Promise<boolean>{
  return await LocalAuthentication.isEnrolledAsync()
}

export async function checkDeviceStorageBiometric(): Promise<boolean>{
  return await deviceStorage.getItem('xBiometric') === 'true'
}
export async function checkDeviceStorageShowConf(): Promise<boolean>{
  return await deviceStorage.getItem('xNotShowConfBiometric') === 'true'
}

export async function scanBiometrics(): Promise<LocalAuthentication.LocalAuthenticationResult>{
  return await LocalAuthentication.authenticateAsync()
}
