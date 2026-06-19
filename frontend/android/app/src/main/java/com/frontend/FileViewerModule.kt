package com.frontend

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File

class FileViewerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FileViewer"
    }

    @ReactMethod
    fun openFile(path: String, mimeType: String, promise: Promise) {
        try {
            val file = File(path)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist at path: $path")
                return
            }

            val uri = FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.provider",
                file
            )
            val intent = Intent(Intent.ACTION_VIEW)
            intent.setDataAndType(uri, mimeType)
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)

            val chooser = Intent.createChooser(intent, "Open PDF with...")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            val activity = getCurrentActivity()
            if (activity != null) {
                activity.startActivity(chooser)
                promise.resolve(true)
            } else {
                reactApplicationContext.startActivity(chooser)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("OPEN_FAILED", e.message, e)
        }
    }
}
