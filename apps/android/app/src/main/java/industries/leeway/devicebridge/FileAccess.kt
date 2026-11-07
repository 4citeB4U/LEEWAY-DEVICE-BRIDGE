/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.ANDROID.SAF
TAG: LEEWAY.OWNER_SCOPED_REMOTE_FILE_OPERATIONS_V1
WHO: LeeWay Industries; WHAT: Android Storage Access Framework file adapter.
WHEN: 2026-10-24; WHERE: apps/android/.../FileAccess.kt.
WHY: Bind remote file work to the exact document tree selected by the device owner.
HOW: Persisted SAF grants, bounded operations, digest checks and recoverable edits.
AUTHORITY: Adapter only; Bridge admission and owner controls remain mandatory.
LICENSE: MIT
*/
package industries.leeway.devicebridge

import android.app.Activity
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.database.Cursor
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

object FileAccess {
    const val REQUEST_OPEN_TREE = 4101
    private const val PREFS = "leeway_device_bridge"
    private const val TREE_KEY = "authorized_tree_uri"
    private const val APPEND_JOURNAL_KEY = "saf_append_journal_v1"
    private const val EDIT_JOURNAL_KEY = "saf_edit_journal_v1"
    private const val MOVE_JOURNAL_KEY = "saf_move_journal_v1"
    private const val MAX_FILE_BYTES = 128L * 1024 * 1024
    private const val MAX_CHUNK_BYTES = 256 * 1024
    private const val MAX_TEXT_BYTES = 65_536
    private const val MAX_DIRECTORY_ENTRIES = 50_000
    private val editLock = Any()

