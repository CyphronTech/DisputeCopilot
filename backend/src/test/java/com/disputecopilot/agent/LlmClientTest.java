package com.disputecopilot.agent;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** A model that wraps its JSON in fences or prose must not fail a whole case review. */
class LlmClientTest {

  @Test
  void returnsBarePayloadUnchanged() {
    assertEquals("{\"a\":1}", LlmClient.extractJsonObject("{\"a\":1}"));
  }

  @Test
  void stripsCodeFences() {
    assertEquals("{\"a\":1}", LlmClient.extractJsonObject("```json\n{\"a\":1}\n```"));
    assertEquals("{\"a\":1}", LlmClient.extractJsonObject("```\n{\"a\":1}\n```"));
  }

  @Test
  void stripsSurroundingProse() {
    assertEquals("{\"a\":1}", LlmClient.extractJsonObject("Here is the result:\n{\"a\":1}\nHope that helps!"));
  }

  @Test
  void keepsNestedObjects() {
    String nested = "{\"a\":{\"b\":2},\"c\":[{\"d\":3}]}";
    assertEquals(nested, LlmClient.extractJsonObject("```json" + nested + "```"));
  }

  @Test
  void passesThroughWhenThereIsNoObject() {
    assertEquals("not json at all", LlmClient.extractJsonObject("not json at all"));
    assertEquals("", LlmClient.extractJsonObject(null));
  }
}
