// Who runs this copy of Nutrily, for the privacy policy. Set these where the app is built (a .env file, or the Vercel
// project's environment variables). They are public: they appear in the policy.
//   VITE_OPERATOR_NAME   the person or business that runs it, for example "Alex Smith"
//   VITE_CONTACT_EMAIL   where people can send privacy questions and requests
// Control characters, spaces and the characters that could change the meaning of an address are not allowed anywhere.
const EMAIL = /^[^\s\u0000-\u001f\u007f@<>()[\]\\,;:"]+@[^\s\u0000-\u001f\u007f@<>()[\]\\,;:"]+\.[^\s\u0000-\u001f\u007f@<>()[\]\\,;:"]+$/;

// `env` is import.meta.env in the app; a plain object in tests. Anything that does not look right is treated as not set.
// An email that is not valid is rejected as it is, never "cleaned up" into some other address.
export function resolveLegalConfig(env = {}) {
  const name = typeof env.VITE_OPERATOR_NAME === 'string' ? env.VITE_OPERATOR_NAME.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80) : '';
  const email = typeof env.VITE_CONTACT_EMAIL === 'string' ? env.VITE_CONTACT_EMAIL.trim() : '';
  return { operator: name, email: email.length <= 120 && EMAIL.test(email) ? email : '' };
}

// Read the two values by name, the same way the rest of the app reads its settings.
export const legalConfig = resolveLegalConfig({
  VITE_OPERATOR_NAME: import.meta.env?.VITE_OPERATOR_NAME,
  VITE_CONTACT_EMAIL: import.meta.env?.VITE_CONTACT_EMAIL,
});
