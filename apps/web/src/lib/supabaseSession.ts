export type SupabaseBrokerTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export async function fetchSupabaseBrokerToken(
  apiBaseUrl: string,
  backendAccessToken: string
): Promise<SupabaseBrokerTokenResponse> {
  const res = await fetch(`${apiBaseUrl}/api/auth/supabase-token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backendAccessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get Supabase broker token: ${res.status}`);
  }
  return (await res.json()) as SupabaseBrokerTokenResponse;
}

export function getBackendAccessToken(): string | null {
  return localStorage.getItem('access_token');
}
