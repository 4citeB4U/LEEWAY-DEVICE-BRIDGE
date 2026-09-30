import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = name => fs.readFileSync(new URL(`../apps/android/app/src/main/java/industries/leeway/devicebridge/${name}.kt`, import.meta.url), 'utf8');

test('phone conversations use supported native token budget and explicit cancellation before cleanup', () => {
  const model = source('ModelRuntime');
  assert.match(model, /generateBounded\(context, prompt, 128, 45000L, 4096\)/);
  assert.match(model, /ConversationConfig\(maxOutputToken = maxOutputTokens, automaticToolCalling = false\)/);
  assert.match(model, /sendMessageAsync\(prompt, maxOutputToken = maxOutputTokens\)/);
  assert.match(model, /withTimeout\(timeoutMs\)/);
  assert.match(model, /conversation\.cancelProcess\(\)/);
  assert.match(model, /failed\("MODEL_TIMEOUT"/);
  assert.match(model, /if \(!inferenceGuard.tryAcquire\(\)\) return failed\("MODEL_BUSY"\)/);
  assert.match(model, /finally\s*\{\s*inferenceGuard.release\(\)/);
  assert.match(source('PocketBridgeActivity'), /conversationRequest = true/);
  assert.match(source('PocketBridgeActivity'), /Preparing a short response/);
  assert.match(source('RemoteCommandRouter'), /if \(conversationRequest\) ModelRuntime.generateConversation/);
});
