#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PHBurstExport, NSObject)

RCT_EXTERN_METHOD(
  getBurstRepresentativeIds:(NSArray<NSString *> *)localIds
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

RCT_EXTERN_METHOD(
  exportBurstMembers:(NSString *)representativeId
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

RCT_EXTERN_METHOD(
  saveBurst:(NSArray<NSString *> *)memberPaths
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

@end
