import { Navigate } from 'react-router-dom';
import { useTestingMode } from '../utils/testingMode';

// Wraps routes that should only be reachable with ?param=testing in the URL
// (in-progress features we don't want regular CRM users stumbling onto yet).
const TestingGate = ({ children }) => {
  const testingMode = useTestingMode();
  if (!testingMode) return <Navigate to="/" replace />;
  return children;
};

export default TestingGate;
