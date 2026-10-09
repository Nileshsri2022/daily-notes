export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_DOMAIN || "https://helped-beagle-7756.clerk.accounts.dev",
      applicationID: "convex",
    },
    {
      domain: "https://clerk.daily-notes-ruddy.vercel.app",
      applicationID: "convex",
    },
  ],
};
