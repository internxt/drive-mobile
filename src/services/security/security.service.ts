import JailMonkey from 'jail-monkey';
import { Platform } from 'react-native';

import { AsyncStorageKey } from '../../types';
import asyncStorageService from '../AsyncStorageService';
import { logger } from '../common';

const DAY_IN_MINUTES = 1440; // 24 hours * 60 minutes

export interface SecurityCheckResult {
  isSecure: boolean;
  risks: SecurityRisk[];
  details: SecurityDetails;
}

export interface SecurityRisk {
  type: SecurityRiskType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export enum SecurityRiskType {
  ROOTED_DEVICE = 'rooted_device',
  MOCK_LOCATION = 'mock_location',
  HOOK_DETECTED = 'hook_detected',
  DEBUG_MODE = 'debug_mode',
  EXTERNAL_STORAGE = 'external_storage',
  ADB_ENABLED = 'adb_enabled',
  DEVELOPMENT_SETTINGS = 'development_settings',
}

export interface SecurityDetails {
  isJailBroken: boolean;
  canMockLocation: boolean;
  hookDetected: boolean;
  isDebugMode: boolean;
  isOnExternalStorage: boolean;
  adbEnabled: boolean;
  isDevelopmentSettingsEnabled: boolean;
  jailBrokenMessage?: string; // iOS only
}

export interface SecurityConfig {
  enableLogging: boolean;
  blockOnCriticalRisk: boolean;
  allowDebugMode: boolean;
  checkMinutesInterval: number;
}

class SecurityService {
  private static instance: SecurityService;
  private readonly config: SecurityConfig;

