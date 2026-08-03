"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const search = useSearchParams();
  const returnTo = search.get("returnTo") || "/account";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: form.get("displayName"),
        email: form.get("email"),
        password: form.get("password"),
        returnTo,
      }),
    });
    const data = await response.json() as { error?: string; returnTo?: string };
    if (!response.ok) {
      setError(data.error || "操作失败，请稍后再试");
      setBusy(false);
      return;
    }
    window.location.href = data.returnTo || "/account";
  }

  return <main className="login-page"><section className="login-card"><Link href="/" className="brand"><span className="brand-mark">角</span><span><b>未来仕角</b><small>智慧导医服务</small></span></Link><span className="eyebrow">用户体系</span><h1>{mode === "login" ? "登录个人中心" : "创建患者账号"}</h1><p>保存导诊记录，方便下次查看。账号数据存储于独立数据库。</p><form onSubmit={submit}>{mode === "register" && <label>姓名或昵称<input name="displayName" autoComplete="name" minLength={2} maxLength={40} required /></label>}<label>邮箱<input name="email" type="email" autoComplete="email" required /></label><label>密码<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={128} required /></label>{error && <div className="form-error">{error}</div>}<button className="primary wide" disabled={busy}>{busy ? "请稍候…" : mode === "login" ? "登录" : "注册并登录"}</button></form><button className="mode-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "还没有账号？立即注册" : "已有账号？返回登录"}</button><p className="safe-note center">演示系统不采集身份证、病历或支付信息；请勿输入真实敏感医疗信息。</p></section></main>;
}
