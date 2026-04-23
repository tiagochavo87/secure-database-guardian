import React, { createContext, useContext, useState } from "react";
import { MOCK_VERSIONS, DataVersion } from "@/data/mockData";

interface VersionContextType {
  versions: DataVersion[];
  selectedVersionId: string;
  setSelectedVersionId: (id: string) => void;
  addVersion: (version: DataVersion) => void;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const [versions, setVersions] = useState<DataVersion[]>(MOCK_VERSIONS);
  const [selectedVersionId, setSelectedVersionId] = useState(MOCK_VERSIONS[MOCK_VERSIONS.length - 1].id);

  const addVersion = (version: DataVersion) => {
    setVersions((prev) => [...prev, version]);
    setSelectedVersionId(version.id);
  };

  return (
    <VersionContext.Provider value={{ versions, selectedVersionId, setSelectedVersionId, addVersion }}>
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  const ctx = useContext(VersionContext);
  if (!ctx) throw new Error("useVersion must be used within VersionProvider");
  return ctx;
}
