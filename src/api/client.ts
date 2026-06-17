import { SiweClient } from "../auth/siweClient";
import { getConfig } from "../util/config";

export class ApiClient {
  constructor(private siwe: SiweClient) {}

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${getConfig().backendUrl}${path}`;
    const headers = (init.headers as Record<string, string>) || {};
    let jwt = "";
    if (headers["Authorization"] === undefined) {
      try {
        jwt = await this.siwe.getJwt();
      } catch (e) {
        // ignore SIWE failure if we have no wallet or if backend offline, caller might handle it
      }
    }
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: headers["Authorization"] || (jwt ? `Bearer ${jwt}` : ""),
        ...headers,
      },
    });
    if (res.status === 401 && !headers["Authorization"]) {
      const fresh = await this.siwe.getJwt(true);
      return fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fresh}`,
          ...headers,
        },
      });
    }
    return res;
  }
}
