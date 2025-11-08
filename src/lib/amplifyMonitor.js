import { Amplify } from 'aws-amplify';
import { record } from '@aws-amplify/analytics';

Amplify.configure({
  Analytics: {
    disabled: false,
    autoSessionRecord: true,
  },
});

export function trackEvent(name, attributes = {}) {
  try {
    record({ name, attributes });
  } catch (error) {
    console.error('Analytics tracking failed', error);
  }
}
