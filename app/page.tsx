"use client";

import { useCallback, useEffect, useState } from "react";

type View = "home" | "triage" | "guide" | "departments" | "doctors" | "hospital" | "education" | "nearby" | "admin";

const services = [
  { id: "triage", icon: "✦", title: "智能导诊", sub: "描述症状，推荐科室", tone: "coral" },
  { id: "guide", icon: "⌁", title: "院内导航", sub: "查地点与行走路线", tone: "blue" },
  { id: "departments", icon: "＋", title: "科室介绍", sub: "特色专科与楼层", tone: "mint" },
  { id: "doctors", icon: "♙", title: "医生介绍", sub: "擅长方向与出诊时间", tone: "violet" },
  { id: "hospital", icon: "▥", title: "医院介绍", sub: "了解医院与就医流程", tone: "amber" },
  { id: "education", icon: "♡", title: "健康宣教", sub: "科学、易懂的健康知识", tone: "pink" },
] as const;

const fallbackDepartments = [
  { icon: "🫀", name: "心血管内科", floor: "门诊楼 3F", desc: "胸闷、心悸、高血压等相关疾病" },
  { icon: "🦴", name: "骨科", floor: "门诊楼 4F", desc: "骨关节、脊柱、运动损伤" },
  { icon: "🧠", name: "神经内科", floor: "门诊楼 3F", desc: "头痛、眩晕、肢体麻木" },
  { icon: "👶", name: "儿科", floor: "门诊楼 2F", desc: "儿童常见病与生长发育" },
];

const fallbackDoctors = [
  { name: "周明远", dept: "心血管内科", rank: "主任医师", skill: "冠心病、高血压及心律失常", time: "周一、周三上午", color: "#3a7d74" },
  { name: "林  悦", dept: "神经内科", rank: "副主任医师", skill: "头痛、眩晕与脑血管病", time: "周二、周四下午", color: "#795c5c" },
  { name: "陈思齐", dept: "骨科", rank: "主任医师", skill: "关节损伤、脊柱与运动医学", time: "周一、周五上午", color: "#536b8c" },
];

type Catalog = {
  hospital: { name: string; address: string };
  departments: typeof fallbackDepartments;
  doctors: typeof fallbackDoctors;
  locations: Array<{ id: string; name: string; building: string; floor: string; zone: string; description: string }>;
  knowledgeArticles: Array<{ id: string; category: string; title: string; summary: string; updatedAt?: string }>;
};

type AdminOverview = {
  masterData: { departments: number; doctors: number; publishedArticles: number };
  today: { serviceCount: number; triageCount: number; navigationCount: number; resolvedRate: number; transferCount: number } | null;
  trend: Array<{ metricDate: string; serviceCount: number }>;
  integration: { status: string };
};

const fallbackCatalog: Catalog = {
  hospital: { name: "安和市第一人民医院（演示）", address: "安和市健康路 1 号" },
  departments: fallbackDepartments,
  doctors: fallbackDoctors,
  locations: [
    { id: "lobby", name: "门诊大厅", building: "门诊楼", floor: "1F", zone: "", description: "办卡、咨询与自助服务" },
    { id: "cardio", name: "心血管内科", building: "门诊楼", floor: "3F", zone: "A 区", description: "2 号电梯到 3F 后左转" },
    { id: "lab", name: "检验科", building: "医技楼", floor: "2F", zone: "", description: "门诊采血与检验" },
    { id: "pharmacy", name: "药房", building: "门诊楼", floor: "1F", zone: "西侧", description: "门诊取药窗口" },
  ],
  knowledgeArticles: [
    { id: "heat", category: "季节健康", title: "夏季防暑的 6 个要点", summary: "补充水分、避免高温时段外出，识别中暑信号。" },
    { id: "bp", category: "慢病管理", title: "居家测量血压怎么做", summary: "测量前安静休息，规范姿势并记录趋势。" },
    { id: "wound", category: "术后护理", title: "出院后伤口观察指南", summary: "保持清洁干燥，关注红肿、渗液与发热。" },
    { id: "child", category: "儿童健康", title: "儿童发热家庭观察要点", summary: "关注精神状态、饮水和呼吸情况。" },
  ],
};

type CatalogPayload = { data: { hospital: Catalog["hospital"]; departments: Array<{ code: string; name: string; floor: string; zone: string; description: string }>; doctors: Array<{ name: string; departmentName: string; title: string; specialty: string; scheduleText: string; avatarColor: string }>; locations: Catalog["locations"]; knowledgeArticles: Catalog["knowledgeArticles"] } };

