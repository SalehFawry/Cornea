import { useState, useEffect, useMemo } from "react";
import type { Branch } from "../types";
import { listBranches } from "../api/branches";

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listBranches()
      .then((data) => { if (!cancelled) setBranches(Array.isArray(data) ? data : []); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const regions = useMemo(
    () => [...new Set((Array.isArray(branches) ? branches : []).map((b) => b.region).filter(Boolean))] as string[],
    [branches],
  );

  const areas = useMemo(
    () => [...new Set((Array.isArray(branches) ? branches : []).map((b) => b.area).filter(Boolean))] as string[],
    [branches],
  );

  const filteredBranches = (region: string | null, area: string | null) =>
    branches.filter(
      (b) =>
        (!region || b.region === region) &&
        (!area || b.area === area),
    );

  return { branches, regions, areas, filteredBranches, loading, error };
}