  constructor() {
    this.config = {
      enableLogging: true,
      blockOnCriticalRisk: true,
      allowDebugMode: __DEV__,
      checkMinutesInterval: DAY_IN_MINUTES,
    };
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Perform security check for periodic checks
   */
  public async performPeriodicSecurityCheck(): Promise<SecurityCheckResult | null> {
    const securityCheckResult = await this.performSecurityCheckWithoutSaving();

    const shouldShowAlert = await this.shouldShowAlert(securityCheckResult);

    if (shouldShowAlert) {
      await asyncStorageService.saveLastSecurityCheck(new Date());
      const currentHash = this.generateSecurityHash(securityCheckResult);
      await asyncStorageService.saveItem(AsyncStorageKey.LastSecurityHash, currentHash);

      return securityCheckResult;
    }

    return null;
  }

  /**
   * Perform security check without saving anything to storage
   */
  private async performSecurityCheckWithoutSaving(): Promise<SecurityCheckResult> {
    try {
      const details = await this.gatherSecurityDetails();
      const risks = this.analyzeSecurityRisks(details);

      const result: SecurityCheckResult = {
        isSecure: risks.length === 0,
        risks,
        details,
      };

      await this.handleSecurityResult(result);
      return result;
    } catch (error) {
      logger.error('Security check failed:', error);
      throw error;
    }
  }

  /**
   * Decide if security alert should be shown
   */
  private async shouldShowAlert(securityResult: SecurityCheckResult): Promise<boolean> {
    try {
      const existsLastCheck = await asyncStorageService.getLastSecurityCheck();

      if (!existsLastCheck) {
        logger.info('First security check, showing alert');
        return true;
      }

      const currentHash = this.generateSecurityHash(securityResult);
      const lastHash = await asyncStorageService.getItem(AsyncStorageKey.LastSecurityHash);

      if (lastHash !== currentHash) {
        logger.info(`Security configuration changed (${lastHash} → ${currentHash}), showing alert`);
        return true;
      }

      const timeSinceLastCheck = Date.now() - existsLastCheck.getTime();
      const intervalMs = this.config.checkMinutesInterval * 60 * 1000;
      const isTimeIntervalPassed = timeSinceLastCheck >= intervalMs;

      if (isTimeIntervalPassed) {
        const wasDismissed = await this.isSecurityAlertDismissed();
        return !wasDismissed;
      }

      return false;
    } catch (error) {
      logger.error('Failed to determine if alert should be shown:', error);
      return true;
    }
  }

  /**
   * Generate hash for security result to track dismissed alerts
   */
  public generateSecurityHash(securityResult: SecurityCheckResult): string {
    try {
      const risksString = securityResult.risks
        .map((risk) => `${risk.type}-${risk.severity}`)
        .sort((a, b) => a.localeCompare(b))
        .join('|');
      return btoa(risksString);
    } catch (error) {
      logger.error('Error generating security hash:', error);
      return Date.now().toString();
    }
  }

  /**
   * Check if security alert was dismissed for this configuration
   */
  public async isSecurityAlertDismissed(): Promise<boolean> {
    try {
      return !!(await asyncStorageService.getItem(AsyncStorageKey.SecurityAlertDismissed));
    } catch (error) {
      logger.error('Error checking dismissed security alert:', error);
      return false;
    }
  }

  /**
   * Mark security alert as dismissed for this configuration
   */
  public async markSecurityAlertAsDismissed(): Promise<void> {
    try {
      await asyncStorageService.saveItem(AsyncStorageKey.SecurityAlertDismissed, 'true');
    } catch (error) {
      logger.error('Error saving dismissed security alert:', error);
    }
  }

  /**
   * Check if device is compromised (rooted/jailbroken)
   */
  public isDeviceCompromised(): boolean {
    try {
      return JailMonkey.isJailBroken();
    } catch (error) {
      logger.error('Failed to check device compromise status:', error);
      return false;
    }
  }

  /**
   * Check if location can be mocked
   */
  public canMockLocation(): boolean {
    try {
      return JailMonkey.canMockLocation();
    } catch (error) {
      logger.error('Failed to check mock location capability:', error);
      return false;
    }
  }

  /**
   * Check for suspicious hooking frameworks
   */
  public isHookingDetected(): boolean {
    try {
      return JailMonkey.hookDetected();
    } catch (error) {
      logger.error('Failed to check hooking detection:', error);
      return false;
    }
  }

  /**
   * Check if app is in debug mode
   */
  public isInDebugMode(): Promise<boolean> {
    try {
      return JailMonkey.isDebuggedMode();
    } catch (error) {
      logger.error('Failed to check debug mode:', error);
      return Promise.resolve(false);
    }
  }

  /**
   * Get detailed security information
   */
  private async gatherSecurityDetails(): Promise<SecurityDetails> {
    const [
      isJailBroken,
      canMockLocation,
      hookDetected,
      isDebugMode,
      isOnExternalStorage,
      adbEnabled,
      isDevelopmentSettingsEnabled,
    ] = await Promise.all([
      this.isDeviceCompromised(),
      this.canMockLocation(),
      this.isHookingDetected(),
      this.isInDebugMode(),
      Platform.OS === 'android' ? JailMonkey.isOnExternalStorage() : Promise.resolve(false),
      Platform.OS === 'android' ? JailMonkey.AdbEnabled() : Promise.resolve(false),
      Platform.OS === 'android' ? JailMonkey.isDevelopmentSettingsMode() : Promise.resolve(false),
    ]);

    const details: SecurityDetails = {
      isJailBroken,
      canMockLocation,
      hookDetected,
      isDebugMode,
      isOnExternalStorage,
      adbEnabled,
      isDevelopmentSettingsEnabled,
    };

    return details;
  }

  /**
   * Analyze security risks based on gathered details
   */
  private analyzeSecurityRisks(details: SecurityDetails): SecurityRisk[] {
    const risks: SecurityRisk[] = [];
    const timestamp = Date.now();

    if (details.isJailBroken) {
      risks.push({
        type: SecurityRiskType.ROOTED_DEVICE,
        severity: 'critical',
        timestamp,
      });
    }

    if (details.hookDetected) {
      risks.push({
        type: SecurityRiskType.HOOK_DETECTED,
        severity: 'critical',
        timestamp,
      });
    }

    if (details.canMockLocation) {
      risks.push({
        type: SecurityRiskType.MOCK_LOCATION,
        severity: 'high',
        timestamp,
      });
    }

    if (details.isDebugMode && !this.config.allowDebugMode) {
      risks.push({
        type: SecurityRiskType.DEBUG_MODE,
        severity: 'medium',
        timestamp,
      });
    }

    if (details.isOnExternalStorage) {
      risks.push({
        type: SecurityRiskType.EXTERNAL_STORAGE,
        severity: 'medium',
        timestamp,
      });
    }

    if (details.adbEnabled) {
      risks.push({
        type: SecurityRiskType.ADB_ENABLED,
        severity: 'high',
        timestamp,
      });
    }

    if (details.isDevelopmentSettingsEnabled) {
      risks.push({
        type: SecurityRiskType.DEVELOPMENT_SETTINGS,
        severity: 'medium',
        timestamp,
      });
    }

    return risks;
  }

  /**
   * Handle security check results
   */
  private async handleSecurityResult(result: SecurityCheckResult): Promise<void> {
    if (this.config.enableLogging) {
      if (result.isSecure) {
        logger.info('Security check passed');
      } else {
        logger.warn('Security check failed:', result.risks);
      }
    }
  }
}

export const securityService = SecurityService.getInstance();