async function fetchCatalog(): Promise<Catalog | null> {
  const response = await fetch("/api/v1/catalog");
  if (!response.ok) return null;
  const payload = await response.json() as CatalogPayload;
  const icons: Record<string, string> = { CARD: "🫀", ORTHO: "🦴", NEURO: "🧠", PED: "👶", GENERAL: "✦" };
  return {
    hospital: payload.data.hospital,
    departments: payload.data.departments.map((item) => ({ icon: icons[item.code] || "＋", name: item.name, floor: `${item.floor}${item.zone ? ` · ${item.zone}` : ""}`, desc: item.description })),
    doctors: payload.data.doctors.map((item) => ({ name: item.name, dept: item.departmentName, rank: item.title, skill: item.specialty, time: item.scheduleText, color: item.avatarColor })),
    locations: payload.data.locations,
    knowledgeArticles: payload.data.knowledgeArticles,
  };
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [triageStep, setTriageStep] = useState(0);
  const [symptom, setSymptom] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState("");
  const [catalog, setCatalog] = useState<Catalog>(fallbackCatalog);

  const refreshCatalog = useCallback(async () => {
    try {
      const nextCatalog = await fetchCatalog();
      if (nextCatalog) setCatalog(nextCatalog);
    } catch { /* 保留内置离线演示数据 */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchCatalog().then((nextCatalog) => {
      if (!cancelled && nextCatalog) setCatalog(nextCatalog);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const open = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (view === "admin") return <Admin catalog={catalog} refreshCatalog={refreshCatalog} onExit={() => open("home")} />;

  return (
    <main className="site-shell">
      <header className="topbar">
        <button className="brand" onClick={() => open("home")} aria-label="返回首页">
          <span className="brand-mark">角</span><span><b>未来仕角</b><small>安心就医 · 一路相伴</small></span>
        </button>
        <div className="top-actions"><span className="status"><i /> 服务在线</span><a className="account-link" href="/account">登录 / 我的记录</a><button className="admin-link" onClick={() => open("admin")}>PC 管理后台演示</button></div>
      </header>

      {view === "home" ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">AI 智慧导诊服务</span>
              <h1>您好，我是小安<br />您的智能导医助手</h1>
              <p>从症状描述到科室推荐，从院内路线到就医流程，<br className="desktop" />让每一次就医更从容、更清楚。</p>
              <div className="hero-buttons">
                <button className="primary" onClick={() => open("triage")}><span>✦</span> 开始智能导诊</button>
                <button className="secondary" onClick={() => open("guide")}>⌁ 查询院内位置</button>
              </div>
              <p className="safe-note">ⓘ 本服务仅提供就医引导，不替代医生诊断；危急情况请立即拨打 120。</p>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="bot"><span className="bot-cross">＋</span><i className="eye left"/><i className="eye right"/><div className="smile"/></div>
              <div className="float-card card-one"><b>已为您找到</b><span>心血管内科 · 门诊楼 3F</span></div>
              <div className="float-card card-two"><b>路线已规划</b><span>预计步行 4 分钟</span></div>
            </div>
          </section>

          <section className="section services-section">
            <div className="section-head"><div><span className="eyebrow">常用服务</span><h2>今天需要什么帮助？</h2></div><p>覆盖就诊前、中、后的常见需求</p></div>
            <div className="service-grid">
              {services.map((item) => <button key={item.id} className="service-card" onClick={() => open(item.id)}><span className={`service-icon ${item.tone}`}>{item.icon}</span><span><b>{item.title}</b><small>{item.sub}</small></span><i>→</i></button>)}
            </div>
          </section>

          <section className="section quick-section">
            <div className="quick-copy"><span className="eyebrow">办事不迷路</span><h2>常用流程，一看就懂</h2><p>把复杂的就医步骤，整理成清晰的行动清单。</p></div>
            <div className="quick-list">
              {["初次就诊办卡流程","门诊预约与取号","入院手续办理","检查报告查询"].map((x, i) => <button key={x} onClick={() => open("hospital")}><span>0{i+1}</span><b>{x}</b><i>→</i></button>)}
            </div>
          </section>

          <footer><span>未来仕角 · 智慧导医演示版</span><span>无障碍服务　|　隐私说明　|　联系我们</span></footer>
          <nav className="mobile-nav"><button className="active" onClick={() => open("home")}>⌂<span>首页</span></button><button onClick={() => open("triage")}>✦<span>导诊</span></button><button onClick={() => open("guide")}>⌁<span>导航</span></button><button onClick={() => open("hospital")}>☷<span>服务</span></button></nav>
        </>
      ) : view === "triage" ? (
        <Triage step={triageStep} setStep={setTriageStep} symptom={symptom} setSymptom={setSymptom} selected={selectedSymptom} setSelected={setSelectedSymptom} onBack={() => open("home")} />
      ) : (
        <ModulePage view={view} catalog={catalog} onBack={() => open("home")} onOpen={open} />
      )}
    </main>
  );
}

function Triage({ step, setStep, symptom, setSymptom, selected, setSelected, onBack }: { step:number; setStep:(n:number)=>void; symptom:string; setSymptom:(s:string)=>void; selected:string; setSelected:(s:string)=>void; onBack:()=>void }) {
  const [saveState, setSaveState] = useState<"idle"|"saving"|"saved">("idle");
  const [recommendation, setRecommendation] = useState<{ name: string; floor: string; zone: string; guidance: string } | null>(null);
  const [recommending, setRecommending] = useState(false);
  async function requestRecommendation() {
    setRecommending(true);
    try {
      const response = await fetch("/api/v1/triage/recommendations", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ symptom }) });
      const payload = await response.json() as { data?: { urgency: string; guidance: string; recommendedDepartment: { name: string; floor: string; zone: string } | null } };
      if (payload.data?.urgency === "emergency") { setStep(3); return; }
      if (payload.data?.recommendedDepartment) setRecommendation({ ...payload.data.recommendedDepartment, guidance: payload.data.guidance });
      setStep(2);
    } catch { setStep(2); }
    finally { setRecommending(false); }
  }
  async function saveRecord() {
    setSaveState("saving");
    const response = await fetch("/api/triage-records", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ symptom, safetyStatus:"non_urgent" }) });
    if (response.status === 401) { window.location.href = "/login?returnTo=%2F"; return; }
    if (response.ok) setSaveState("saved"); else setSaveState("idle");
  }
  const symptoms = ["头痛 / 头晕","胸闷 / 心慌","咳嗽 / 发热","腹痛 / 腹泻","关节 / 腰背痛","皮肤不适"];
  return <section className="flow-page">
    <button className="back" onClick={step ? () => setStep(step - 1) : onBack}>← 返回</button>
    <div className="flow-wrap">
      <div className="progress"><i style={{width:`${(step+1)*33.3}%`}}/><span>症状描述</span><span>安全确认</span><span>科室建议</span></div>
      {step === 0 && <div className="flow-card"><span className="large-icon">✦</span><h2>请告诉我哪里不舒服</h2><p>可以直接输入，也可以选择一个常见症状开始。</p><textarea value={symptom} onChange={e=>setSymptom(e.target.value)} placeholder="例如：最近两天头晕，站起来时更明显……"/><div className="chips">{symptoms.map(s=><button className={selected===s?"selected":""} onClick={()=>{setSelected(s);setSymptom(s)}} key={s}>{s}</button>)}</div><button className="primary wide" disabled={!symptom.trim()} onClick={()=>setStep(1)}>继续 <span>→</span></button></div>}
      {step === 1 && <div className="flow-card alert-card"><span className="large-icon warn">!</span><h2>先确认是否需要紧急帮助</h2><p>以下情况可能需要立即处理，请如实选择。</p><div className="warning-list"><b>是否出现以下任一情况？</b><span>严重胸痛或呼吸困难</span><span>意识不清、突然昏倒或抽搐</span><span>突发口角歪斜、言语不清或一侧无力</span><span>无法止住的大量出血</span></div><div className="choice-row"><button className="danger-choice" onClick={()=>setStep(3)}>有，需要帮助</button><button className="safe-choice" disabled={recommending} onClick={()=>void requestRecommendation()}>{recommending?"正在匹配医院科室…":"没有，继续导诊"}</button></div></div>}
      {step === 2 && <div className="flow-card result-card"><span className="result-tag">导诊建议 · 医院数据已联动</span><h2>建议优先前往 <em>{recommendation?.name || (symptom.includes("头")?"神经内科":symptom.includes("胸")?"心血管内科":symptom.includes("关节")?"骨科":"全科医学科")}</em></h2><p>{recommendation?.guidance || `根据您描述的“${symptom}”，该科室与当前症状方向较匹配。`}最终请以现场分诊及医生判断为准。</p><div className="result-info"><span><small>位置</small><b>{recommendation ? `${recommendation.floor}${recommendation.zone ? ` · ${recommendation.zone}` : ""}` : "门诊楼 3F · A 区"}</b></span><span><small>数据来源</small><b>医院主数据接口</b></span><span><small>建议准备</small><b>既往病历、检查报告</b></span></div><div className="choice-row"><button className="secondary" onClick={()=>setStep(0)}>重新导诊</button><button className="primary" onClick={saveRecord} disabled={saveState!=="idle"}>{saveState==="saved"?"已保存到个人中心 ✓":saveState==="saving"?"正在保存…":"登录并保存记录"}</button></div><p className="safe-note center">这不是诊断或处方；症状加重或出现危险信号时，请立即就医。</p></div>}
      {step === 3 && <div className="flow-card emergency"><span className="large-icon warn">!</span><h2>请立即寻求紧急医疗帮助</h2><p>不要继续在线导诊。请立即拨打 120，或让身边的人陪同前往最近的急诊科。</p><a href="tel:120" className="primary wide">拨打 120</a><button className="secondary wide" onClick={()=>setStep(1)}>返回重新选择</button></div>}
    </div>
  </section>
}

