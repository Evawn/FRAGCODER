import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';

const client = new OAuth2Client(config.googleClientId);

export interface GoogleProfile {
  googleId: string;
  email: string;
}

/**
 * Verify Google OAuth token and extract user profile
 * @param token - Google credential token from frontend
 * @returns Google profile with googleId and email, or null if invalid
 */
export async function verifyGoogleToken(token: string): Promise<GoogleProfile | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      console.error('❌ Google token verification failed: No payload');
      return null;
    }

    // Validate required fields
    if (!payload.sub || !payload.email) {
      console.error('❌ Google token missing required fields (sub or email)');
      return null;
    }

    return {
      googleId: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    console.error('❌ Error verifying Google token:', error);
    return null;
  }
}
