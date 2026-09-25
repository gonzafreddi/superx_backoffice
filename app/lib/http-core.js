export function createAuthFetch({ fetchImpl, getSession, setSession, clearSession, refreshUrl }) {
  let refreshPromise = null;

  async function refresh() {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const session = getSession();
        if (!session.refreshToken) return false;
        const response = await fetchImpl(refreshUrl(), {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        const payload = await response.json().catch(() => undefined);
        if (!response.ok || !payload || typeof payload !== "object" || typeof payload.accessToken !== "string" || typeof payload.refreshToken !== "string") {
          clearSession();
          return false;
        }
        setSession(payload);
        return true;
      })().catch(() => {
        clearSession();
        return false;
      }).finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

  return async function authFetch(input, init) {
    // Rebuild from the original input/init on every attempt so the (string)
    // body can be re-sent after a refresh without cloning request streams.
    const send = () => {
      const headers = new Headers(init?.headers);
      const token = getSession().accessToken;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetchImpl(input, { ...init, headers });
    };
    const response = await send();
    if (response.status !== 401 || !(await refresh())) return response;
    return send();
  };
}
