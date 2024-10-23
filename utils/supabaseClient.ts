const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

import { createClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    Clerk: {
      session?: {
        getToken: (options: { template: string }) => Promise<string>;
      };
    };
  }
}

function createClerkSupabaseClient() {
  console.log("Creating Supabase client...");
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        console.log("Fetching with Clerk token...");
        const clerkToken = await window.Clerk.session?.getToken({
          template: "supabase",
        });
        console.log("Clerk token obtained:", clerkToken ? "Yes" : "No");

        const headers = new Headers(options?.headers);
        headers.set("Authorization", `Bearer ${clerkToken}`);

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });
  console.log("Supabase client created successfully");
  return client;
}

export const client = createClerkSupabaseClient();
