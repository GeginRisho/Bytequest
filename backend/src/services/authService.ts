import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/db';
import env from '../config/env';
import logger from '../config/logger';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  public static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  public static async registerSession(userId: string, token: string, fingerprint?: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
    
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        deviceFingerprint: fingerprint,
        expiresAt,
      },
    });
  }

  public static async revokeSession(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
      await prisma.refreshToken.delete({
        where: { tokenHash },
      });
    } catch (err: any) {
      logger.warn(`Session revocation warn: Token not found or already deleted.`);
    }
  }

  public static async rotateTokens(oldRefreshToken: string, fingerprint?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
    
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      if (tokenRecord) {
        await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      }
      throw new Error('Refresh token expired or revoked');
    }

    // Verify token structure
    let payload: TokenPayload;
    try {
      payload = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (err) {
      await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens (token rotation)
    const newAccessToken = this.generateAccessToken({ userId: payload.userId, email: payload.email, role: payload.role });
    const newRefreshToken = this.generateRefreshToken({ userId: payload.userId, email: payload.email, role: payload.role });

    // Transactionally update database token records
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: tokenRecord.id } }),
      prisma.refreshToken.create({
        data: {
          userId: payload.userId,
          tokenHash: crypto.createHash('sha256').update(newRefreshToken).digest('hex'),
          deviceFingerprint: fingerprint,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public static generateOTP(): { code: string; expiresAt: Date } {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return { code, expiresAt };
  }
}
export default AuthService;
