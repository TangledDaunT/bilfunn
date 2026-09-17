export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { securityConfigurationErrors } = await import("./lib/env");
    const errors = securityConfigurationErrors();
    if (process.env.NODE_ENV === "production" && errors.length)
      throw new Error(`Invalid production configuration: ${errors.join(", ")}`);
  }
}
