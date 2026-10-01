package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicInteger

class PocketCommandPolicyTest {
    @Test fun callerNeedsEveryIndependentAuthority() {
        val pocket=listOf("industries.leeway.pocket")
        assertTrue(PocketCommandPolicy.authorized(pocket,true,true,true))
        assertFalse(PocketCommandPolicy.authorized(listOf("attacker"),true,true,true))
        assertFalse(PocketCommandPolicy.authorized(pocket+"shared.uid.app",true,true,true))
        assertFalse(PocketCommandPolicy.authorized(pocket,false,true,true))
        assertFalse(PocketCommandPolicy.authorized(pocket,true,false,true))
        assertFalse(PocketCommandPolicy.authorized(pocket,true,true,false))
    }
    @Test fun exactLabelsDoNotGuessAndDuplicateActivitiesAreOneApp() {
        val apps=listOf("Settings" to "a.settings", "Settings" to "b.settings", "Calculator" to "a.calc", "Calculator" to "a.calc")
        assertEquals(listOf("a.calc"),PocketCommandPolicy.matchingPackages("calculator",apps))
        assertEquals(2,PocketCommandPolicy.matchingPackages("Settings",apps).size)
        assertTrue(PocketCommandPolicy.matchingPackages("Calc",apps).isEmpty())
        assertTrue(PocketCommandPolicy.matchingPackages("Calculator and send money",apps).isEmpty())
        assertFalse(PocketCommandPolicy.valid("device.ui.tap",""))
        assertFalse(PocketCommandPolicy.valid("open","a\nb"))
        assertFalse(PocketCommandPolicy.valid("home","ignored argument"))
    }
    @Test fun singleFlightRejectsConcurrentCommandsAndAllowsNextAfterCompletion() {
        val lease=PocketCommandLease(); val start=CountDownLatch(1); val done=CountDownLatch(16); val winners=AtomicInteger()
        repeat(16) { Thread { start.await(); if(lease.acquire())winners.incrementAndGet();done.countDown() }.start() }
        start.countDown();done.await();assertEquals(1,winners.get())
        lease.release();assertTrue(lease.acquire());assertFalse(lease.acquire())
    }
}
