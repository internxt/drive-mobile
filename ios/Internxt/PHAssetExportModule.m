#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PHAssetExport, NSObject)

RCT_EXTERN_METHOD(
  exportAsset:(NSString *)localIdentifier
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

RCT_EXTERN_METHOD(
  exportLivePhotoComponents:(NSString *)localIdentifier
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

RCT_EXTERN_METHOD(
  saveLivePhoto:(NSString *)photoPath
  videoPath:(NSString *)videoPath
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

@end
