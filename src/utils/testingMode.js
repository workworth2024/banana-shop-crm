// Hides in-progress features (currently: the Blog section) from regular CRM users.
// Only visible/reachable when the URL has `?param=testing` — not a security boundary,
// just keeps it out of sight while it's being tested. The backend still enforces real
// auth/role checks on every admin endpoint.
import { useLocation } from 'react-router-dom';

export const TESTING_PARAM = 'param';
export const TESTING_VALUE = 'testing';

export const isTestingMode = (search = '') => {
  try {
    return new URLSearchParams(search).get(TESTING_PARAM) === TESTING_VALUE;
  } catch {
    return false;
  }
};

export const useTestingMode = () => {
  const { search } = useLocation();
  return isTestingMode(search);
};

export const withTestingParam = (path) => `${path}${path.includes('?') ? '&' : '?'}${TESTING_PARAM}=${TESTING_VALUE}`;
