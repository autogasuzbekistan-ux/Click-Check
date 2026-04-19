/**
 * Role hierarchy and permission helpers.
 *
 * Roles (lowest → highest): user → operator → admin
 * - user:     can send receipts, confirm their own
 * - operator: can confirm any receipt, view reports
 * - admin:    full access + role management
 */

const ROLES = { user: 0, operator: 1, admin: 2 };

function hasRole(userRole, requiredRole) {
  return (ROLES[userRole] ?? 0) >= (ROLES[requiredRole] ?? 0);
}

function isAdmin(role) {
  return role === 'admin';
}

function isOperatorOrAbove(role) {
  return hasRole(role, 'operator');
}

module.exports = { hasRole, isAdmin, isOperatorOrAbove, ROLES };
