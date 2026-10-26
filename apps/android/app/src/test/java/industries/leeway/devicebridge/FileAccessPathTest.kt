package industries.leeway.devicebridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class FileAccessPathTest {
    @Test fun rootAndPortableRelativePathsAreAccepted() {
        assertEquals(emptyList<String>(), FileAccess.normalizeRelativePath("."))
        assertEquals(listOf("docs", "report.txt"), FileAccess.normalizeRelativePath("docs/report.txt"))
    }

    @Test fun pathsCannotEscapeOrChangeRootIdentity() {
        listOf("", "/private.txt", "../private.txt", "docs/../private.txt", "docs\\private.txt", "C:/private.txt")
            .forEach { path -> assertThrows(IllegalArgumentException::class.java) { FileAccess.normalizeRelativePath(path) } }
    }

    @Test fun pathsUsePortableNamesAndRejectAmbiguousSegments() {
        listOf("docs//report.txt", "docs/./report.txt", "docs/..", "docs/trailing.", "docs/trailing ", "docs/with\u0000nul", "docs/NUL.txt", "docs/question?.txt")
            .forEach { path -> assertThrows(IllegalArgumentException::class.java) { FileAccess.normalizeRelativePath(path) } }
    }
}