function ModulePage({ view, catalog, onBack, onOpen }: { view:View; catalog:Catalog; onBack:()=>void; onOpen:(v:View)=>void }) {
  const titles: Record<string,[string,string]> = {guide:["院内导航","查找目的地，获取清晰路线"],departments:["科室介绍","了解特色科室与位置"],doctors:["医生介绍","按科室查找合适的医生"],hospital:["就医服务","医院介绍与常用流程"],education:["健康宣教","可信、易懂的健康知识"],nearby:["周边服务","就医生活配套一站查找"]};
  const [title, sub] = titles[view] || titles.hospital;
  return <section className="module-page"><div className="module-head"><button className="back" onClick={onBack}>← 返回首页</button><span className="eyebrow">未来仕角智慧导医</span><h1>{title}</h1><p>{sub}</p></div>
    {view === "guide" && <div className="map-layout"><div className="place-list"><label>您要去哪里？<input placeholder="搜索科室、窗口、设施" /></label>{catalog.locations.slice(0,5).map((item,i)=><button className={i===1?"active":""} key={item.id}><span>{["◎","🫀","⌬","✚","◇"][i] || "⌁"}</span><b>{item.name}<small>{item.building} {item.floor}{item.zone?` · ${item.zone}`:""}</small></b><i>→</i></button>)}</div><div className="map"><div className="map-label a">当前位置</div><div className="route"><i/><i/><i/><i/><i/></div><div className="map-label b">心血管内科</div><div className="building b1">门诊大厅</div><div className="building b2">中庭</div><div className="building b3">A 区诊室</div><div className="route-info"><b>预计 4 分钟 · 约 260 米</b><span>直行至中庭 → 乘 2 号电梯到 3F → 左转进入 A 区</span></div></div></div>}
    {view === "departments" && <div className="content-grid">{catalog.departments.map(d=><article className="info-card" key={d.name}><span className="round-icon">{d.icon}</span><div><h3>{d.name}</h3><p>{d.desc}</p><small>⌁ {d.floor}</small></div><button onClick={()=>onOpen("guide")}>查看位置 →</button></article>)}</div>}
    {view === "doctors" && <div className="doctor-grid">{catalog.doctors.map(d=><article className="doctor-card" key={d.name}><div className="avatar" style={{background:d.color}}>{d.name.slice(0,1)}</div><span className="available">● 排班已同步</span><h3>{d.name}</h3><p>{d.rank} · {d.dept}</p><dl><dt>擅长</dt><dd>{d.skill}</dd><dt>出诊</dt><dd>{d.time}</dd></dl><button className="primary">查看排班</button></article>)}</div>}
    {view === "hospital" && <div className="hospital-layout"><article className="hospital-intro"><span className="eyebrow">医院概况</span><h2>{catalog.hospital.name}</h2><p>地址：{catalog.hospital.address}。医院名称、科室、医生与位置均由后端主数据接口统一提供。</p><div><span><b>{catalog.departments.length}</b>已同步科室</span><span><b>{catalog.doctors.length}</b>已同步医生</span><span><b>24h</b>急诊服务</span></div></article><div className="process-list">{["初次就诊办卡","预约挂号与取号","门诊缴费","办理入院","报告查询"].map((x,i)=><button key={x}><span>0{i+1}</span><b>{x}<small>{i===0?"身份证 → 建档 → 领取就诊码":"查看分步办理说明"}</small></b><i>→</i></button>)}</div><article className="qr-card"><div className="fake-qr">▦</div><div><h3>扫码进入医院服务号</h3><p>预约挂号、门诊缴费、候诊提醒、报告查询</p><small>演示二维码 · 不产生真实交易</small></div></article></div>}
    {view === "education" && <div className="article-grid">{catalog.knowledgeArticles.map((a,i)=><article key={a.id}><div className={`article-cover c${i%4+1}`}><span>{["☀","♡","＋","☆"][i%4]}</span></div><small>{a.category}</small><h3>{a.title}</h3><p>{a.summary}</p><button>阅读全文 →</button></article>)}</div>}
    {view === "nearby" && <div className="content-grid">{["便民餐饮","卫生间","停车场","地铁公交","便利店","银行 ATM"].map((x,i)=><article className="info-card" key={x}><span className="round-icon">{["🍜","◇","P","🚇","▣","¥"][i]}</span><div><h3>{x}</h3><p>展示医院周边 1 公里内的便民设施</p><small>最近约 {120+i*90} 米</small></div><button>查看地图 →</button></article>)}</div>}
  </section>
}

