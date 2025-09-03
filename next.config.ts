import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude Supabase functions from the build process
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Ignore Supabase functions directory during build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/supabase/functions/**'],
    };
    
    return config;
  },
};

export default nextConfig;
