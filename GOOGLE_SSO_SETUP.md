# Google SSO Setup Guide

This guide will walk you through setting up Google Single Sign-On (SSO) for your Phine application using NextAuth.js.

## Prerequisites

- A Google Cloud Platform (GCP) account
- Access to Google Cloud Console
- Your application running locally or deployed

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter a project name (e.g., "Phine App")
5. Click **"Create"**
6. Wait for the project to be created and select it

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"** or **"Google Identity"**
3. Click on **"Google+ API"** (or **"Google Identity"**)
4. Click **"Enable"**

**Note:** Google+ API is being deprecated. You can also use **"Google Identity Services"** which is the newer approach, but NextAuth.js v4 works with Google+ API.

## Step 3: Configure OAuth Consent Screen

1. In Google Cloud Console, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace account, then you can use "Internal")
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: Phine (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the **"Scopes"** page, click **"Add or Remove Scopes"**
   - Add the following scopes:
     - `email`
     - `profile`
     - `openid`
7. Click **"Update"**, then **"Save and Continue"**
8. On the **"Test users"** page (if in testing mode):
   - Add your email address as a test user
   - Click **"Save and Continue"**
9. Review and click **"Back to Dashboard"**

## Step 4: Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, select **"Web application"** as the application type
5. Fill in the form:
   - **Name**: Phine Web Client (or any name you prefer)
   - **Authorized JavaScript origins**:
     - For local development: `http://localhost:3000`
     - For production: Your production URL (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - For local development: `http://localhost:3000/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`
6. Click **"Create"**
7. **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately
   - You won't be able to see the Client Secret again after closing this dialog
   - If you lose it, you'll need to create new credentials

## Step 5: Configure Environment Variables

1. Create or update your `.env.local` file in the root of your project (same directory as `package.json`)

2. Add the following environment variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string_here
```

### Generating NEXTAUTH_SECRET

You can generate a secure random secret using one of these methods:

**Option 1: Using OpenSSL (recommended)**
```bash
openssl rand -base64 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3: Online Generator**
Visit: https://generate-secret.vercel.app/32

### Example `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_here

# Other environment variables...
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Step 6: Update Production URLs (When Deploying)

When you deploy your application to production:

1. Go back to Google Cloud Console → **"APIs & Services"** → **"Credentials"**
2. Click on your OAuth 2.0 Client ID
3. Add your production URLs:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/api/auth/callback/google`
4. Update your production environment variables:
   - `NEXTAUTH_URL=https://yourdomain.com`

## Step 7: Test the Integration

1. Make sure your `.env.local` file is configured correctly
2. Restart your development server:
   ```bash
   yarn dev
   ```
3. Navigate to `http://localhost:3000`
4. Click the **"Sign in with Google"** button
5. You should be redirected to Google's sign-in page
6. After signing in, you should be redirected back to your app

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Solution**: Make sure the redirect URI in Google Cloud Console exactly matches `http://localhost:3000/api/auth/callback/google` (including the protocol and port)

### Error: "invalid_client"
- **Solution**: Check that your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct and copied without extra spaces

### Error: "NEXTAUTH_SECRET is not set"
- **Solution**: Make sure `NEXTAUTH_SECRET` is set in your `.env.local` file

### OAuth consent screen shows "This app isn't verified"
- **Solution**: This is normal for apps in development/testing mode. You can:
  - Add test users in the OAuth consent screen settings
  - Or publish your app (requires verification for production use)

### Session not persisting
- **Solution**: Make sure `NEXTAUTH_URL` is set correctly and matches your application URL

## Security Best Practices

1. **Never commit `.env.local` to version control**
   - It's already in `.gitignore`, but double-check

2. **Use different credentials for development and production**
   - Create separate OAuth clients for each environment

3. **Rotate secrets regularly**
   - Change `NEXTAUTH_SECRET` periodically
   - Regenerate OAuth credentials if compromised

4. **Limit OAuth scopes**
   - Only request the scopes you actually need

5. **Use HTTPS in production**
   - OAuth requires HTTPS for production (localhost is an exception)

## Next Steps

After setting up Google SSO, you can:
- Access user session data using `useSession()` hook
- Protect routes by checking authentication status
- Store user information in your database
- Customize the user experience based on authentication state

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

