package com.internxt.cloud.documents.upload

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class CancelUploadReceiver : BroadcastReceiver() {

    override fun onReceive(ctx: Context, intent: Intent) {
        val token = intent.getStringExtra(UploadForegroundService.EXTRA_TOKEN) ?: return
        val forward = Intent(ctx, UploadForegroundService::class.java)
            .setAction(UploadForegroundService.ACTION_CANCEL)
            .putExtra(UploadForegroundService.EXTRA_TOKEN, token)
        ContextCompat.startForegroundService(ctx, forward)
    }
}