function Admin({ catalog, refreshCatalog, onExit }:{catalog:Catalog; refreshCatalog:()=>Promise<void>; onExit:()=>void}) {
  const [section,setSection]=useState("总览");
  const [overview,setOverview]=useState<AdminOverview|null>(null);
  useEffect(()=>{ fetch("/api/v1/admin/overview?demo=1").then(response=>response.ok?response.json():null).then((payload:{data?:AdminOverview}|null)=>{if(payload?.data)setOverview(payload.data)}).catch(()=>{}); },[]);
  const nav=["总览","服务数据","问答记录","知识库管理","医院内容","设备管理","权限与日志"];
  return <main className="admin-shell"><aside><div className="admin-brand"><span>角</span><b>未来仕角<small>运营管理平台 · 接口联动版</small></b></div><nav>{nav.map((n,i)=><button className={section===n?"active":""} onClick={()=>setSection(n)} key={n}><i>{["⌂","◫","◌","◇","＋","▣","⌾"][i]}</i>{n}</button>)}</nav><button className="exit" onClick={onExit}>← 返回演示前台</button></aside><section className="admin-main"><header><div><b>{section}</b><span>{new Date().toLocaleDateString("zh-CN")} · 后端数据已联动</span></div><div><button>接口 {overview?.integration.status==="success"?"正常":"待接入"}</button><span className="admin-user">管</span><b>管理员</b></div></header>{section==="总览"?<Dashboard overview={overview} setSection={setSection}/>:<AdminTable catalog={catalog} refreshCatalog={refreshCatalog} section={section}/>}</section></main>
}

