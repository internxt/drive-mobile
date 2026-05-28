package com.internxt.cloud.documents.upload

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.CancellationSignal
import android.os.IBinder
import android.text.format.Formatter
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.internxt.cloud.R
import java.util.concurrent.ConcurrentHashMap

class UploadForegroundService : Service() {

    private val notificationManager: NotificationManager by lazy {
        getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        ensureChannel(this)
        cancelOrphanedNotifications()
    }

    /**
     * After process death, the static `uploads` map is empty but any in-flight foreground
     * notification posted by a previous incarnation survives. Cancel anything in our channel
     * that isn't backed by a live upload state so the tray doesn't show ghost progress bars.
     */
    private fun cancelOrphanedNotifications() {
        val live = uploads.values
            .flatMap { listOf(it.notificationId, it.errorNotificationId) }
            .toHashSet()
        notificationManager.activeNotifications
            .filter { it.notification.channelId == CHANNEL_ID && it.id !in live }
            .forEach { notificationManager.cancel(it.id) }
    }

    override fun onDestroy() {
        if (instance === this) instance = null
        isForeground = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        val token = intent?.getStringExtra(EXTRA_TOKEN)
        when (action) {
            ACTION_START -> {
                val state = token?.let { uploads[it] }
                if (state != null) {
                    intent.getStringExtra(EXTRA_DISPLAY_NAME)?.takeIf { it.isNotEmpty() }
                        ?.let { state.displayName = it }
                    postNotification(state, foregroundOnFirst = true)
                } else {
                    ensureForeground()
                    maybeStop()
                }
            }
            ACTION_CANCEL -> {
                token?.let { signals[it]?.cancel() }
                ensureForeground()
                maybeStop()
            }
            else -> {
                ensureForeground()
                maybeStop()
            }
        }
        return START_NOT_STICKY
    }

    private fun ensureForeground() {
        if (isForeground) return
        val state = uploads.values.firstOrNull() ?: UploadState("placeholder", "")
        postNotification(state, foregroundOnFirst = true)
    }

    private fun postNotification(state: UploadState, foregroundOnFirst: Boolean) {
        val notification = buildProgressNotification(state)
        if (foregroundOnFirst && !isForeground) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    state.notificationId,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                )
            } else {
                startForeground(state.notificationId, notification)
            }
            isForeground = true
        } else {
            notificationManager.notify(state.notificationId, notification)
        }
    }

    private fun postFailure(state: UploadState, message: String) {
        // Use a distinct id so stopForeground(STOP_FOREGROUND_REMOVE) doesn't tear this down.
        notificationManager.notify(state.errorNotificationId, buildErrorNotification(state, message))
    }

    private fun buildProgressNotification(state: UploadState): Notification {
        val cancelPi = PendingIntent.getBroadcast(
            this,
            state.notificationId,
            Intent(this, CancelUploadReceiver::class.java)
                .setAction(ACTION_CANCEL)
                .putExtra(EXTRA_TOKEN, state.token),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val title = when (state.phase) {
            Phase.ENCRYPTING -> getString(R.string.upload_notification_encrypting, state.displayName)
            Phase.UPLOADING -> getString(R.string.upload_notification_uploading, state.displayName)
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(formatProgressText(state))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .addAction(0, getString(R.string.upload_notification_cancel), cancelPi)

        if (state.phase == Phase.UPLOADING && state.total > 0) {
            val pct = ((state.bytes * 100L) / state.total).toInt().coerceIn(0, 100)
            builder.setProgress(100, pct, false)
        } else {
            builder.setProgress(0, 0, true)
        }
        return builder.build()
    }

    private fun buildErrorNotification(state: UploadState, message: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(getString(R.string.upload_notification_failed, state.displayName))
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setOngoing(false)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
    }

    private fun formatProgressText(state: UploadState): String = when {
        state.phase == Phase.UPLOADING && state.total > 0 ->
            "${Formatter.formatShortFileSize(this, state.bytes)} / " +
                Formatter.formatShortFileSize(this, state.total)
        state.bytes > 0 -> Formatter.formatShortFileSize(this, state.bytes)
        else -> ""
    }

    private fun maybeStop() {
        if (uploads.isEmpty()) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            isForeground = false
        }
    }

    enum class Phase { ENCRYPTING, UPLOADING }

    private class UploadState(val token: String, var displayName: String) {
        @Volatile var bytes: Long = 0L
        @Volatile var total: Long = 0L
        @Volatile var phase: Phase = Phase.ENCRYPTING
        val notificationId: Int = stableNotificationId(token)
        val errorNotificationId: Int = stableNotificationId("err:$token")
    }

    companion object {
        const val CHANNEL_ID = "internxt_uploads"

        const val ACTION_START = "com.internxt.cloud.documents.upload.START"
        const val ACTION_CANCEL = "com.internxt.cloud.documents.upload.CANCEL"
        const val EXTRA_TOKEN = "token"
        const val EXTRA_DISPLAY_NAME = "display_name"

        @Volatile private var instance: UploadForegroundService? = null
        @Volatile private var isForeground = false

        private val signals = ConcurrentHashMap<String, CancellationSignal>()
        private val uploads = ConcurrentHashMap<String, UploadState>()

        fun start(ctx: Context, token: String, displayName: String, signal: CancellationSignal) {
            signals[token] = signal
            uploads.getOrPut(token) { UploadState(token, displayName) }
            val intent = Intent(ctx, UploadForegroundService::class.java)
                .setAction(ACTION_START)
                .putExtra(EXTRA_TOKEN, token)
                .putExtra(EXTRA_DISPLAY_NAME, displayName)
            ContextCompat.startForegroundService(ctx, intent)
        }

        fun reportProgress(token: String, phase: Phase, bytes: Long, total: Long) {
            val state = uploads[token] ?: return
            state.phase = phase
            state.bytes = bytes
            state.total = total
            instance?.postNotification(state, foregroundOnFirst = false)
        }

        fun complete(token: String) {
            val state = uploads.remove(token) ?: run { signals.remove(token); return }
            signals.remove(token)
            instance?.notificationManager?.cancel(state.notificationId)
            instance?.maybeStop()
        }

        fun fail(token: String, message: String) {
            val state = uploads.remove(token) ?: run { signals.remove(token); return }
            signals.remove(token)
            instance?.postFailure(state, message)
            instance?.maybeStop()
        }

        private fun ensureChannel(ctx: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(CHANNEL_ID) != null) return
            val name = ctx.getString(R.string.upload_notification_channel_name)
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_LOW)
            )
        }

        private fun stableNotificationId(token: String): Int {
            val h = token.hashCode()
            return if (h == Int.MIN_VALUE) 1 else (h and Int.MAX_VALUE).coerceAtLeast(1)
        }
    }
}
