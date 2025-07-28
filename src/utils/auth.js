// src/utils/auth.js

export function isTokenValid() {
  const token = localStorage.getItem("accessToken");
  if (!token) return false;

  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const expiry = payload.exp;

    if (!expiry) return false;

    const now = Math.floor(Date.now() / 1000);
    return expiry > now;
  } catch (error) {
    console.error("Invalid JWT:", error);
    return false;
  }
}
