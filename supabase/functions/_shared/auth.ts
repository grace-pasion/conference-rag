export async function verifySupabaseUser(
  request: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<boolean> {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (!token) {
    return false;
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return false;
  }

  if (!response.ok) {
    throw new Error(`Supabase Auth returned HTTP ${response.status}`);
  }

  const user = await response.json();
  return typeof user.id === "string";
}
