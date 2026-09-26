package com.disputecopilot.setup;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Encrypts the model provider's API key at rest (case_record/model_config never holds
 * plaintext secrets on disk). ponytail: a single app-wide AES key from config/env, not a
 * per-deployment KMS — fine for a single-tenant self-hosted box; upgrade to a KMS-backed
 * key if this ever runs multi-tenant.
 */
@Component
public class CryptoUtil {

  private static final int GCM_TAG_BITS = 128;
  private static final int IV_BYTES = 12;

  private final SecretKeySpec key;

  CryptoUtil(@Value("${app.secret-key}") String secret) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
      this.key = new SecretKeySpec(digest, "AES");
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  public String encrypt(String plaintext) {
    if (plaintext == null || plaintext.isBlank()) return plaintext;
    try {
      byte[] iv = new byte[IV_BYTES];
      new SecureRandom().nextBytes(iv);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
      byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
      byte[] combined = new byte[iv.length + ciphertext.length];
      System.arraycopy(iv, 0, combined, 0, iv.length);
      System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
      return Base64.getEncoder().encodeToString(combined);
    } catch (Exception e) {
      throw new IllegalStateException("Failed to encrypt secret", e);
    }
  }

  public String decrypt(String stored) {
    if (stored == null || stored.isBlank()) return stored;
    try {
      byte[] combined = Base64.getDecoder().decode(stored);
      byte[] iv = new byte[IV_BYTES];
      System.arraycopy(combined, 0, iv, 0, IV_BYTES);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
      byte[] plaintext = cipher.doFinal(combined, IV_BYTES, combined.length - IV_BYTES);
      return new String(plaintext, StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new IllegalStateException("Failed to decrypt secret", e);
    }
  }
}
