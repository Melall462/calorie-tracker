// The decisions made by the delete-account Edge Function, kept free of Deno and network code so they can be tested with
// plain Node (see tests/delete-account.test.mjs). The function itself (index.ts) supplies the real checks.
//
//   user           the signed-in person, as the auth service reports them: { id, email }
//   password       what they typed to confirm
//   checkPassword  (email, password) => 'ok' | 'wrong' | 'limited' | 'unavailable'
//   deleteUser     (id) => true when the account is gone
//
// Returns { status, ok? , error? }. Nothing is deleted unless the password was checked and is right.
export async function deleteAccount({ user, password, checkPassword, deleteUser }) {
  if (!user || typeof user.id !== 'string' || user.id === '' || typeof user.email !== 'string' || user.email === '') {
    return { status: 401, error: 'Sign in again to delete your account.' };
  }
  if (typeof password !== 'string' || password === '' || password.length > 200) {
    return { status: 400, error: 'Enter your password to confirm.' };
  }
  const check = await checkPassword(user.email, password);
  if (check === 'limited') return { status: 429, error: 'Too many attempts. Wait a minute and try again.' };
  if (check === 'unavailable') return { status: 502, error: "Couldn't check your password right now. Nothing was deleted. Try again in a moment." };
  if (check !== 'ok') return { status: 403, error: 'That password is not right.' };
  const removed = await deleteUser(user.id);
  if (removed !== true) return { status: 500, error: "Your account couldn't be deleted. Nothing was changed, so try again in a moment." };
  return { status: 200, ok: true };
}
