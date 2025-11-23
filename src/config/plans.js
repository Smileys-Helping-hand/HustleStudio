export const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    description: 'Launch a workspace with essentials for small teams.',
    limits: { users: 3, items: 100, storageGb: 2 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    description: 'Unlock automation, analytics, and higher inventory caps.',
    limits: { users: 10, items: 1000, storageGb: 15 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    description: 'Scale with advanced collaboration and unlimited inventory.',
    limits: { users: 50, items: Infinity, storageGb: 200 },
  },
];

export const planLookup = plans.reduce((acc, plan) => {
  acc[plan.id] = plan;
  return acc;
}, {});

export const formatPlanPrice = (planId) => {
  const plan = planLookup[planId];
  if (!plan) return 'Custom';
  if (!plan.price) return 'Free';
  return `R${plan.price.toLocaleString()}/mo`;
};
