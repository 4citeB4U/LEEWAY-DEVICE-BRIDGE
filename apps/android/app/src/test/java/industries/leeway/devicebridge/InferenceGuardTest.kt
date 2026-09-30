package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicInteger

class InferenceGuardTest {
    @Test fun concurrentRequestsHaveOnlyOneOwnerUntilRelease() {
        val guard = InferenceGuard()
        val start = CountDownLatch(1)
        val owners = AtomicInteger(0)
        val threads = (1..16).map { Thread { start.await(); if (guard.tryAcquire()) owners.incrementAndGet() } }
        threads.forEach { it.start() }
        start.countDown()
        threads.forEach { it.join() }
        assertEquals(1, owners.get())
        assertTrue(guard.isBusy())
        assertFalse(guard.tryAcquire())
        guard.release()
        assertFalse(guard.isBusy())
        assertTrue(guard.tryAcquire())
    }
}
