import { desc, eq } from "drizzle-orm";
import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { getDb } from "../../db";
import { ensureUser } from "../../db/users";
import { triageRecords } from "../../db/schema";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const identity = await requireChatGPTUser("/account");
  const user = await ensureUser(identity);
  const records = await getDb().select().from(triageRecords).where(eq(triageRecords.userId, user.id)).orderBy(desc(triageRecords.createdAt)).limit(20);
  return <main className="account-page"><header className="account-top"><Link href="/" className="brand"><span className="brand-mark">角</span><span><b>未来仕角</b><small>智慧导医服务</small></span></Link><a href={chatGPTSignOutPath("/")} className="secondary">退出登录</a></header><section className="account-wrap"><div className="account-hero"><span className="eyebrow">个人中心</span><h1>您好，{user.displayName}</h1><p>{user.email} · 患者用户</p></div><div className="account-grid"><aside><div className="profile-avatar">{user.displayName.slice(0,1).toUpperCase()}</div><h3>{user.displayName}</h3><p>账号已通过平台身份验证</p><dl><dt>用户编号</dt><dd>FSJ-{String(user.id).padStart(6,"0")}</dd><dt>账号角色</dt><dd>{user.role === "patient" ? "患者" : user.role}</dd></dl></aside><section><div className="card-title"><b>我的导诊记录</b><Link href="/">发起新导诊 →</Link></div>{records.length ? records.map(r=><article className="record" key={r.id}><span>✦</span><div><b>{r.symptom}</b><p>建议科室：{r.recommendedDepartment}</p></div><small>{r.createdAt.slice(0,10)}</small></article>) : <div className="empty"><span>◇</span><h3>暂无导诊记录</h3><p>完成智能导诊后，可选择保存到个人中心。</p><Link href="/" className="primary">开始导诊</Link></div>}</section></div><p className="safe-note center">个人中心仅保存就医引导记录，不保存诊断结果或处方信息。</p></section></main>;
}
