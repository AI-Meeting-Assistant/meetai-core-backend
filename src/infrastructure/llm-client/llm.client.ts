/**
 * LLM Client
 *
 * Placeholder for the external LLM API integration layer.
 *
 * Responsibilities (to be implemented):
 *   - Wrap API calls to the configured LLM provider (e.g., Groq, OpenAI)
 *   - Handle post-meeting summary generation
 *   - Provide a consistent interface regardless of underlying provider
 *
 * Configuration will be read from environment variables:
 *   LLM_API_KEY  — Provider API key
 *   LLM_BASE_URL — Provider base URL (for provider-agnostic setup via OpenAI SDK)
 */
