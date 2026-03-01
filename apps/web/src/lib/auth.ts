import { api } from "./api";

export async function login(email: string, password: string) {
  return api.login(email, password);
}

export async function logout() {
  return api.logout();
}

export async function getCurrentUser() {
  return api.me();
}
