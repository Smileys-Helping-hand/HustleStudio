import { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import app, { auth, db } from '../lib/firebase.js';

const FirebaseContext = createContext({ app: null, auth: null, db: null });

export const FirebaseProvider = ({ children }) => {
  const value = useMemo(() => ({ app, auth, db }), []);

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

FirebaseProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useFirebase = () => useContext(FirebaseContext);
