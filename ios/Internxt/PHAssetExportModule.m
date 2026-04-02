#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PHAssetExport, NSObject)

RCT_EXTERN_METHOD(
  exportAsset:(NSString *)localIdentifier
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

@end
