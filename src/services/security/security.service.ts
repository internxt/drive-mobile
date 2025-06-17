import JailMonkey from 'jail-monkey';
import { Platform } from 'react-native';

import asyncStorageService from '../AsyncStorageService';
import { logger } from '../common';

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
  maxFailedChecks: number;
}

class SecurityService {
  private static instance: SecurityService;
  private config: SecurityConfig;

  constructor() {
    this.config = {
      enableLogging: true,
      blockOnCriticalRisk: true,
      allowDebugMode: __DEV__,
      checkMinutesInterval: 30,
      maxFailedChecks: 3,
    };
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Perform comprehensive security check
   */
  public async performSecurityCheck(): Promise<SecurityCheckResult> {
    try {
      const details = await this.gatherSecurityDetails();
      const risks = this.analyzeSecurityRisks(details);
      const isSecure = this.determineSecurityStatus(risks);

      const result: SecurityCheckResult = {
        isSecure,
        risks,
        details,
      };

      await this.handleSecurityResult(result);

      await asyncStorageService.saveLastSecurityCheck(new Date());

      return result;
    } catch (error) {
      logger.error('Security check failed:', error);
      throw error;
    }
  }

  /**
   * Check if device is compromised (rooted/jailbroken)
   */
  public async isDeviceCompromised(): Promise<boolean> {
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
  public async canMockLocation(): Promise<boolean> {
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
  public async isHookingDetected(): Promise<boolean> {
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
  public async isInDebugMode(): Promise<boolean> {
    try {
      return await JailMonkey.isDebuggedMode();
    } catch (error) {
      logger.error('Failed to check debug mode:', error);
      return false;
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
   * Determine overall security status
   */
  private determineSecurityStatus(risks: SecurityRisk[]): boolean {
    const criticalRisks = risks.filter((risk) => risk.severity === 'critical');
    const highRisks = risks.filter((risk) => risk.severity === 'high');
    const mediumRisks = risks.filter((risk) => risk.severity === 'medium');
    const lowRisks = risks.filter((risk) => risk.severity === 'low');

    return criticalRisks.length > 0 || highRisks.length > 0 || mediumRisks.length > 0 || lowRisks.length > 0;
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

  /**
   * Check if periodic security check is needed
   */
  public async shouldPerformPeriodicCheck(): Promise<boolean> {
    try {
      const lastCheck = await asyncStorageService.getLastSecurityCheck();

      if (!lastCheck) {
        return true;
      }

      const timeSinceLastCheck = Date.now() - lastCheck.getTime();
      const intervalMs = this.config.checkMinutesInterval * 60 * 1000;

      return timeSinceLastCheck >= intervalMs;
    } catch (error) {
      logger.error('Failed to check last security check from storage:', error);
      return true;
    }
  }
}

export const securityService = SecurityService.getInstance();
