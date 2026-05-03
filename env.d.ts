declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    DATABASE_URL: string

    // Clerk
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string
    CLERK_SECRET_KEY: string
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: string
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: string
    CLERK_WEBHOOK_SECRET: string

    // Stripe
    STRIPE_SECRET_KEY: string
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
    STRIPE_WEBHOOK_SECRET: string
    STRIPE_PRO_PRICE_ID: string
    STRIPE_ENTERPRISE_PRICE_ID: string

    // Resend
    RESEND_API_KEY: string
    RESEND_FROM_EMAIL: string

    // UploadThing
    UPLOADTHING_SECRET: string
    UPLOADTHING_APP_ID: string

    // App
    NEXT_PUBLIC_APP_URL: string
    CRON_SECRET: string

    // Admin panel (independent of Clerk)
    ADMIN_USERNAME: string
    ADMIN_PASSWORD: string
    ADMIN_SESSION_SECRET: string
  }
}