function Dashboard({overview,setSection}:{overview:AdminOverview|null;setSection:(s:string)=>void}) {
  const today=overview?.today;
  const trend=overview?.trend.length?overview.trend.map(item=>Math.max(18,Math.round(item.serviceCount/14))):[42,58,51,73,66,82,70];
  const labels=overview?.trend.length?overview.trend.map(item=>item.metricDate.slice(5)): ["一","二","三","四","五","六","日"];
  const kpis=[["今日服务人次",String(today?.serviceCount??1286),"实时"],["完成导诊",String(today?.triageCount??438),"实时"],["问答解决率",`${today?.resolvedRate??93}%`,"实时"],["转人工服务",String(today?.transferCount??36),"实时"]];
  return <div className="dashboard"><div className="dash-head"><div><span className="eyebrow">今日运营</span><h1>服务运行稳定</h1><p>{overview?`${overview.masterData.departments} 个科室、${overview.masterData.doctors} 位医生、${overview.masterData.publishedArticles} 篇宣教内容已从后端同步。`:"正在读取后端运营数据…"}</p></div><button className="primary" onClick={()=>setSection("知识库管理")}>管理知识内容</button></div><div className="kpis">{kpis.map(k=><article key={k[0]}><span>{k[0]}</span><b>{k[1]}</b><small>{k[2]}数据</small></article>)}</div><div className="dash-grid"><article className="chart-card"><div className="card-title"><b>近 7 日服务趋势</b><span>后端统计</span></div><div className="bars">{trend.map((h,i)=><i key={i} style={{height:`${Math.min(h,95)}%`}}><span>{labels[i]}</span></i>)}</div></article><article className="card-panel"><div className="card-title"><b>服务类型分布</b></div><div className="donut"><span><b>{today?.serviceCount??1286}</b><small>总服务</small></span></div><ul><li><i className="d1"/>智能导诊 <b>{today?Math.round(today.triageCount/today.serviceCount*100):34}%</b></li><li><i className="d2"/>院内导航 <b>{today?Math.round(today.navigationCount/today.serviceCount*100):28}%</b></li><li><i className="d3"/>流程查询 <b>22%</b></li><li><i className="d4"/>其他服务 <b>16%</b></li></ul></article><article className="card-panel full"><div className="card-title"><b>热门问题 Top 5</b><button onClick={()=>setSection("问答记录")}>查看全部</button></div>{["心血管内科怎么走？","第一次就诊怎么办卡？","头晕应该挂什么科？","检查报告在哪里查？","停车场从哪个门进？"].map((q,i)=><div className="hot-row" key={q}><span>0{i+1}</span><b>{q}</b><small>{[186,142,128,96,83][i]} 次</small><i>{["98%","96%","91%","95%","89%"] [i]} 解决</i></div>)}</article></div></div>
}

