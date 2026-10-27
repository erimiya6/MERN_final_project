/**
 * Data Sanitization & Contact Privacy Utilities
 */

/**
 * Escapes characters in user input to prevent regular expression injection.
 * @param {string} string 
 * @returns {string} Escaped string safe for new RegExp
 */
function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes a user profile/contact object based on their contactPreference
 * and viewer's authorization level.
 * 
 * Rules:
 * - If viewer is Owner or Admin: full contact details are accessible.
 * - If viewer is guest or general user:
 *    - contactPreference === 'phone' -> expose phone, hide email
 *    - contactPreference === 'email' -> expose email, hide phone
 *    - contactPreference === 'in_app' (default) -> hide both email and phone
 * 
 * @param {Object} userDoc - Mongoose user doc or plain user object
 * @param {Boolean} isAuthorized - true if viewer is the owner or staff/admin
 * @returns {Object} Cleaned safe user representation
 */
function sanitizeContactInfo(userDoc, isAuthorized = false) {
  if (!userDoc) return null;
  const user = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };

  // Never leak password hashes or reset tokens under any circumstances
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;

  if (isAuthorized) {
    return user;
  }

  const preference = user.contactPreference || 'in_app';

  if (preference === 'in_app') {
    delete user.phone;
    delete user.email;
  } else if (preference === 'email') {
    delete user.phone;
  } else if (preference === 'phone') {
    delete user.email;
  }

  return user;
}

module.exports = {
  escapeRegex,
  sanitizeContactInfo,
};
