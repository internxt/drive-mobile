import * as LocalAuthentication from 'expo-local-authentication';
import { deviceStorage } from '../../helpers';

export async function checkDeviceForHardware(): Promise<Boolean>{
    return await LocalAuthentication.hasHardwareAsync();
}

export async function checkForBiometric(): Promise<Boolean>{
    return await LocalAuthentication.isEnrolledAsync()
}

export async function checkDeviceStorageBiometric(): Promise<Boolean>{
    return await deviceStorage.getItem('xBiometric') === 'true'
}
export async function checkDeviceStorageShowConf(): Promise<Boolean>{
    return await deviceStorage.getItem('xNotShowConfBiometric') === 'true'
}

export async function scanBiometrics(): Promise<LocalAuthentication.LocalAuthenticationResult>{
    return await LocalAuthentication.authenticateAsync()
}

