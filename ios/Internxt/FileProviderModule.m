#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(InternxtSignalingModule, NSObject)
RCT_EXTERN_METHOD(notifyParentChanged:(NSString *)parentFolderUuid
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)
@end
