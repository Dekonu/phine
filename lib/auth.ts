import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getSupabaseServer } from "./supabase-server";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !user.email) {
        return false;
      }

      try {
        const supabase = getSupabaseServer();
        const provider = account.provider;
        const providerId = account.providerAccountId;

        // Check if user exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, last_login")
          .eq("provider", provider)
          .eq("provider_id", providerId)
          .single();

        if (existingUser) {
          // Update last login
          await supabase
            .from("users")
            .update({
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              // Update name and image if they changed
              name: user.name || null,
              image: user.image || null,
            })
            .eq("id", existingUser.id);
        } else {
          // Create new user
          const { data: newUser, error } = await supabase
            .from("users")
            .insert({
              email: user.email,
              name: user.name || null,
              image: user.image || null,
              provider: provider,
              provider_id: providerId,
              last_login: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (error) {
            console.error("Error creating user:", error);
            return false;
          }
        }
      } catch (error) {
        console.error("Error in signIn callback:", error);
        // Allow sign in even if database operation fails
        return true;
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.dbUserId) {
        session.user.id = token.dbUserId as string;
        session.user.dbId = token.dbUserId as string;
      }
      if (token.provider) {
        session.user.provider = token.provider as string;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        try {
          const supabase = getSupabaseServer();
          const provider = account.provider;
          const providerId = account.providerAccountId;

          // Get user from database
          const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("provider", provider)
            .eq("provider_id", providerId)
            .single();

          if (dbUser) {
            token.dbUserId = dbUser.id;
            token.provider = provider;
          }
        } catch (error) {
          console.error("Error fetching user from database:", error);
        }

        token.accessToken = account.access_token;
      }

      return token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