    fun requestDirectory(activity: Activity) {
        val intent=Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
        }
        activity.startActivityForResult(intent, REQUEST_OPEN_TREE)
    }

    fun persistDirectory(activity: Activity, data: Intent?): Uri? {
        val uri=data?.data ?: return null
        val flags=(data.flags and
            (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION))
        if (flags and Intent.FLAG_GRANT_READ_URI_PERMISSION == 0) {
            throw SecurityException("FILE_READ_PERMISSION_REQUIRED")
        }
        val existing = activity.contentResolver.persistedUriPermissions.firstOrNull { it.uri == uri }
        val existingFlags = (if (existing?.isReadPermission == true) Intent.FLAG_GRANT_READ_URI_PERMISSION else 0) or
            (if (existing?.isWritePermission == true) Intent.FLAG_GRANT_WRITE_URI_PERMISSION else 0)
        activity.contentResolver.takePersistableUriPermission(uri, flags)
        val preferences = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
        val previous = preferences.getString(TREE_KEY, null)?.let { Uri.parse(it) }
        val saved = preferences
            .edit().putString(TREE_KEY, uri.toString())
            .putBoolean("perm_files_read", true)
            .putBoolean("perm_files_write", flags and Intent.FLAG_GRANT_WRITE_URI_PERMISSION != 0)
            .commit()
        if (!saved) {
            val newlyGrantedFlags = flags and existingFlags.inv()
            if (newlyGrantedFlags != 0) {
                runCatching { activity.contentResolver.releasePersistableUriPermission(uri, newlyGrantedFlags) }
            }
            throw IllegalStateException("FILE_SCOPE_NOT_PERSISTED")
        }
        val staleFlags = existingFlags and flags.inv()
        if (staleFlags != 0) {
            runCatching { activity.contentResolver.releasePersistableUriPermission(uri, staleFlags) }
        }
        if (previous != null && previous != uri) {
            val oldGrant = activity.contentResolver.persistedUriPermissions.firstOrNull { it.uri == previous }
            if (oldGrant != null) {
                val oldFlags = (if (oldGrant.isReadPermission) Intent.FLAG_GRANT_READ_URI_PERMISSION else 0) or
                    (if (oldGrant.isWritePermission) Intent.FLAG_GRANT_WRITE_URI_PERMISSION else 0)
                runCatching { activity.contentResolver.releasePersistableUriPermission(previous, oldFlags) }
            }
        }
        ReceiptStore.record(activity,"device.files.authorize","PASS","Owner granted a scoped Android document tree")
        return uri
    }

    fun canRead(context: Context): Boolean = runCatching { grant(context, false); true }.getOrDefault(false)
    fun canWrite(context: Context): Boolean = runCatching { grant(context, true); true }.getOrDefault(false)

    internal fun normalizeRelativePath(path: String): List<String> {
        if (path.isEmpty() || path.length > 1024 || path.startsWith('/') || path.startsWith('\\') ||
            path.endsWith('/') || path.contains("//") || path.contains('\\') || path.contains(':') || path.contains('\u0000')) {
            throw IllegalArgumentException("INVALID_PATH")
        }
        if (path == ".") return emptyList()
        val parts = path.split('/')
        if (parts.any { part ->
                part.isEmpty() || part == "." || part == ".." || part.length > 255 ||
                    part.endsWith('.') || part.endsWith(' ') ||
                    part.any { it.code < 32 || it.code == 127 || it in "<>\"|?*" } ||
                    part.matches(Regex("(?i)^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\\..*)?$"))
            }) throw IllegalArgumentException("INVALID_PATH")
        return parts
    }

    fun execute(context: Context, capability: String, arguments: JSONObject): JSONObject = synchronized(editLock) {
        val write = isWriteCapability(capability)
        val access = grant(context, write || hasPendingRecovery(context))
        reconcileMove(context, access)
        recoverAppend(context, access)
        recoverEdit(context, access)
        when (capability) {
            "device.files.read" -> readText(context, access, arguments.getString("path"))
            "device.files.read_multiple" -> readMultiple(context, access, arguments.getJSONArray("paths"))
            "device.files.info" -> fileInfo(context, access, arguments.getString("path"))
            "device.files.write" -> writeText(context, access, arguments.getString("path"), arguments.getString("text"))
            "device.files.hash" -> fileHash(context, access, arguments.getString("path"))
            "device.files.read_binary" -> readBinary(context, access, arguments.getString("path"), arguments.optLong("offset", 0L), arguments.optInt("length", 65_536))
            "device.files.write_binary" -> writeBinary(context, access, arguments.getString("path"), arguments.getString("base64"), arguments.getString("expectedSha256"))
            "device.files.append_binary" -> appendBinary(context, access, arguments)
            "device.files.move" -> move(context, access, arguments.getString("from"), arguments.getString("to"), arguments.getString("expectedSha256"))
            "device.files.edit" -> editText(context, access, arguments)
            "device.directories.list" -> listDirectory(context, access, arguments.optString("path", "."), arguments.optInt("limit", 200))
            "device.directories.page" -> directoryPage(context, access, arguments)
            "device.directories.create" -> createDirectory(context, access, arguments.getString("path"))
            else -> throw IllegalArgumentException("CAPABILITY_NOT_REMOTE_QUALIFIED")
        }
    }

    private fun isWriteCapability(capability: String) = capability in setOf(
        "device.files.write", "device.files.write_binary", "device.files.append_binary",
        "device.files.move", "device.files.edit", "device.directories.create"
    )

    private data class Access(val tree: Uri, val rootId: String)
    private enum class MoveOutcome { NOT_APPLIED, APPLIED }
    internal enum class AppendRecoveryState { NOT_APPLIED, APPLIED, CONFLICT }
    private data class Doc(
        val id: String,
        val uri: Uri,
        val name: String,
        val mime: String,
        val size: Long?,
        val modified: Long?,
        val parentId: String?
    ) {
        val isDirectory get() = mime == DocumentsContract.Document.MIME_TYPE_DIR
    }

    private fun grant(context: Context, write: Boolean): Access {
        val app = context.applicationContext
        val preferences = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = preferences.getString(TREE_KEY, null)
            ?: throw SecurityException("OWNER_FILE_SCOPE_REQUIRED")
        val tree = Uri.parse(raw)
        val permission = app.contentResolver.persistedUriPermissions.firstOrNull { it.uri == tree }
            ?: throw SecurityException("OWNER_FILE_SCOPE_REVOKED")
        if (!preferences.contains("perm_files_read") || !preferences.contains("perm_files_write")) {
            val migrated = preferences.edit()
                .putBoolean("perm_files_read", permission.isReadPermission)
                .putBoolean("perm_files_write", permission.isWritePermission)
                .commit()
            if (!migrated) throw IllegalStateException("FILE_SCOPE_MIGRATION_FAILED")
        }
        val readAllowed = preferences.getBoolean("perm_files_read", false)
        val writeAllowed = preferences.getBoolean("perm_files_write", false)
        if (!readAllowed || !permission.isReadPermission) throw SecurityException("OWNER_FILE_READ_SCOPE_REQUIRED")
        if (write && (!writeAllowed || !permission.isWritePermission)) throw SecurityException("OWNER_FILE_WRITE_SCOPE_REQUIRED")
        return Access(tree, DocumentsContract.getTreeDocumentId(tree))
    }

    private fun resolver(context: Context): ContentResolver = context.applicationContext.contentResolver

    private fun hasPendingRecovery(context: Context): Boolean {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.contains(APPEND_JOURNAL_KEY) || prefs.contains(EDIT_JOURNAL_KEY) || prefs.contains(MOVE_JOURNAL_KEY)
    }

    private fun uniqueChild(context: Context, access: Access, parent: Doc, name: String): Doc? {
        val matches = children(context, access, parent).filter { it.name == name }
        if (matches.size > 1) throw IllegalStateException("AMBIGUOUS_DOCUMENT_NAME")
        return matches.firstOrNull()
    }

    private fun root(context: Context, access: Access): Doc = readDoc(
        resolver(context), access, DocumentsContract.buildDocumentUriUsingTree(access.tree, access.rootId), null
    )

    private fun readDoc(resolver: ContentResolver, access: Access, uri: Uri, parentId: String?): Doc {
        val cursor = resolver.query(uri, arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_SIZE,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED
        ), null, null, null) ?: throw IllegalStateException("DOCUMENT_QUERY_UNAVAILABLE")
        return cursor.use {
            if (!it.moveToFirst()) throw IllegalStateException("DOCUMENT_NOT_FOUND")
            it.doc(access, parentId)
        }
    }

    private fun Cursor.doc(access: Access, parentId: String?): Doc {
        fun string(column: String, fallback: String = ""): String {
            val index = getColumnIndex(column)
            return if (index >= 0 && !isNull(index)) getString(index) ?: fallback else fallback
        }
        fun long(column: String): Long? {
            val index = getColumnIndex(column)
            if (index < 0 || isNull(index)) return null
            val value = getLong(index)
            return if (value >= 0) value else null
        }
        val id = string(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
        if (id.isBlank()) throw IllegalStateException("DOCUMENT_ID_UNAVAILABLE")
        val uri = DocumentsContract.buildDocumentUriUsingTree(access.tree, id)
        return Doc(
            id,
            uri,
            string(DocumentsContract.Document.COLUMN_DISPLAY_NAME, id.substringAfterLast(':')),
            string(DocumentsContract.Document.COLUMN_MIME_TYPE),
            long(DocumentsContract.Document.COLUMN_SIZE),
            long(DocumentsContract.Document.COLUMN_LAST_MODIFIED),
            parentId
        )
    }

    private fun children(context: Context, access: Access, parent: Doc): List<Doc> {
        if (!parent.isDirectory) throw IllegalArgumentException("DIRECTORY_REQUIRED")
        val uri = DocumentsContract.buildChildDocumentsUriUsingTree(access.tree, parent.id)
        val out = ArrayList<Doc>()
        val cursor = resolver(context).query(uri, arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_SIZE,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED
        ), null, null, null) ?: throw IllegalStateException("DIRECTORY_LIST_UNAVAILABLE")
        cursor.use {
            while (it.moveToNext()) {
                if (out.size >= MAX_DIRECTORY_ENTRIES) throw IllegalStateException("DIRECTORY_ENTRY_LIMIT")
                out += it.doc(access, parent.id)
            }
        }
        return out
    }

    private fun resolve(context: Context, access: Access, path: String): Doc {
        val parts = normalizeRelativePath(path)
        var current = root(context, access)
        for ((index, part) in parts.withIndex()) {
            if (!current.isDirectory) throw IllegalArgumentException("DIRECTORY_REQUIRED")
            current = uniqueChild(context, access, current, part)
                ?: throw IllegalArgumentException("PATH_NOT_FOUND")
            if (index < parts.lastIndex && !current.isDirectory) throw IllegalArgumentException("DIRECTORY_REQUIRED")
        }
        return current
    }

    private fun parentAndName(context: Context, access: Access, path: String): Pair<Doc, String> {
        val parts = normalizeRelativePath(path)
        if (parts.isEmpty()) throw IllegalArgumentException("ROOT_IS_NOT_A_FILE")
        val name = parts.last()
        val parent = if (parts.size == 1) root(context, access) else resolve(context, access, parts.dropLast(1).joinToString("/"))
        if (!parent.isDirectory) throw IllegalArgumentException("DIRECTORY_REQUIRED")
        return parent to name
    }

    private fun createDocument(context: Context, access: Access, parent: Doc, name: String, mime: String): Doc {
        if (children(context, access, parent).any { it.name == name }) throw IllegalArgumentException("TARGET_ALREADY_EXISTS")
        val uri = DocumentsContract.createDocument(resolver(context), parent.uri, mime, name)
            ?: throw IllegalStateException("DOCUMENT_CREATE_FAILED")
        val doc = readDoc(resolver(context), access, uri, parent.id)
        if (doc.name != name) {
            deleteDocumentVerified(context, access, parent, doc)
            throw IllegalStateException("PROVIDER_CHANGED_DOCUMENT_NAME")
        }
        return doc
    }

    private fun readText(context: Context, access: Access, path: String): JSONObject {
        val doc = resolve(context, access, path)
        if (doc.isDirectory) throw IllegalArgumentException("REGULAR_FILE_REQUIRED")
        val bytes = readBounded(context, doc, MAX_TEXT_BYTES.toLong())
        if (bytes.size > MAX_TEXT_BYTES) throw IllegalArgumentException("FILE_TOO_LARGE")
        val text = try {
            StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes)).toString()
        } catch (_: Exception) {
            throw IllegalArgumentException("TEXT_FILE_REQUIRED")
        }
        return JSONObject().put("text", text)
    }

    private fun readMultiple(context: Context, access: Access, paths: JSONArray): JSONObject {
        if (paths.length() !in 1..8) throw IllegalArgumentException("INVALID_BATCH_SIZE")
        val files = JSONArray()
        var total = 0
        for (i in 0 until paths.length()) {
            val path = paths.getString(i)
            val result = readText(context, access, path)
            total += result.getString("text").toByteArray(StandardCharsets.UTF_8).size
            if (total > 131_072) throw IllegalArgumentException("BATCH_OUTPUT_TOO_LARGE")
            files.put(JSONObject().put("path", path).put("text", result.getString("text")))
        }
        return JSONObject().put("files", files).put("totalBytes", total)
    }

    private fun writeText(context: Context, access: Access, path: String, text: String): JSONObject {
        val bytes = text.toByteArray(StandardCharsets.UTF_8)
        if (bytes.size > MAX_TEXT_BYTES) throw IllegalArgumentException("FILE_TOO_LARGE")
        val (parent, name) = parentAndName(context, access, path)
        val doc = createDocument(context, access, parent, name, "text/plain")
        try {
            writeBytes(context, doc, bytes)
            val verified = digest(context, doc)
            if (verified.first != bytes.size.toLong() || verified.second != sha256(bytes)) throw IllegalStateException("TEXT_WRITE_VERIFY_FAILED")
            return JSONObject().put("created", true).put("bytes", bytes.size)
        } catch (error: Exception) {
            deleteDocumentVerified(context, access, parent, doc)
            throw error
        }
    }

    private fun fileInfo(context: Context, access: Access, path: String): JSONObject {
        val doc = resolve(context, access, path)
        val result = JSONObject().put("path", path).put("type", if (doc.isDirectory) "directory" else "file")
        doc.size?.let { result.put("sizeBytes", it) }
        doc.modified?.let { result.put("modifiedUtc", Instant.ofEpochMilli(it).toString()) }
        return result
    }

    private fun fileHash(context: Context, access: Access, path: String): JSONObject {
        val doc = resolve(context, access, path)
        if (doc.isDirectory) throw IllegalArgumentException("REGULAR_FILE_REQUIRED")
        val digest = digest(context, doc)
        return JSONObject().put("size", digest.first).put("sha256", digest.second)
    }

    private fun readBinary(context: Context, access: Access, path: String, offset: Long, length: Int): JSONObject {
        if (offset < 0 || length !in 1..MAX_CHUNK_BYTES) throw IllegalArgumentException("INVALID_BINARY_RANGE")
        val doc = resolve(context, access, path)
        if (doc.isDirectory) throw IllegalArgumentException("REGULAR_FILE_REQUIRED")
        val total = doc.size ?: digest(context, doc).first
        if (total > MAX_FILE_BYTES) throw IllegalArgumentException("TRANSFER_SIZE_LIMIT")
        if (offset > total) throw IllegalArgumentException("OFFSET_OUTSIDE_FILE")
        val bytes = resolver(context).openInputStream(doc.uri)?.use { input ->
            skipFully(input, offset)
            val buffer = ByteArray(minOf(length, (total - offset).coerceAtLeast(0).toInt()))
            var read = 0
            while (read < buffer.size) {
                val count = input.read(buffer, read, buffer.size - read)
                if (count < 0) break
                read += count
            }
            buffer.copyOf(read)
        } ?: throw IllegalStateException("DOCUMENT_READ_FAILED")
        return JSONObject().put("offset", offset).put("length", bytes.size)
            .put("sizeBytes", total).put("eof", offset + bytes.size >= total)
            .put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP))
            .put("chunkSha256", sha256(bytes))
    }

    private fun writeBinary(context: Context, access: Access, path: String, base64: String, expected: String): JSONObject {
        val bytes = decodeBase64(base64)
        if (bytes.size > MAX_CHUNK_BYTES) throw IllegalArgumentException("TRANSFER_SIZE_LIMIT")
        val actual = sha256(bytes)
        requireHash(expected)
        if (actual != expected) throw IllegalArgumentException("BINARY_DIGEST_MISMATCH")
        val (parent, name) = parentAndName(context, access, path)
        val doc = createDocument(context, access, parent, name, "application/octet-stream")
        try {
            writeBytes(context, doc, bytes)
            val verified = digest(context, doc)
            if (verified.first != bytes.size.toLong() || verified.second != actual) throw IllegalStateException("BINARY_WRITE_VERIFY_FAILED")
            return JSONObject().put("created", true).put("bytes", bytes.size).put("sha256", actual)
        } catch (error: Exception) {
            deleteDocumentVerified(context, access, parent, doc)
            throw error
        }
    }

    private fun appendBinary(context: Context, access: Access, args: JSONObject): JSONObject {
        val path = args.getString("path")
        val bytes = decodeBase64(args.getString("base64"))
        if (bytes.isEmpty() || bytes.size > MAX_CHUNK_BYTES) throw IllegalArgumentException("INVALID_BINARY_CHUNK")
        val chunkHash = sha256(bytes)
        requireHash(args.getString("expectedChunkSha256"))
        if (chunkHash != args.getString("expectedChunkSha256")) throw IllegalArgumentException("TRANSFER_CHUNK_HASH_MISMATCH")
        val doc = resolve(context, access, path)
        if (doc.isDirectory || doc.parentId == null) throw IllegalArgumentException("REGULAR_FILE_REQUIRED")
        val current = digest(context, doc)
        val expectedOffset = args.getLong("expectedOffset")
        val expectedHash = args.getString("expectedSha256")
        requireHash(expectedHash)
        if (current.first != expectedOffset || current.second != expectedHash) throw IllegalArgumentException("TRANSFER_OFFSET_OR_HASH_MISMATCH")
        if (current.first + bytes.size > MAX_FILE_BYTES) throw IllegalArgumentException("TRANSFER_SIZE_LIMIT")
        val expectedAfterHash = digestWithSuffix(context, doc, bytes)
        val nextSize = current.first + bytes.size
        val journal = JSONObject()
            .put("path", path)
            .put("documentId", doc.id)
            .put("expectedOffset", current.first)
            .put("expectedSha256", current.second)
            .put("chunkSha256", chunkHash)
            .put("expectedNextOffset", nextSize)
            .put("expectedNextSha256", expectedAfterHash)
            .put("attempted", false)
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.edit().putString(APPEND_JOURNAL_KEY, journal.toString()).commit()) {
            throw IllegalStateException("APPEND_JOURNAL_PERSIST_FAILED")
        }
        val documentBeforeWrite = resolve(context, access, path)
        val currentBeforeWrite = digest(context, documentBeforeWrite)
        if (documentBeforeWrite.id != doc.id || currentBeforeWrite.first != current.first || currentBeforeWrite.second != current.second) {
            if (!prefs.edit().remove(APPEND_JOURNAL_KEY).commit()) throw IllegalStateException("APPEND_JOURNAL_CLEAR_FAILED")
            throw IllegalArgumentException("TRANSFER_TARGET_CHANGED")
        }
        if (!prefs.edit().putString(APPEND_JOURNAL_KEY, journal.put("attempted", true).toString()).commit()) {
            prefs.edit().remove(APPEND_JOURNAL_KEY).commit()
            throw IllegalStateException("APPEND_JOURNAL_START_FAILED")
        }
        try {
            val output = resolver(context).openOutputStream(doc.uri, "wa") ?: throw IllegalStateException("APPEND_UNSUPPORTED_BY_PROVIDER")
            output.use { it.write(bytes); it.flush() }
            val documentAfterWrite = resolve(context, access, path)
            val after = digest(context, documentAfterWrite)
            if (documentAfterWrite.id != doc.id || after.first != nextSize || after.second != expectedAfterHash) {
                throw IllegalStateException("TRANSFER_POSTCONDITION_FAILED")
            }
            if (!prefs.edit().remove(APPEND_JOURNAL_KEY).commit()) {
                throw IllegalStateException("APPEND_JOURNAL_CLEAR_FAILED")
            }
            return JSONObject().put("appended", true).put("previousBytes", current.first)
                .put("sizeBytes", after.first).put("appendedBytes", bytes.size)
                .put("sha256", after.second).put("expectedNextOffset", after.first).put("persistentResume", true)
        } catch (error: Exception) {
            when (runCatching { recoverAppend(context, access) }.getOrNull()) {
                AppendRecoveryState.APPLIED -> return JSONObject().put("appended", true).put("previousBytes", current.first)
                    .put("sizeBytes", nextSize).put("appendedBytes", bytes.size)
                    .put("sha256", expectedAfterHash).put("expectedNextOffset", nextSize)
                    .put("persistentResume", true).put("recovered", true)
                AppendRecoveryState.NOT_APPLIED -> throw error
                null, AppendRecoveryState.CONFLICT -> throw IllegalStateException("TRANSFER_RECOVERY_REQUIRED", error)
            }
        }
    }

    internal fun classifyAppendRecovery(
        currentSize: Long,
        currentSha256: String,
        expectedOffset: Long,
        expectedSha256: String,
        expectedNextOffset: Long,
        expectedNextSha256: String
    ): AppendRecoveryState = when {
        currentSize == expectedNextOffset && currentSha256 == expectedNextSha256 -> AppendRecoveryState.APPLIED
        currentSize == expectedOffset && currentSha256 == expectedSha256 -> AppendRecoveryState.NOT_APPLIED
        else -> AppendRecoveryState.CONFLICT
    }

    private fun recoverAppend(context: Context, access: Access): AppendRecoveryState? {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(APPEND_JOURNAL_KEY, null) ?: return null
        val journal = runCatching { JSONObject(raw) }
            .getOrElse { throw IllegalStateException("APPEND_RECOVERY_REQUIRED") }
        val path = journal.getString("path")
        normalizeRelativePath(path)
        val expectedOffset = journal.getLong("expectedOffset")
        val expectedSha256 = journal.getString("expectedSha256")
        val expectedNextOffset = journal.getLong("expectedNextOffset")
        val expectedNextSha256 = journal.getString("expectedNextSha256")
        val chunkSha256 = journal.getString("chunkSha256")
        val documentId = journal.getString("documentId")
        if (expectedOffset < 0 || expectedNextOffset <= expectedOffset || expectedNextOffset > MAX_FILE_BYTES) {
            throw IllegalStateException("APPEND_RECOVERY_REQUIRED")
        }
        requireHash(expectedSha256)
        requireHash(expectedNextSha256)
        requireHash(chunkSha256)
        if (!journal.optBoolean("attempted", true)) {
            if (!prefs.edit().remove(APPEND_JOURNAL_KEY).commit()) {
                throw IllegalStateException("APPEND_JOURNAL_CLEAR_FAILED")
            }
            return AppendRecoveryState.NOT_APPLIED
        }
        val doc = resolve(context, access, path)
        if (doc.isDirectory || doc.id != documentId) throw IllegalStateException("APPEND_RECOVERY_REQUIRED")
        val current = digest(context, doc)
        val outcome = classifyAppendRecovery(
            current.first, current.second, expectedOffset, expectedSha256,
            expectedNextOffset, expectedNextSha256
        )
        if (outcome == AppendRecoveryState.CONFLICT) throw IllegalStateException("APPEND_RECOVERY_REQUIRED")
        if (!prefs.edit().remove(APPEND_JOURNAL_KEY).commit()) {
            throw IllegalStateException("APPEND_JOURNAL_CLEAR_FAILED")
        }
        return outcome
    }

    private fun move(context: Context, access: Access, from: String, to: String, expectedSha: String): JSONObject {
        requireHash(expectedSha)
        val source = resolve(context, access, from)
        if (source.isDirectory || source.parentId == null) throw IllegalArgumentException("REGULAR_FILE_REQUIRED")
        val before = digest(context, source)
        if (before.second != expectedSha) throw IllegalArgumentException("SOURCE_CHANGED")
        val (destinationParent, destinationName) = parentAndName(context, access, to)
        if (source.parentId == destinationParent.id && source.name == destinationName) throw IllegalArgumentException("SOURCE_EQUALS_DESTINATION")
        if (children(context, access, destinationParent).any { it.name == destinationName }) throw IllegalArgumentException("TARGET_ALREADY_EXISTS")
        val sourceParts = normalizeRelativePath(from)
        val destinationParts = normalizeRelativePath(to)
        val sourceParentPath = if (sourceParts.size == 1) "." else sourceParts.dropLast(1).joinToString("/")
        val destinationParentPath = if (destinationParts.size == 1) "." else destinationParts.dropLast(1).joinToString("/")
        val sourceParent = resolve(context, access, sourceParentPath)
        val currentSource = uniqueChild(context, access, sourceParent, source.name)
            ?: throw IllegalArgumentException("PATH_NOT_FOUND")
        if (currentSource.id != source.id || digest(context, currentSource).second != expectedSha) {
            throw IllegalArgumentException("SOURCE_CHANGED")
        }
        val journal = JSONObject()
            .put("from", from).put("to", to)
            .put("expectedSha256", expectedSha).put("sizeBytes", before.first)
            .put("sourceDocumentId", source.id)
            .put("attempted", false)
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.edit().putString(MOVE_JOURNAL_KEY, journal.toString()).commit()) {
            throw IllegalStateException("MOVE_JOURNAL_PERSIST_FAILED")
        }
        val sourceAtMove = uniqueChild(context, access, sourceParent, source.name)
        val destinationAtMove = uniqueChild(context, access, destinationParent, destinationName)
        if (sourceAtMove == null || sourceAtMove.id != source.id || digest(context, sourceAtMove).second != expectedSha) {
            if (!prefs.edit().remove(MOVE_JOURNAL_KEY).commit()) throw IllegalStateException("MOVE_JOURNAL_CLEAR_FAILED")
            throw IllegalArgumentException("SOURCE_CHANGED")
        }
        if (destinationAtMove != null) {
            if (!prefs.edit().remove(MOVE_JOURNAL_KEY).commit()) throw IllegalStateException("MOVE_JOURNAL_CLEAR_FAILED")
            throw IllegalArgumentException("TARGET_ALREADY_EXISTS")
        }
        if (!prefs.edit().putString(MOVE_JOURNAL_KEY, journal.put("attempted", true).toString()).commit()) {
            prefs.edit().remove(MOVE_JOURNAL_KEY).commit()
            throw IllegalStateException("MOVE_JOURNAL_START_FAILED")
        }
        try {
            val moved = if (sourceParent.id == destinationParent.id) {
                DocumentsContract.renameDocument(resolver(context), sourceAtMove.uri, destinationName)
            } else {
                DocumentsContract.moveDocument(resolver(context), sourceAtMove.uri, sourceParent.uri, destinationParent.uri)
                    ?.let { uri -> if (readDoc(resolver(context), access, uri, destinationParent.id).name != destinationName)
                        DocumentsContract.renameDocument(resolver(context), uri, destinationName) else uri }
            } ?: throw IllegalStateException("MOVE_UNSUPPORTED_BY_PROVIDER")
            val movedDoc = readDoc(resolver(context), access, moved, destinationParent.id)
            val movedDigest = digest(context, movedDoc)
            if (movedDoc.name != destinationName || movedDigest.first != before.first || movedDigest.second != before.second) {
                throw IllegalStateException("MOVE_POSTCONDITION_FAILED")
            }
            val outcome = reconcileMove(context, access)
            if (outcome != MoveOutcome.APPLIED) throw IllegalStateException("MOVE_NOT_APPLIED")
            return JSONObject().put("moved", true).put("from", from).put("to", to)
                .put("sha256", before.second).put("bytes", before.first)
        } catch (error: Exception) {
            when (runCatching { reconcileMove(context, access) }.getOrNull()) {
                MoveOutcome.APPLIED -> return JSONObject().put("moved", true).put("from", from).put("to", to)
                    .put("sha256", before.second).put("bytes", before.first).put("recovered", true)
                MoveOutcome.NOT_APPLIED -> throw error
                null -> throw IllegalStateException("MOVE_RECOVERY_REQUIRED", error)
            }
        }
    }

    private fun editText(context: Context, access: Access, args: JSONObject): JSONObject {
        val path = args.getString("path")
        val original = resolve(context, access, path)
        if (original.isDirectory || original.parentId == null) throw IllegalArgumentException("REGULAR_FILE_REQUIRED")
        if (original.size != null && original.size > MAX_TEXT_BYTES) throw IllegalArgumentException("FILE_TOO_LARGE")
        val bytes = readBounded(context, original, MAX_TEXT_BYTES.toLong())
        if (bytes.size > MAX_TEXT_BYTES) throw IllegalArgumentException("FILE_TOO_LARGE")
        val oldHash = sha256(bytes)
        requireHash(args.getString("expectedSha256"))
        if (oldHash != args.getString("expectedSha256")) throw IllegalArgumentException("EDIT_SOURCE_CHANGED")
        val text = try {
            StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes)).toString()
        } catch (_: Exception) {
            throw IllegalArgumentException("TEXT_FILE_REQUIRED")
        }
        if (text.contains('\u0000')) throw IllegalArgumentException("TEXT_FILE_REQUIRED")
        val oldText = args.getString("oldText")
        val newText = args.getString("newText")
        val expectedReplacements = args.getInt("expectedReplacements")
        if (oldText.isEmpty() || expectedReplacements !in 1..1000) throw IllegalArgumentException("EDIT_PRECONDITION_REQUIRED")
        if (oldText.contains('\u0000') || newText.contains('\u0000')) throw IllegalArgumentException("TEXT_FILE_REQUIRED")
        val matches = Regex(Regex.escape(oldText)).findAll(text).count()
        if (matches != expectedReplacements) throw IllegalArgumentException("EDIT_MATCH_COUNT_MISMATCH")
        val replacement = text.replace(oldText, newText)
        val next = replacement.toByteArray(StandardCharsets.UTF_8)
        if (next.size > MAX_TEXT_BYTES) throw IllegalArgumentException("FILE_TOO_LARGE")
        if (next.contentEquals(bytes)) throw IllegalArgumentException("EDIT_NO_CHANGE")
        val pathParts = normalizeRelativePath(path)
        val parentPath = if (pathParts.size == 1) "." else pathParts.dropLast(1).joinToString("/")
        val parent = resolve(context, access, parentPath)
        val id = UUID.randomUUID().toString()
        val tempName = ".leeway-edit-$id.tmp"
        val backupName = ".leeway-edit-$id.backup"
        val temp = createDocument(context, access, parent, tempName, "text/plain")
        try {
            writeBytes(context, temp, next)
            if (digest(context, temp).second != sha256(next)) throw IllegalStateException("EDIT_TEMP_VERIFY_FAILED")
        } catch (error: Exception) {
            deleteDocumentVerified(context, access, parent, temp)
            throw error
        }
        val journal = JSONObject().put("parentPath", parentPath).put("originalName", original.name)
            .put("tempName", tempName).put("backupName", backupName).put("attempted", false)
            .put("oldSha256", oldHash).put("newSha256", sha256(next))
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.edit().putString(EDIT_JOURNAL_KEY, journal.toString()).commit()) {
            deleteDocumentVerified(context, access, parent, temp)
            throw IllegalStateException("EDIT_JOURNAL_PERSIST_FAILED")
        }
        try {
            val currentOriginal = resolve(context, access, path)
            if (currentOriginal.id != original.id || digest(context, currentOriginal).second != oldHash) {
                deleteDocumentVerified(context, access, parent, temp)
                if (!context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit().remove(EDIT_JOURNAL_KEY).commit()) {
                    throw IllegalStateException("EDIT_JOURNAL_CLEAR_FAILED")
                }
                throw IllegalArgumentException("EDIT_SOURCE_CHANGED")
            }
            if (!prefs.edit().putString(EDIT_JOURNAL_KEY, journal.put("attempted", true).toString()).commit()) {
                deleteDocumentVerified(context, access, parent, temp)
                if (!prefs.edit().remove(EDIT_JOURNAL_KEY).commit()) throw IllegalStateException("EDIT_JOURNAL_CLEAR_FAILED")
                throw IllegalStateException("EDIT_JOURNAL_START_FAILED")
            }
            val movedOld = DocumentsContract.renameDocument(resolver(context), original.uri, backupName)
                ?: throw IllegalStateException("EDIT_RENAME_UNSUPPORTED_BY_PROVIDER")
            if (readDoc(resolver(context), access, movedOld, parent.id).name != backupName) throw IllegalStateException("EDIT_BACKUP_NAME_MISMATCH")
            val installed = DocumentsContract.renameDocument(resolver(context), temp.uri, original.name)
                ?: throw IllegalStateException("EDIT_RENAME_UNSUPPORTED_BY_PROVIDER")
            if (readDoc(resolver(context), access, installed, parent.id).name != original.name) throw IllegalStateException("EDIT_INSTALL_NAME_MISMATCH")
            val after = digest(context, readDoc(resolver(context), access, installed, parent.id))
            if (after.second != sha256(next) || after.first != next.size.toLong()) throw IllegalStateException("EDIT_POSTCONDITION_FAILED")
            recoverEdit(context, access)
            return JSONObject().put("edited", true).put("replacements", matches)
                .put("bytes", next.size).put("sha256", after.second)
        } catch (error: Exception) {
            if (!prefs.contains(EDIT_JOURNAL_KEY)) throw error
            val recovery = runCatching { recoverEdit(context, access) }
            if (recovery.isSuccess && !prefs.contains(EDIT_JOURNAL_KEY)) {
                val current = runCatching { resolve(context, access, path) }.getOrNull()
                if (current != null && !current.isDirectory) {
                    val currentDigest = runCatching { digest(context, current) }.getOrNull()
                    if (currentDigest != null && currentDigest.first == next.size.toLong() && currentDigest.second == sha256(next)) {
                        return JSONObject().put("edited", true).put("replacements", matches)
                            .put("bytes", next.size).put("sha256", currentDigest.second).put("recovered", true)
                    }
                }
                throw error
            }
            throw IllegalStateException("EDIT_RECOVERY_REQUIRED", error)
        }
    }

    private fun recoverEdit(context: Context, access: Access) {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(EDIT_JOURNAL_KEY, null) ?: return
        val journal = runCatching { JSONObject(raw) }.getOrElse { throw IllegalStateException("EDIT_RECOVERY_REQUIRED") }
        val parentPath = journal.getString("parentPath")
        normalizeRelativePath(parentPath)
        val attempted = journal.optBoolean("attempted", true)
        val parent = try {
            resolve(context, access, parentPath)
        } catch (error: Exception) {
            if (attempted) throw IllegalStateException("EDIT_RECOVERY_REQUIRED", error)
            if (!prefs.edit().remove(EDIT_JOURNAL_KEY).commit()) throw IllegalStateException("EDIT_JOURNAL_CLEAR_FAILED")
            return
        }
        if (!parent.isDirectory) throw IllegalStateException("EDIT_RECOVERY_REQUIRED")
        val originalName = journal.getString("originalName")
        val tempName = journal.getString("tempName")
        val backupName = journal.getString("backupName")
        val oldHash = journal.getString("oldSha256")
        val newHash = journal.getString("newSha256")
        listOf(originalName, tempName, backupName).forEach { name ->
            if (normalizeRelativePath(name).size != 1) throw IllegalStateException("EDIT_RECOVERY_REQUIRED")
        }
        requireHash(oldHash)
        requireHash(newHash)
        val original = uniqueChild(context, access, parent, originalName)
        val temp = uniqueChild(context, access, parent, tempName)
        val backup = uniqueChild(context, access, parent, backupName)
        if (!attempted) {
            if (backup != null) throw IllegalStateException("EDIT_RECOVERY_REQUIRED")
            temp?.let { if (digest(context, it).second == newHash) deleteDocumentVerified(context, access, parent, it) else throw IllegalStateException("EDIT_RECOVERY_REQUIRED") }
            if (!prefs.edit().remove(EDIT_JOURNAL_KEY).commit()) throw IllegalStateException("EDIT_JOURNAL_CLEAR_FAILED")
            return
        }
        if (original != null) {
            val currentHash = digest(context, original).second
            if (currentHash == newHash) {
                backup?.let { if (digest(context, it).second == oldHash) deleteDocumentVerified(context, access, parent, it) else throw IllegalStateException("EDIT_RECOVERY_REQUIRED") }
                temp?.let { if (digest(context, it).second == newHash) deleteDocumentVerified(context, access, parent, it) else throw IllegalStateException("EDIT_RECOVERY_REQUIRED") }
                if (!prefs.edit().remove(EDIT_JOURNAL_KEY).commit()) throw IllegalStateException("EDIT_JOURNAL_CLEAR_FAILED")
                return
            }
            if (currentHash == oldHash) {
                backup?.let { if (digest(context, it).second == oldHash) deleteDocumentVerified(context, access, parent, it) else throw IllegalStateException("EDIT_RECOVERY_REQUIRED") }
                temp?.let { if (digest(context, it).second == newHash) deleteDocumentVerified(context, access, parent, it) else throw IllegalStateException("EDIT_RECOVERY_REQUIRED") }
                if (!prefs.edit().remove(EDIT_JOURNAL_KEY).commit()) throw IllegalStateException("EDIT_JOURNAL_CLEAR_FAILED")
                return
            }
            throw IllegalStateException("EDIT_RECOVERY_REQUIRED")
        }
        if (backup != null && digest(context, backup).second == oldHash) {
            val restored = DocumentsContract.renameDocument(resolver(context), backup.uri, originalName)
                ?: throw IllegalStateException("EDIT_RECOVERY_REQUIRED")
            val restoredDoc = readDoc(resolver(context), access, restored, parent.id)
            if (restoredDoc.name != originalName || digest(context, restoredDoc).second != oldHash) {
                throw IllegalStateException("EDIT_RECOVERY_REQUIRED")
            }
            temp?.let { if (digest(context, it).second == newHash) deleteDocumentVerified(context, access, parent, it) else throw IllegalStateException("EDIT_RECOVERY_REQUIRED") }
            if (!prefs.edit().remove(EDIT_JOURNAL_KEY).commit()) throw IllegalStateException("EDIT_JOURNAL_CLEAR_FAILED")
            return
        }
        throw IllegalStateException("EDIT_RECOVERY_REQUIRED")
    }

    private fun reconcileMove(context: Context, access: Access): MoveOutcome? {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(MOVE_JOURNAL_KEY, null) ?: return null
        val journal = runCatching { JSONObject(raw) }.getOrElse { throw IllegalStateException("MOVE_RECOVERY_REQUIRED") }
        if (!journal.optBoolean("attempted", true)) {
            if (!prefs.edit().remove(MOVE_JOURNAL_KEY).commit()) throw IllegalStateException("MOVE_JOURNAL_CLEAR_FAILED")
            return MoveOutcome.NOT_APPLIED
        }
        val from = journal.getString("from")
        val to = journal.getString("to")
        val expectedHash = journal.getString("expectedSha256")
        val expectedSize = journal.getLong("sizeBytes")
        val expectedDocumentId = journal.getString("sourceDocumentId")
        if (expectedSize < 0 || expectedSize > MAX_FILE_BYTES) throw IllegalStateException("MOVE_RECOVERY_REQUIRED")
        requireHash(expectedHash)
        val (sourceParent, sourceName) = parentAndName(context, access, from)
        val (destinationParent, destinationName) = parentAndName(context, access, to)
        if (sourceParent.id == destinationParent.id && sourceName == destinationName) {
            throw IllegalStateException("MOVE_RECOVERY_REQUIRED")
        }
        val source = uniqueChild(context, access, sourceParent, sourceName)
        var destination = uniqueChild(context, access, destinationParent, destinationName)
        if (source == null && destination == null && sourceParent.id != destinationParent.id && sourceName != destinationName) {
            val movedBeforeRename = uniqueChild(context, access, destinationParent, sourceName)
            if (movedBeforeRename?.id == expectedDocumentId && !movedBeforeRename.isDirectory) {
                val movedDigest = digest(context, movedBeforeRename)
                if (movedDigest.first == expectedSize && movedDigest.second == expectedHash) {
                    val renamed = DocumentsContract.renameDocument(resolver(context), movedBeforeRename.uri, destinationName)
                        ?: throw IllegalStateException("MOVE_RECOVERY_REQUIRED")
                    val renamedDoc = readDoc(resolver(context), access, renamed, destinationParent.id)
                    val renamedDigest = digest(context, renamedDoc)
                    if (renamedDoc.name != destinationName || renamedDigest.first != expectedSize || renamedDigest.second != expectedHash) {
                        throw IllegalStateException("MOVE_RECOVERY_REQUIRED")
                    }
                    destination = uniqueChild(context, access, destinationParent, destinationName)
                }
            }
        }
        val sourceDigest = source?.takeUnless { it.isDirectory }?.let { digest(context, it) }
        val destinationDigest = destination?.takeUnless { it.isDirectory }?.let { digest(context, it) }
        val sourceMatches = sourceDigest?.let { it.first == expectedSize && it.second == expectedHash } ?: false
        val destinationMatches = destinationDigest?.let { it.first == expectedSize && it.second == expectedHash } ?: false
        val outcome = when {
            sourceMatches && destination == null -> MoveOutcome.NOT_APPLIED
            source == null && destinationMatches -> MoveOutcome.APPLIED
            else -> throw IllegalStateException("MOVE_RECOVERY_REQUIRED")
        }
        if (!prefs.edit().remove(MOVE_JOURNAL_KEY).commit()) throw IllegalStateException("MOVE_JOURNAL_CLEAR_FAILED")
        return outcome
    }

    private fun deleteDocumentVerified(context: Context, access: Access, parent: Doc, document: Doc) {
        runCatching { DocumentsContract.deleteDocument(resolver(context), document.uri) }
        if (uniqueChild(context, access, parent, document.name) != null) {
            throw IllegalStateException("DOCUMENT_DELETE_NOT_VERIFIED")
        }
    }

    private fun listDirectory(context: Context, access: Access, path: String, limit: Int): JSONObject {
        if (limit !in 1..500) throw IllegalArgumentException("INVALID_DIRECTORY_LIMIT")
        val dir = resolve(context, access, path)
        val entries = children(context, access, dir).sortedBy { it.name }
        return JSONObject().put("entries", JSONArray(entries.take(limit).map { JSONObject().put("name", it.name).put("type", if (it.isDirectory) "directory" else "file") }))
            .put("truncated", entries.size > limit)
    }

    private fun directoryPage(context: Context, access: Access, args: JSONObject): JSONObject {
        val path = args.optString("path", ".")
        val offset = args.optInt("offset", 0)
        val limit = args.optInt("limit", 100)
        if (offset < 0 || limit !in 1..500) throw IllegalArgumentException("INVALID_DIRECTORY_PAGE")
        val dir = resolve(context, access, path)
        val entries = children(context, access, dir).sortedBy { it.name }
        val snapshot = sha256(JSONArray(entries.map { it.name }.toList()).toString().toByteArray(StandardCharsets.UTF_8))
        if (args.has("expectedSnapshotSha256") && args.getString("expectedSnapshotSha256") != snapshot) throw IllegalArgumentException("DIRECTORY_SNAPSHOT_CHANGED")
        if (offset > entries.size) throw IllegalArgumentException("DIRECTORY_PAGE_OUT_OF_RANGE")
        val selected = entries.drop(offset).take(limit)
        val next = offset + selected.size
        return JSONObject().put("path", path).put("entries", JSONArray(selected.map { JSONObject().put("name", it.name).put("type", if (it.isDirectory) "directory" else "file") }))
            .put("total", entries.size).put("snapshotSha256", snapshot).put("nextOffset", next).put("moreAvailable", next < entries.size)
    }

    private fun createDirectory(context: Context, access: Access, path: String): JSONObject {
        val (parent, name) = parentAndName(context, access, path)
        val created = createDocument(context, access, parent, name, DocumentsContract.Document.MIME_TYPE_DIR)
        if (!created.isDirectory) {
            deleteDocumentVerified(context, access, parent, created)
            throw IllegalStateException("DIRECTORY_CREATE_VERIFY_FAILED")
        }
        return JSONObject().put("created", true)
    }

    private fun readBounded(context: Context, doc: Doc, max: Long): ByteArray {
        val out = ByteArrayOutputStream()
        resolver(context).openInputStream(doc.uri)?.use { input ->
            val buffer = ByteArray(32 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                if (out.size().toLong() + count > max) return out.toByteArray() + byteArrayOf(0)
                out.write(buffer, 0, count)
            }
        } ?: throw IllegalStateException("DOCUMENT_READ_FAILED")
        return out.toByteArray()
    }

    private fun writeBytes(context: Context, doc: Doc, bytes: ByteArray, mode: String = "w") {
        resolver(context).openOutputStream(doc.uri, mode)?.use { output -> output.write(bytes); output.flush() }
            ?: throw IllegalStateException("DOCUMENT_WRITE_FAILED")
    }

    private fun digest(context: Context, doc: Doc): Pair<Long, String> {
        if (doc.isDirectory) throw IllegalArgumentException("REGULAR_FILE_REQUIRED")
        val digest = MessageDigest.getInstance("SHA-256")
        var total = 0L
        resolver(context).openInputStream(doc.uri)?.use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                total += count
                if (total > MAX_FILE_BYTES) throw IllegalArgumentException("TRANSFER_SIZE_LIMIT")
                digest.update(buffer, 0, count)
            }
        } ?: throw IllegalStateException("DOCUMENT_READ_FAILED")
        return total to digest.digest().toHex()
    }

    private fun digestWithSuffix(context: Context, doc: Doc, suffix: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        var total = 0L
        resolver(context).openInputStream(doc.uri)?.use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                total += count
                if (total > MAX_FILE_BYTES) throw IllegalArgumentException("TRANSFER_SIZE_LIMIT")
                digest.update(buffer, 0, count)
            }
        } ?: throw IllegalStateException("DOCUMENT_READ_FAILED")
        digest.update(suffix)
        return digest.digest().toHex()
    }

    private fun skipFully(input: InputStream, length: Long) {
        var remaining = length
        val discard = ByteArray(8192)
        while (remaining > 0) {
            val skipped = input.skip(remaining)
            if (skipped > 0) remaining -= skipped else {
                val count = input.read(discard, 0, minOf(discard.size.toLong(), remaining).toInt())
                if (count < 0) throw IllegalArgumentException("OFFSET_OUTSIDE_FILE")
                remaining -= count
            }
        }
    }

    private fun decodeBase64(value: String): ByteArray {
        if (value.length % 4 != 0 || value.length > 349_528 || !value.matches(Regex("^[A-Za-z0-9+/]*={0,2}$"))) {
            throw IllegalArgumentException("INVALID_BASE64")
        }
        val bytes = runCatching { Base64.decode(value, Base64.NO_WRAP) }.getOrElse { throw IllegalArgumentException("INVALID_BASE64") }
        if (Base64.encodeToString(bytes, Base64.NO_WRAP) != value) throw IllegalArgumentException("INVALID_BASE64")
        return bytes
    }

    private fun requireHash(value: String) {
        if (!value.matches(Regex("^[a-f0-9]{64}$"))) throw IllegalArgumentException("INVALID_SHA256")
    }

    private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).toHex()

    private fun ByteArray.toHex(): String {
        val digits = "0123456789abcdef"
        val out = CharArray(size * 2)
        forEachIndexed { index, byte ->
            val value = byte.toInt() and 0xff
            out[index * 2] = digits[value ushr 4]
            out[index * 2 + 1] = digits[value and 0x0f]
        }
        return String(out)
    }
}

