import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import strings from '../../assets/lang/strings';
import { logger } from '../services/common';
import { SecurityCheckResult, SecurityRiskType, securityService } from '../services/security/security.service';

export const useSecurity = () => {
  const getRiskMessage = (riskType: SecurityRiskType): string => {
    switch (riskType) {
      case SecurityRiskType.ROOTED_DEVICE:
        return strings.security.risks.rootedDevice;
      case SecurityRiskType.HOOK_DETECTED:
        return strings.security.risks.hookDetected;
      case SecurityRiskType.MOCK_LOCATION:
        return strings.security.risks.mockLocation;
      case SecurityRiskType.DEBUG_MODE:
        return strings.security.risks.debugMode;
      case SecurityRiskType.EXTERNAL_STORAGE:
        return strings.security.risks.externalStorage;
      case SecurityRiskType.ADB_ENABLED:
        return strings.security.risks.adbEnabled;
      case SecurityRiskType.DEVELOPMENT_SETTINGS:
        return strings.security.risks.developmentSettings;
      default:
        return strings.security.risks.unknown;
    }
  };

  const getRecommendationMessage = (riskType: SecurityRiskType): string => {
    switch (riskType) {
      case SecurityRiskType.ROOTED_DEVICE:
        return strings.security.recommendations.useSecureDevice;
      case SecurityRiskType.HOOK_DETECTED:
        return strings.security.recommendations.closeDebuggingTools;
      case SecurityRiskType.MOCK_LOCATION:
        return strings.security.recommendations.disableMockLocation;
      case SecurityRiskType.ADB_ENABLED:
        return strings.security.recommendations.disableAdb;
      case SecurityRiskType.DEVELOPMENT_SETTINGS:
        return strings.security.recommendations.turnOffDeveloperOptions;
      default:
        return '';
    }
  };

  const showSecurityAlert = async (securityResult: SecurityCheckResult) => {
    const allRisks = securityResult.risks;

    if (allRisks.length > 0) {
      const riskMessages = allRisks.map((risk) => `• ${getRiskMessage(risk.type)}`).join('\n');

      const hasCriticalRisks = allRisks.some((risk) => risk.severity === 'critical');

      Alert.alert(
        strings.security.alerts.securityWarning.title,
        strings.formatString(strings.security.alerts.securityWarning.message, riskMessages) as string,
        [
          {
            text: strings.security.alerts.securityWarning.continue,
            style: hasCriticalRisks ? 'destructive' : 'default',
          },
          {
            text: strings.security.alerts.securityWarning.moreInfo,
            onPress: () => showDetailedSecurityInfo(securityResult),
          },
          {
            text: strings.security.alerts.dontDisplayAgain,
            onPress: async () => {
              await securityService.markSecurityAlertAsDismissed();
              logger.info('Security alert dismissed by user');
            },
            style: 'cancel',
          },
        ],
      );
    }
  };

  const showDetailedSecurityInfo = (securityResult: SecurityCheckResult) => {
    const recommendations = securityResult.risks
      .map((risk) => getRecommendationMessage(risk.type))
      .filter((rec) => rec.length > 0);
    const details = securityResult.details;

    let technicalInfo = `${strings.security.alerts.detailedInfo.technicalDetails}\n`;
    technicalInfo += `• ${strings.formatString(
      strings.security.alerts.detailedInfo.deviceRooted,
      details.isJailBroken ? strings.security.alerts.detailedInfo.yes : strings.security.alerts.detailedInfo.no,
    )}\n`;
    technicalInfo += `• ${strings.formatString(
      strings.security.alerts.detailedInfo.hookDetection,
      details.hookDetected ? strings.security.alerts.detailedInfo.yes : strings.security.alerts.detailedInfo.no,
    )}\n`;
    technicalInfo += `• ${strings.formatString(
      strings.security.alerts.detailedInfo.mockLocation,
      details.canMockLocation ? strings.security.alerts.detailedInfo.yes : strings.security.alerts.detailedInfo.no,
    )}\n`;
    technicalInfo += `• ${strings.formatString(
      strings.security.alerts.detailedInfo.debugMode,
      details.isDebugMode ? strings.security.alerts.detailedInfo.yes : strings.security.alerts.detailedInfo.no,
    )}\n`;

    if (Platform.OS === 'android') {
      technicalInfo += `• ${strings.formatString(
        strings.security.alerts.detailedInfo.adbEnabled,
        details.adbEnabled ? strings.security.alerts.detailedInfo.yes : strings.security.alerts.detailedInfo.no,
      )}\n`;
      technicalInfo += `• ${strings.formatString(
        strings.security.alerts.detailedInfo.externalStorage,
        details.isOnExternalStorage
          ? strings.security.alerts.detailedInfo.yes
          : strings.security.alerts.detailedInfo.no,
      )}\n`;

      technicalInfo += `• ${strings.formatString(
        strings.security.alerts.detailedInfo.developmentSettings,
        details.isDevelopmentSettingsEnabled
          ? strings.security.alerts.detailedInfo.yes
          : strings.security.alerts.detailedInfo.no,
      )}\n`;
    }

    if (Platform.OS === 'ios' && details.jailBrokenMessage) {
      technicalInfo += `• ${strings.formatString(
        strings.security.alerts.detailedInfo.jailbreakReason,
        details.jailBrokenMessage,
      )}\n`;
    }

    const recommendationsText =
      recommendations.length > 0
        ? `\n\n${strings.security.alerts.detailedInfo.recommendations}\n${recommendations
            .map((r) => `• ${r}`)
            .join('\n')}`
        : '';

    Alert.alert(strings.security.alerts.detailedInfo.title, `${technicalInfo}${recommendationsText}`, [
      { text: strings.security.alerts.detailedInfo.ok },
    ]);
  };

  const performPeriodicSecurityCheck = async () => {
    try {
      const result = await securityService.performPeriodicSecurityCheck();
      if (result && !result.isSecure) {
        await showSecurityAlert(result);
      }
      return result;
    } catch (error) {
      logger.error('Periodic security check failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        await performPeriodicSecurityCheck();
      } catch (error) {
        logger.error('Security initialization failed:', error);
      }
    };

    initializeSecurity();
  }, []);

  return {
    performPeriodicSecurityCheck,
  };
};
