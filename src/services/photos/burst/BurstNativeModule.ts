import { NativeModules, Platform } from 'react-native';

interface BurstMember {
  uri: string;
  size: number;
  fileName: string;
}

interface PHBurstExportNative {
  getBurstRepresentativeIds(localIds: string[]): Promise<string[]>;
  exportBurstMembers(representativeId: string): Promise<{ members: BurstMember[] }>;
  saveBurst(memberPaths: string[]): Promise<void>;
}

const nativeModule: PHBurstExportNative | null =
  Platform.OS === 'ios' ? (NativeModules.PHBurstExport as PHBurstExportNative) : null;

export const BurstNativeModule = {
  getBurstRepresentativeIds: async (localIds: string[]): Promise<string[]> => {
    if (!nativeModule || localIds.length === 0) {
      return [];
    }
    return nativeModule.getBurstRepresentativeIds(localIds);
  },

  exportBurstMembers: async (representativeId: string): Promise<BurstMember[]> => {
    if (!nativeModule) {
      return [];
    }
    const result = await nativeModule.exportBurstMembers(representativeId);
    return result.members;
  },

  saveBurst: async (memberPaths: string[]): Promise<void> => {
    if (!nativeModule || memberPaths.length === 0) {
      return;
    }
    return nativeModule.saveBurst(memberPaths);
  },
};

export type { BurstMember };
