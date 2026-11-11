package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest

object AppContainerFileBroker {
    private const val MAX_TEXT_BYTES = 65_536
    private fun resolve(context: Context, value: String): File {
        require(value.isNotBlank() && value.length <= 240) { "FILE_PATH_INVALID" }
        val normalized = value.replace('\\', '/')
        require(!normalized.startsWith('/') && normalized.split('/').none { it.isBlank() || it == "." || it == ".." }) { "FILE_PATH_INVALID" }
        require(normalized.matches(Regex("^[A-Za-z0-9._/-]+$"))) { "FILE_PATH_INVALID" }
        val root = File(context.filesDir, "bridge-files").apply { mkdirs() }.canonicalFile
        val target = File(root, normalized).canonicalFile
        require(target.path.startsWith(root.path + File.separator)) { "FILE_PATH_OUTSIDE_APP_CONTAINER" }
        return target
    }
    private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    fun write(context: Context, path: String, text: String): JSONObject {
        val bytes = text.toByteArray(Charsets.UTF_8)
        require(bytes.size <= MAX_TEXT_BYTES) { "FILE_PAYLOAD_TOO_LARGE" }
        val target = resolve(context, path); target.parentFile?.mkdirs()
        val temporary = File(target.parentFile, ".${target.name}.tmp-${System.nanoTime()}")
        try {
            temporary.outputStream().use { stream -> stream.write(bytes); stream.fd.sync() }
            require(temporary.renameTo(target)) { "FILE_ATOMIC_RENAME_FAILED" }
        } finally { temporary.delete() }
        val observed = target.readBytes(); require(observed.contentEquals(bytes)) { "FILE_READBACK_MISMATCH" }
        return JSONObject().apply { put("ok", true); put("path", path); put("bytes", observed.size); put("sha256", sha256(observed)); put("storageBoundary", "APP_PRIVATE_BRIDGE_FILES") }
    }
    fun read(context: Context, path: String): JSONObject {
        val target = resolve(context, path); require(target.isFile) { "FILE_NOT_FOUND" }
        val bytes = target.readBytes(); require(bytes.size <= MAX_TEXT_BYTES) { "FILE_PAYLOAD_TOO_LARGE" }
        return JSONObject().apply { put("ok", true); put("path", path); put("text", bytes.toString(Charsets.UTF_8)); put("bytes", bytes.size); put("sha256", sha256(bytes)); put("storageBoundary", "APP_PRIVATE_BRIDGE_FILES") }
    }
}
