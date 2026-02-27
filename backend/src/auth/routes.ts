import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import axios from 'axios';
import rateLimit from 'express-rate-limit';

import { generateEmojiId, generateUniqueEmojiId, isValidEmojiId, isEmojiIdTaken } from './emoji-id';
import { hashIcalUrl, verifyIcalUrl, isPlausibleIcalUrl } from './credentials';
import { generateRecoveryCodes, storeRecoveryCodes, consumeRecoveryCode, remainingRecoveryCodes } from './recovery';
import { createSession, validateSession, deleteSession } from './session';
import { isSafeToFetch } from './url-validation';

const COOKIE_NAME = 'ca_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week in ms
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 signups per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this address. Please try again later.' },
});

export function createAuthRouter(pool: Pool): Router {
  const router = Router();

  /**
   * GET /auth/suggest?count=N
   * Returns one or more suggested unique Emoji IDs for the signup form.
   * count defaults to 1, max 5. Deduplicates within the batch.
   */
  router.get('/suggest', async (req: Request, res: Response) => {
    const raw = parseInt(req.query.count as string, 10);
    const count = Number.isFinite(raw) && raw >= 1 ? Math.min(raw, 5) : 1;

    try {
      const suggestions: string[] = [];
      const seen = new Set<string>();
      const maxAttempts = count * 10; // generous retry budget
      let attempts = 0;

      while (suggestions.length < count && attempts < maxAttempts) {
        attempts++;
        const id = generateEmojiId();
        if (seen.has(id)) continue;

        // Check database uniqueness
        const { rows } = await pool.query(
          'SELECT 1 FROM users WHERE emoji_id = $1',
          [id]
        );
        if (rows.length === 0) {
          seen.add(id);
          suggestions.push(id);
        }
      }

      if (suggestions.length === 0) {
        return res.status(503).json({ error: 'Could not generate Emoji ID' });
      }

      // Return single string for count=1 (backwards compatible), array otherwise
      if (count === 1) {
        res.json({ emojiId: suggestions[0] });
      } else {
        res.json({ suggestions });
      }
    } catch (err) {
      res.status(503).json({ error: 'Could not generate Emoji ID' });
    }
  });

  /**
   * POST /auth/signup
   * Body: { emojiId?: string, icalUrl: string }
   */
  router.post('/signup', signupLimiter, async (req: Request, res: Response) => {
    const { emojiId: requestedId } = req.body;
    const icalUrl = typeof req.body.icalUrl === 'string' ? req.body.icalUrl.trim() : req.body.icalUrl;

    if (!icalUrl || !isPlausibleIcalUrl(icalUrl)) {
      return res.status(400).json({ error: 'Invalid iCal URL' });
    }

    if (!(await isSafeToFetch(icalUrl))) {
      return res.status(400).json({ error: 'URL is not allowed' });
    }

    try {
      const response = await axios.get(icalUrl, { timeout: 5000 });
      const contentType = response.headers['content-type'] ?? '';
      const body = typeof response.data === 'string' ? response.data : '';
      const looksLikeICal = contentType.includes('calendar') || body.startsWith('BEGIN:VCALENDAR');
      if (!looksLikeICal) {
        return res.status(400).json({ error: 'URL does not appear to be an iCal feed' });
      }
    } catch {
      return res.status(400).json({ error: 'Could not fetch iCal URL — is it publicly accessible?' });
    }

    let emojiId: string;
    if (requestedId) {
      if (!isValidEmojiId(requestedId)) {
        return res.status(400).json({ error: 'Invalid Emoji ID format' });
      }
      if (await isEmojiIdTaken(pool, requestedId)) {
        return res.status(409).json({ error: 'Emoji ID already taken' });
      }
      emojiId = requestedId;
    } else {
      try {
        emojiId = await generateUniqueEmojiId(pool);
      } catch {
        return res.status(503).json({ error: 'Could not generate Emoji ID' });
      }
    }

    const { hash: icalHash, salt: icalSalt } = hashIcalUrl(icalUrl);

    const { rows } = await pool.query(
      `INSERT INTO users (emoji_id, ical_hash, ical_salt)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [emojiId, icalHash, icalSalt]
    );
    const userId: string = rows[0].id;

    const codes = generateRecoveryCodes();
    await storeRecoveryCodes(pool, userId, codes);

    const token = await createSession(pool, userId);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(201).json({
      emojiId,
      recoveryCodes: codes.map(c => c.plain),
      message: 'Store these recovery codes somewhere safe. They cannot be retrieved again.',
    });
  });

  /**
   * POST /auth/signin
   * Body: { emojiId: string, icalUrl: string }
   */
  router.post('/signin', authLimiter, async (req: Request, res: Response) => {
    const emojiId = typeof req.body.emojiId === 'string' ? req.body.emojiId.trim() : req.body.emojiId;
    const icalUrl = typeof req.body.icalUrl === 'string' ? req.body.icalUrl.trim() : req.body.icalUrl;

    if (!emojiId || !icalUrl) {
      return res.status(400).json({ error: 'Emoji ID and iCal URL are required' });
    }

    if (!isValidEmojiId(emojiId)) {
      return res.status(400).json({ error: 'Invalid Emoji ID format' });
    }

    const { rows } = await pool.query(
      'SELECT id, ical_hash, ical_salt FROM users WHERE emoji_id = $1',
      [emojiId]
    );

    if (rows.length === 0) {
      hashIcalUrl(icalUrl);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = verifyIcalUrl(icalUrl, { hash: user.ical_hash, salt: user.ical_salt });

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await createSession(pool, user.id);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ emojiId });
  });

  /**
   * POST /auth/recover
   * Body: { emojiId: string, recoveryCode: string, newIcalUrl?: string }
   */
  router.post('/recover', authLimiter, async (req: Request, res: Response) => {
    const emojiId = typeof req.body.emojiId === 'string' ? req.body.emojiId.trim() : req.body.emojiId;
    const recoveryCode = typeof req.body.recoveryCode === 'string' ? req.body.recoveryCode.trim() : req.body.recoveryCode;
    const newIcalUrl = typeof req.body.newIcalUrl === 'string' ? req.body.newIcalUrl.trim() : req.body.newIcalUrl;

    if (!emojiId || !recoveryCode) {
      return res.status(400).json({ error: 'Emoji ID and recovery code are required' });
    }

    if (!isValidEmojiId(emojiId)) {
      return res.status(400).json({ error: 'Invalid Emoji ID format' });
    }

    const { rows } = await pool.query(
      'SELECT id FROM users WHERE emoji_id = $1',
      [emojiId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userId: string = rows[0].id;
    const valid = await consumeRecoveryCode(pool, userId, recoveryCode);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid or already-used recovery code' });
    }

    if (newIcalUrl) {
      if (!isPlausibleIcalUrl(newIcalUrl)) {
        return res.status(400).json({ error: 'Invalid iCal URL' });
      }
      const { hash, salt } = hashIcalUrl(newIcalUrl);
      await pool.query(
        'UPDATE users SET ical_hash = $1, ical_salt = $2 WHERE id = $3',
        [hash, salt, userId]
      );
    }

    const remaining = await remainingRecoveryCodes(pool, userId);
    const token = await createSession(pool, userId);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.json({
      emojiId,
      remainingRecoveryCodes: remaining,
      ...(remaining === 0 && {
        warning: 'You have used all your recovery codes. Please contact support.',
      }),
    });
  });

  /**
   * POST /auth/signout
   */
  router.post('/signout', async (req: Request, res: Response) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      await deleteSession(pool, token);
    }
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  });

  /**
   * GET /auth/me
   * Returns the current session's Emoji ID, or 401.
   */
  router.get('/me', async (req: Request, res: Response) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const session = await validateSession(pool, token);
    if (!session) return res.status(401).json({ error: 'Session expired' });

    res.json({ emojiId: session.emojiId });
  });

  return router;
}
