# Google Sign-In Setup Guide

This guide walks you through setting up Google Sign-In for the Shader Playground application.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" at the top
3. Click "New Project"
4. Enter a project name (e.g., "Shader Playground")
5. Click "Create"

## Step 2: Configure OAuth Consent Screen

1. In the left sidebar, navigate to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Click "Create"
4. Fill in the required fields:
   - **App name**: FragCoder (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the Scopes page, click "Save and Continue" (no additional scopes needed)
7. On the Test users page (optional for development), add test email addresses
8. Click "Save and Continue"
9. Review and click "Back to Dashboard"

## Step 3: Create OAuth 2.0 Credentials

1. In the left sidebar, navigate to **APIs & Services** > **Credentials**
2. Click "+ CREATE CREDENTIALS" at the top
3. Select "OAuth client ID"
4. Choose "Web application" as the application type
5. Configure the OAuth client:
   - **Name**: Shader Playground Web Client
   - **Authorized JavaScript origins**:
     - For local development: `http://localhost:5173`
     - For production: Add your production domain (e.g., `https://yourapp.com`)
   - **Authorized redirect URIs**: (Leave empty for now, not needed for Google Sign-In)
6. Click "Create"
7. **Copy the Client ID** - you'll need this next!

## Step 4: Configure Your Application

1. In the `frontend` directory, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Google Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```

3. Save the file

## Step 5: Test the Integration

1. Start the development server (if not already running):
   ```bash
   npm run dev
   ```

2. Navigate to the shader editor page
3. Click the "Sign In" button in the top-right corner
4. The Google Sign-In popover should appear with the Google Sign-In button
5. Click the Google button to test authentication

## Troubleshooting

### "Google Sign-In not configured" Error

- Make sure you've created the `.env` file in the `frontend` directory
- Verify that `VITE_GOOGLE_CLIENT_ID` is set correctly
- Restart the development server after changing `.env` files

### "Google Identity Services not loaded" Error

- Check your internet connection
- Verify that the Google GSI script is loading in the browser's Network tab
- Clear your browser cache and reload

### "Unauthorized origin" Error

- Make sure `http://localhost:5173` is added to Authorized JavaScript origins
- If using a different port, update the authorized origins accordingly
- Changes to authorized origins take a few minutes to propagate

### "Sign-in popup blocked"

- Check if your browser is blocking popups
- Add an exception for your development domain

## Security Notes

### For Development
- The `.env` file contains sensitive credentials and is gitignored
- Never commit your `.env` file to version control
- Each developer should create their own `.env` file

### For Production
- Set `VITE_GOOGLE_CLIENT_ID` as an environment variable in your hosting platform
- Use different OAuth clients for development and production
- Regularly rotate credentials
- Publish your OAuth consent screen (move from Testing to Production) when ready

## Next Steps

After completing this setup, the Google Sign-In component is ready. The next phase will include:

1. Backend API integration to check if user exists
2. User account creation in the database
3. JWT token management for authenticated sessions
4. User state management in the frontend

## Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
