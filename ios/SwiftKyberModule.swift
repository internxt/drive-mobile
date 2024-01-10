//
//  SwiftKyberModule.swift
//  Internxt
//

import Foundation
import React
import SwiftKyber

@objc(SwiftKyberModule)
class SwiftKyberModule: NSObject {
    @objc
    func performOperation(_ data: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {

        do {
            let result = try Kyber.performOperation(input: data)
            resolver(result)
        } catch {
            rejecter("ERROR", "Error usando SwiftKyber", error)
        }
    }
}
