const normalize = (role) => (role ? String(role).toLowerCase() : 'viewer');

export const ROLE_ORDER = ['viewer', 'member', 'admin', 'owner'];

export const hasRole = (role, allowed = []) => {
  const normalized = normalize(role);
  if (!allowed || allowed.length === 0) return true;
  return allowed.map((item) => normalize(item)).includes(normalized);
};

export const canView = (role, section) => {
  const normalized = normalize(role);
  if (section === 'admin' || section === 'api' || section === 'security') {
    return normalized === 'admin' || normalized === 'owner';
  }
  if (section === 'branding') {
    return normalized === 'admin' || normalized === 'owner';
  }
  if (
    section === 'analytics' ||
    section === 'finance' ||
    section === 'till' ||
    section === 'marketplace' ||
    section === 'marketing' ||
    section === 'growth' ||
    section === 'partners' ||
    section === 'affiliates'
  ) {
    return normalized !== 'viewer';
  }
  return normalized !== 'viewer';
};

export const canEdit = (role) => {
  const normalized = normalize(role);
  return normalized === 'admin' || normalized === 'owner';
};

export const canManage = (role) => normalize(role) === 'owner';

export const describeRole = (role) => {
  const normalized = normalize(role);
  switch (normalized) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'member':
      return 'Member';
    default:
      return 'Viewer';
  }
};
