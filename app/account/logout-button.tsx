"use client";

export default function LogoutButton() {
  async function logout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ returnTo: "/" }),
    });
    const data = await response.json() as { returnTo?: string };
    window.location.href = data.returnTo || "/";
  }
  return <button type="button" className="secondary" onClick={logout}>退出登录</button>;
}
