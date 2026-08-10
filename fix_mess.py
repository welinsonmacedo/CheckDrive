import os

file_path = "src/modules/company/monitoring/hooks/useTracking.ts"
with open(file_path, "r") as f:
    content = f.read()

# First, let's remove ALL the bad insertions.
# The bad insertion starts with:
bad_block = """  // 6. Fetch Trips History List
  useEffect(() => {
    if (!companyId || !filters.date) return;
    let isMounted = true;
    setLoadingTripsHistory(true);
    fetchTripsList(companyId, filters.date).then(trips => {
      if (isMounted) {
        setTripsHistory(trips);
        setLoadingTripsHistory(false);
      }
    });
    return () => { isMounted = false; };
  }, [companyId, filters.date]);"""

content = content.replace(bad_block + "\n", "")

# Now insert it only at the very end before the last `return {`
# We'll split by `return {` and join back, inserting the effect only before the LAST one.

parts = content.rsplit("return {", 1)
if len(parts) == 2:
    parts[0] = parts[0] + bad_block + "\n  return {"
    content = "".join(parts)

with open(file_path, "w") as f:
    f.write(content)
