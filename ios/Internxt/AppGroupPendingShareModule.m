#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppGroupPendingShare, NSObject)
RCT_EXTERN_METHOD(readPendingShare:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)
RCT_EXTERN_METHOD(clearPendingShare:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)
@end
