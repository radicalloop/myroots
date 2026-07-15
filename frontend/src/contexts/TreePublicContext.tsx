import { createContext, useContext } from 'react';

interface TreePublicContextValue {
  isPublic: boolean;
}

const TreePublicContext = createContext<TreePublicContextValue>({ isPublic: false });

export function TreePublicProvider({
  isPublic,
  children,
}: {
  isPublic: boolean;
  children: React.ReactNode;
}) {
  return (
    <TreePublicContext.Provider value={{ isPublic }}>
      {children}
    </TreePublicContext.Provider>
  );
}

export function useTreePublicContext(): TreePublicContextValue {
  return useContext(TreePublicContext);
}
