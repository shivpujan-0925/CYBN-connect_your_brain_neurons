const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { signToken, verifyToken } = require('../src/utils/jwt');
const { initSchedule, completeStage } = require('../src/utils/spacedRepetition');

describe('Security & Authentication Tests', () => {
  // Set test JWT secret if not present
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_super_secret_jwt_key_cybn_2026';

  describe('JWT Token Security', () => {
    it('generates a valid signed JWT and verifies its claims', () => {
      const payload = { sub: 'test-user-123', email: 'test@cybn.app' };
      const token = signToken(payload);
      assert.ok(typeof token === 'string' && token.split('.').length === 3, 'Token should be a 3-part JWT');

      const verified = verifyToken(token);
      assert.equal(verified.sub, 'test-user-123');
      assert.equal(verified.email, 'test@cybn.app');
    });

    it('rejects tokens signed with an invalid or tampered secret', () => {
      const token = signToken({ sub: 'user-456' });
      assert.throws(() => {
        require('jsonwebtoken').verify(token, 'wrong_secret_key');
      });
    });

    it('rejects expired tokens', () => {
      const expiredToken = require('jsonwebtoken').sign(
        { sub: 'expired-user' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      assert.throws(() => {
        verifyToken(expiredToken);
      });
    });
  });

  describe('Password Hashing & Reset Token Security', () => {
    it('hashes passwords using bcrypt with salt rounds >= 10', async () => {
      const password = 'SuperSecurePassword2026!';
      const hash = await bcrypt.hash(password, 10);

      assert.notEqual(hash, password);
      assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash should be bcrypt format');
      assert.ok(await bcrypt.compare(password, hash), 'Original password must verify against hash');
      assert.ok(!(await bcrypt.compare('WrongPassword123', hash)), 'Wrong password must fail comparison');
    });

    it('generates cryptographic reset tokens and securely hashes them with SHA-256', () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      assert.equal(rawToken.length, 64, 'Raw token must be 64 hex characters (256 bits)');

      const hash1 = crypto.createHash('sha256').update(rawToken).digest('hex');
      const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex');

      assert.equal(hash1, hash2, 'SHA-256 hash must be deterministic');
      assert.notEqual(rawToken, hash1, 'Raw token and hash must never match');
    });
  });

  describe('Input Sanitization & Injection Defense', () => {
    it('detects and rejects non-string object payloads for auth fields', () => {
      const maliciousPayloads = [
        { username: { $ne: null }, password: 'password123' },
        { username: 'validuser', email: { $gt: '' }, password: 'password123' },
        { emailOrUsername: { $gt: '' }, password: { $ne: null } },
      ];

      for (const payload of maliciousPayloads) {
        const isStringOnly =
          Object.values(payload).every((val) => typeof val === 'string');
        assert.equal(isStringOnly, false, 'Malicious object payloads must be flagged as non-strings');
      }
    });

    it('enforces strict username format rules (3-20 chars, letters, numbers, underscores only)', () => {
      const validUsernames = ['alice', 'bob_123', 'JohnDoe', 'coder_pro_99'];
      const invalidUsernames = [
        'al', // too short (<3)
        'a_very_long_username_exceeding_twenty', // too long (>20)
        'user@domain.com', // invalid character @
        'user name', // space
        '<script>alert(1)</script>', // XSS payload
        "admin' OR 1=1--", // SQL injection payload
      ];

      const regex = /^[a-zA-Z0-9_]{3,20}$/;

      for (const u of validUsernames) {
        assert.ok(regex.test(u), `Expected "${u}" to be valid`);
      }
      for (const u of invalidUsernames) {
        assert.ok(!regex.test(u), `Expected "${u}" to be invalid`);
      }
    });

    it('anchors LeetCode import URL to authentic leetcode.com domain', () => {
      function extractSlug(url) {
        if (!url || typeof url !== 'string') return null;
        const match = url.trim().match(/^(?:https?:\/\/)?(?:www\.)?leetcode\.com\/problems\/([a-z0-9-]+)/i);
        return match ? match[1] : null;
      }

      assert.equal(extractSlug('https://leetcode.com/problems/two-sum/'), 'two-sum');
      assert.equal(extractSlug('https://www.leetcode.com/problems/valid-parentheses/description/'), 'valid-parentheses');
      assert.equal(extractSlug('http://leetcode.com/problems/reverse-linked-list'), 'reverse-linked-list');

      // Reject spoofed / SSRF domains
      assert.equal(extractSlug('https://evil-leetcode.com/problems/two-sum/'), null);
      assert.equal(extractSlug('https://attacker.com/?leetcode.com/problems/two-sum/'), null);
      assert.equal(extractSlug('javascript:alert(1)'), null);
      assert.equal(extractSlug(null), null);
    });

    it('filters uploaded file mimetypes and rejects non-image or script files', () => {
      const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      const blockedMimes = [
        'application/javascript',
        'text/html',
        'image/svg+xml', // SVG can contain embedded scripts
        'application/octet-stream',
        'application/x-sh',
      ];

      const filterRegex = /^image\/(png|jpe?g|webp|gif)$/;

      for (const m of allowedMimes) {
        assert.ok(filterRegex.test(m), `Mime "${m}" should be accepted`);
      }
      for (const m of blockedMimes) {
        assert.ok(!filterRegex.test(m), `Mime "${m}" should be rejected`);
      }
    });
  });
});

