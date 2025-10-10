import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('❌ GOOGLE_CLIENT_ID not set in environment variables!');
      return null;
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
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
