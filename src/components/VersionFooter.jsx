import React, { useEffect, useState } from 'react';

const VersionFooter = () => {
  const [version, setVersion] = useState('v-dev');

  useEffect(() => {
    let isMounted = true;
    fetch('/VERSION.txt')
      .then((response) => (response.ok ? response.text() : Promise.reject()))
      .then((text) => {
        if (!isMounted) return;
        const firstLine = text.split('\n')[0];
        setVersion(firstLine.trim());
      })
      .catch(() => {
        if (isMounted) setVersion('v-dev');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="mt-10 text-center text-xs text-white/40">
      Build {version} — {new Date().toLocaleString()}
    </footer>
  );
};

export default VersionFooter;