function AdminTable({section,catalog,refreshCatalog}:{section:string;catalog:Catalog;refreshCatalog:()=>Promise<void>}) {
  const fallback=["胸闷伴心慌应该挂什么科？","门诊办卡需要哪些证件？","儿童发热去哪个科室？","住院部 2 号楼怎么走？","核磁共振检查如何预约？"].map((title,index)=>({id:`demo-${index}`,title,category:["预检分诊","就医流程","预检分诊","院内导航","检查预约"][index],status:"已发布",updated:"演示数据",entity:""}));
  const rows=section==="知识库管理"?catalog.knowledgeArticles.map(item=>({id:item.id,title:item.title,category:item.category,status:"已发布",updated:item.updatedAt?.slice(0,10)||"已同步",entity:"knowledge"})):section==="医院内容"?[...catalog.departments.map((item,index)=>({id:`department-${index}`,realId:item.name,title:item.name,category:"科室",status:"已发布",updated:item.floor,entity:"departments"})),...catalog.doctors.map((item,index)=>({id:`doctor-${index}`,realId:item.name,title:item.name,category:item.dept,status:"已发布",updated:item.time,entity:"doctors"}))]:fallback;
  async function edit(row:{id:string;realId?:string;title:string;entity:string}) {
    if(!row.entity)return;
    const next=window.prompt("修改名称/标题",row.title)?.trim();
    if(!next||next===row.title)return;
    const sourceResponse=await fetch("/api/v1/catalog");
    const source=sourceResponse.ok?await sourceResponse.json() as {data:{departments:Array<{id:string;name:string}>;doctors:Array<{id:string;name:string}>}}:null;
    const realId=row.entity==="knowledge"?row.id:row.entity==="departments"?source?.data.departments.find(item=>item.name===row.realId)?.id:source?.data.doctors.find(item=>item.name===row.realId)?.id;
    if(!realId)return;
    const field=row.entity==="knowledge"?"title":"name";
    const response=await fetch(`/api/v1/admin/content/${row.entity}/${realId}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({[field]:next})});
    if(response.status===401||response.status===403){window.location.assign("/login?returnTo=%2F");return;}
    if(response.ok)await refreshCatalog();
  }
  return <div className="dashboard"><div className="dash-head"><div><span className="eyebrow">运营模块</span><h1>{section}</h1><p>{section==="知识库管理"||section==="医院内容"?"内容来自同一后端；管理员修改后患者前台同步更新。":"汇总展示服务记录与接口数据。"}</p></div><button className="primary">新增需管理员</button></div><article className="data-table"><div className="table-tools"><input placeholder="搜索名称、问题或关键词"/><button>筛选</button><button>导出</button></div><div className="table-head"><span>内容 / 记录</span><span>分类</span><span>状态</span><span>更新时间</span><span>操作</span></div>{rows.map((row)=><div className="table-row" key={row.id}><span><b>{row.title}</b><small>ID · {row.id}</small></span><span>{row.category}</span><span><i className="published"/>{row.status}</span><span>{row.updated}</span><button onClick={()=>void edit(row)}>{row.entity?"编辑":"查看"}</button></div>)}</article></div>
}
