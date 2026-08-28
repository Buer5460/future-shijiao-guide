"use client";
/* eslint-disable @next/next/no-img-element -- hospital floor maps must load directly in Android WebView and Cloudflare Workers */

import { useCallback, useEffect, useMemo, useState } from "react";
import hospitalData from "../data/qbj-hospital.json";

type View = "home" | "triage" | "guide" | "departments" | "doctors" | "hospital" | "education" | "admin";

type Department = {
  id: string;
  code: string;
  icon: string;
  name: string;
  floor: string;
  desc: string;
  specialty: string;
};

type Doctor = {
  id: string;
  code: string;
  name: string;
  dept: string;
  deptCode: string;
  rank: string;
  skill: string;
  profile: string;
  time: string;
  color: string;
  source: string;
};

type Location = { id: string; code: string; name: string; building: string; floor: string; zone: string; description: string };
type FloorMap = { id: string; name: string; building: string; floor: string; image: string; summary: string };
type Process = { id: string; title: string; source: string; steps: string[] };
type Article = { id: string; category: string; title: string; summary: string; content: string; updatedAt?: string };
type HospitalProfile = {
  description: string;
  servicePhone: string;
  source: string;
  stats: { beds: number; plannedBeds: number; employees: number; specialtyCenters: number; buildingArea: string };
};

type Catalog = {
  hospital: { id?: string; name: string; shortName?: string; address: string; emergencyPhone?: string };
  profile: HospitalProfile;
  departments: Department[];
  doctors: Doctor[];
  locations: Location[];
  maps: FloorMap[];
  processes: Process[];
  knowledgeArticles: Article[];
};

type AdminOverview = {
  masterData: { departments: number; doctors: number; publishedArticles: number };
  today: { serviceCount: number; triageCount: number; navigationCount: number; resolvedRate: number; transferCount: number } | null;
  trend: Array<{ metricDate: string; serviceCount: number }>;
  integration: { status: string };
};

const icons: Record<string, string> = {
  CARD: "心", ORTHO: "骨", NEURO: "脑", PED: "儿", EMERGENCY: "急", RESP: "呼",
  GASTRO: "消", TCM: "中", OBGYN: "妇", ENT_OPHTH: "眼", STOMATOLOGY: "口",
};

const staticDoctorByCode = new Map(hospitalData.doctors.map((doctor) => [doctor.code, doctor]));
const staticDepartmentByCode = new Map(hospitalData.departments.map((department) => [department.code, department]));

const fallbackCatalog: Catalog = {
  hospital: hospitalData.hospital,
  profile: {
    description: hospitalData.hospital.description,
    servicePhone: hospitalData.hospital.servicePhone,
    source: hospitalData.hospital.source,
    stats: hospitalData.hospital.stats,
  },
  departments: hospitalData.departments.map((item) => ({
    id: item.id,
    code: item.code,
    icon: icons[item.code] || "科",
    name: item.name,
    floor: `${item.floor}${item.zone ? ` · ${item.zone}` : ""}`,
    desc: item.description,
    specialty: item.specialty,
  })),
  doctors: hospitalData.doctors.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    dept: item.departmentName,
    deptCode: item.departmentCode,
    rank: item.title,
    skill: item.specialty,
    profile: item.profile,
    time: item.scheduleText,
    color: item.avatarColor,
    source: item.source,
  })),
  locations: hospitalData.locations,
  maps: hospitalData.maps,
  processes: hospitalData.processes,
  knowledgeArticles: hospitalData.knowledgeArticles.filter((item) => item.status === "published"),
};

type CatalogPayload = {
  data: {
    hospital: Catalog["hospital"];
    profile?: Catalog["profile"];
    departments: Array<{ id: string; code: string; name: string; floor: string; zone: string; description: string; specialty: string }>;
    doctors: Array<{ id: string; code: string; name: string; departmentName: string; departmentId: string; title: string; specialty: string; scheduleText: string; avatarColor: string }>;
    locations: Location[];
    maps?: FloorMap[];
    processes?: Process[];
    knowledgeArticles: Article[];
  };
};

async function fetchCatalog(): Promise<Catalog | null> {
  const response = await fetch("/api/v1/catalog");
  if (!response.ok) return null;
  const payload = await response.json() as CatalogPayload;
  return {
    hospital: payload.data.hospital,
    profile: payload.data.profile || fallbackCatalog.profile,
    departments: payload.data.departments.map((item) => {
      const local = staticDepartmentByCode.get(item.code);
      return {
        id: item.id,
        code: item.code,
        icon: icons[item.code] || "科",
        name: item.name,
        floor: `${item.floor}${item.zone ? ` · ${item.zone}` : ""}`,
        desc: item.description,
        specialty: item.specialty || local?.specialty || "",
      };
    }),
    doctors: payload.data.doctors.map((item) => {
      const local = staticDoctorByCode.get(item.code);
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        dept: item.departmentName,
        deptCode: local?.departmentCode || item.departmentId,
        rank: item.title,
        skill: local?.specialty || item.specialty,
        profile: item.specialty || local?.profile || "",
        time: item.scheduleText,
        color: item.avatarColor,
        source: local?.source || "医院主数据接口",
      };
    }),
    locations: payload.data.locations,
    maps: payload.data.maps || fallbackCatalog.maps,
    processes: payload.data.processes || fallbackCatalog.processes,
    knowledgeArticles: payload.data.knowledgeArticles,
  };
}

const services: Array<{ id: Exclude<View, "home" | "admin">; icon: string; title: string; sub: string; tone: string }> = [
  { id: "triage", icon: "✦", title: "智能导诊", sub: "描述症状，匹配院内科室", tone: "coral" },
  { id: "guide", icon: "⌁", title: "院内地图", sub: "查看院方真实楼层图", tone: "blue" },
  { id: "departments", icon: "科", title: "科室介绍", sub: "44 个科室与特色技术", tone: "mint" },
  { id: "doctors", icon: "医", title: "医生介绍", sub: "181 位医生与出诊资料", tone: "violet" },
  { id: "hospital", icon: "院", title: "就医流程", sub: "挂号、就诊与急诊指引", tone: "amber" },
  { id: "education", icon: "阅", title: "政策宣教", sub: "院方资料，标注来源日期", tone: "pink" },
];

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [catalog, setCatalog] = useState<Catalog>(fallbackCatalog);
  const refreshCatalog = useCallback(async () => {
    try {
      const next = await fetchCatalog();
      if (next) setCatalog(next);
    } catch { /* 保留 APK 内置医院目录 */ }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCatalog().then((next) => {
      if (active && next) setCatalog(next);
    }).catch(() => { /* 保留 APK 内置医院目录 */ });
    return () => { active = false; };
  }, []);
  const open = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "instant" }); };

  if (view === "admin") return <Admin catalog={catalog} refreshCatalog={refreshCatalog} onExit={() => open("home")} />;

  return <main className="site-shell">
    <header className="topbar">
      <button className="brand" onClick={() => open("home")} aria-label="返回首页">
        <span className="brand-mark">角</span>
        <span><b>未来仕角</b><small>{catalog.hospital.shortName || "智慧导医服务"}</small></span>
      </button>
      <div className="top-actions">
        <span className="status"><i /> 医院资料已载入</span>
        <a className="phone-link" href={`tel:${catalog.profile.servicePhone}`}>咨询 {catalog.profile.servicePhone}</a>
        <a className="account-link" href="/account">登录 / 我的记录</a>
        <button className="admin-link" onClick={() => open("admin")}>PC 管理后台</button>
      </div>
    </header>

    {view === "home" ? <HomePage catalog={catalog} open={open} /> : view === "triage" ? <Triage onBack={() => open("home")} /> : <ModulePage view={view} catalog={catalog} onBack={() => open("home")} onOpen={open} />}

    <nav className="mobile-nav" aria-label="手机快捷导航">
      <button className={view === "home" ? "active" : ""} onClick={() => open("home")}>⌂<span>首页</span></button>
      <button className={view === "triage" ? "active" : ""} onClick={() => open("triage")}>✦<span>导诊</span></button>
      <button className={view === "guide" ? "active" : ""} onClick={() => open("guide")}>⌁<span>地图</span></button>
      <button className={view === "doctors" ? "active" : ""} onClick={() => open("doctors")}>医<span>医生</span></button>
    </nav>
  </main>;
}

function HomePage({ catalog, open }: { catalog: Catalog; open: (view: View) => void }) {
  return <>
    <section className="kiosk-home">
      <div className="hero-copy">
        <div className="hospital-badge"><span>三甲</span><div><b>{catalog.hospital.name}</b><small>院方资料版 · 更新至 2026 年</small></div></div>
        <span className="eyebrow">AI 智慧导诊服务</span>
        <h1>您好，我是小角<br /><em>陪您清楚就医</em></h1>
        <p>从症状分流到科室推荐，从楼层地图到就诊流程，信息均来自本次院方上传资料。</p>
        <div className="hero-buttons">
          <button className="primary jumbo" onClick={() => open("triage")}>开始智能导诊 <span>→</span></button>
          <button className="secondary jumbo" onClick={() => open("guide")}>查看院内地图</button>
        </div>
        <div className="emergency-strip"><b>紧急情况</b><span>严重胸痛、呼吸困难、意识不清或大量出血，请立即拨打 120。</span><a href="tel:120">拨打 120</a></div>
      </div>
      <div className="home-services">
        <div className="section-head compact"><div><span className="eyebrow">常用服务</span><h2>请选择需要的帮助</h2></div><small>支持触摸操作</small></div>
        <div className="service-grid">{services.map((item) => <button key={item.id} className="service-card" onClick={() => open(item.id)}>
          <span className={`service-icon ${item.tone}`}>{item.icon}</span><span><b>{item.title}</b><small>{item.sub}</small></span><i>→</i>
        </button>)}</div>
        <div className="source-note"><span>资料概览</span><b>{catalog.departments.length}</b> 个科室　<b>{catalog.doctors.length}</b> 位医生　<b>{catalog.maps.length}</b> 张楼层图</div>
      </div>
    </section>
    <footer><span>未来仕角 · {catalog.hospital.shortName}</span><span>资料来源：院方 2026.7.21 上传包　|　导诊不替代医生诊断</span></footer>
  </>;
}

function Triage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [symptom, setSymptom] = useState("");
  const [selected, setSelected] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [recommendation, setRecommendation] = useState<{ name: string; floor: string; zone: string; guidance: string } | null>(null);
  const [recommending, setRecommending] = useState(false);
  const symptoms = ["头痛 / 头晕", "胸闷 / 心慌", "咳嗽 / 发热", "腹痛 / 腹泻", "关节 / 腰背痛", "皮肤不适", "儿童不适", "睡眠 / 情绪问题"];

  async function requestRecommendation() {
    setRecommending(true);
    try {
      const response = await fetch("/api/v1/triage/recommendations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symptom }) });
      const payload = await response.json() as { data?: { urgency: string; guidance: string; recommendedDepartment: { name: string; floor: string; zone: string } | null } };
      if (payload.data?.urgency === "emergency") { setStep(3); return; }
      if (payload.data?.recommendedDepartment) setRecommendation({ ...payload.data.recommendedDepartment, guidance: payload.data.guidance });
      setStep(2);
    } catch { setStep(2); }
    finally { setRecommending(false); }
  }

  async function saveRecord() {
    setSaveState("saving");
    const response = await fetch("/api/triage-records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symptom, safetyStatus: "non_urgent", recommendedDepartment: recommendation?.name }) });
    if (response.status === 401) { window.location.href = "/login?returnTo=%2F"; return; }
    setSaveState(response.ok ? "saved" : "idle");
  }

  return <section className="flow-page">
    <button className="back" onClick={step ? () => setStep(step - 1) : onBack}>← 返回</button>
    <div className="flow-wrap">
      <div className="progress"><i style={{ width: `${Math.min(step + 1, 3) * 33.3}%` }} /><span>症状描述</span><span>安全确认</span><span>科室建议</span></div>
      {step === 0 && <div className="flow-card"><span className="large-icon">✦</span><h2>请告诉我哪里不舒服</h2><p>不要填写姓名、身份证号或完整病历。可以输入简短症状，也可以点击常见症状。</p><textarea value={symptom} onChange={(event) => setSymptom(event.target.value)} maxLength={500} placeholder="例如：最近两天头晕，站起来时更明显……" /><div className="chips">{symptoms.map((item) => <button className={selected === item ? "selected" : ""} onClick={() => { setSelected(item); setSymptom(item); }} key={item}>{item}</button>)}</div><button className="primary wide" disabled={!symptom.trim()} onClick={() => setStep(1)}>继续安全确认 →</button></div>}
      {step === 1 && <div className="flow-card alert-card"><span className="large-icon warn">!</span><h2>先确认是否需要紧急帮助</h2><p>以下情况不能继续普通在线导诊。</p><div className="warning-list"><b>是否出现以下任一情况？</b><span>严重胸痛或呼吸困难</span><span>意识不清、突然昏倒或抽搐</span><span>突发口角歪斜、言语不清或一侧无力</span><span>无法止住的大量出血</span></div><div className="choice-row"><button className="danger-choice" onClick={() => setStep(3)}>有，需要紧急帮助</button><button className="safe-choice" disabled={recommending} onClick={() => void requestRecommendation()}>{recommending ? "正在匹配院内科室…" : "没有，继续导诊"}</button></div></div>}
      {step === 2 && <div className="flow-card result-card"><span className="result-tag">导诊建议 · 院方科室目录</span><h2>建议优先前往 <em>{recommendation?.name || "现场导诊台"}</em></h2><p>{recommendation?.guidance || "暂未匹配到明确科室，建议先咨询门诊楼 1F 导医服务总台。"} 最终请以现场分诊及医生判断为准。</p><div className="result-info"><span><small>院内位置</small><b>{recommendation ? `${recommendation.floor}${recommendation.zone ? ` · ${recommendation.zone}` : ""}` : "门诊楼 1F"}</b></span><span><small>数据来源</small><b>医院主数据与院方楼层图</b></span><span><small>建议准备</small><b>既往病历、检查报告</b></span></div><div className="choice-row"><button className="secondary" onClick={() => setStep(0)}>重新导诊</button><button className="primary" onClick={() => void saveRecord()} disabled={saveState !== "idle"}>{saveState === "saved" ? "已保存到个人中心 ✓" : saveState === "saving" ? "正在保存…" : "登录并保存记录"}</button></div><p className="safe-note center">这不是诊断或处方；症状加重或出现危险信号时，请立即就医。</p></div>}
      {step === 3 && <div className="flow-card emergency"><span className="large-icon warn">!</span><h2>请立即寻求紧急医疗帮助</h2><p>不要继续在线导诊。请立即拨打 120，或让身边的人陪同前往急诊科。院内急救电话：028-83611120。</p><a href="tel:120" className="primary wide">立即拨打 120</a><button className="secondary wide" onClick={() => setStep(1)}>返回重新确认</button></div>}
    </div>
  </section>;
}

function ModulePage({ view, catalog, onBack, onOpen }: { view: Exclude<View, "home" | "triage" | "admin">; catalog: Catalog; onBack: () => void; onOpen: (view: View) => void }) {
  const titles: Record<string, [string, string]> = {
    guide: ["院内地图", "使用院方原始楼层图查找科室与服务点"],
    departments: ["科室介绍", "按名称、疾病方向和位置搜索"],
    doctors: ["医生介绍", "院方 2026 年 5 月医生与出诊资料"],
    hospital: ["就医服务", "医院概况与院方流程"],
    education: ["政策宣教", "资料标注版本日期，避免旧政策误导"],
  };
  const [title, sub] = titles[view];
  return <section className="module-page">
    <div className="module-head"><button className="back" onClick={onBack}>← 返回首页</button><span className="eyebrow">{catalog.hospital.shortName}</span><h1>{title}</h1><p>{sub}</p></div>
    {view === "guide" && <GuideModule catalog={catalog} />}
    {view === "departments" && <DepartmentsModule catalog={catalog} onOpen={onOpen} />}
    {view === "doctors" && <DoctorsModule catalog={catalog} />}
    {view === "hospital" && <HospitalModule catalog={catalog} />}
    {view === "education" && <EducationModule catalog={catalog} />}
  </section>;
}

function GuideModule({ catalog }: { catalog: Catalog }) {
  const [mapId, setMapId] = useState(catalog.maps[0]?.id || "");
  const [query, setQuery] = useState("");
  const selected = catalog.maps.find((item) => item.id === mapId) || catalog.maps[0];
  const locations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.locations.filter((item) => !term || `${item.name}${item.building}${item.floor}${item.zone}${item.description}`.toLowerCase().includes(term)).slice(0, 30);
  }, [catalog.locations, query]);

  function selectLocation(location: Location) {
    const match = catalog.maps.find((item) => item.building === location.building && item.floor === location.floor);
    if (match) setMapId(match.id);
  }

  return <div className="guide-shell">
    <aside className="map-sidebar"><label>搜索科室或服务点<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="如：心血管内科、采血室" /></label><div className="location-results">{locations.length ? locations.map((item) => <button key={item.id} onClick={() => selectLocation(item)}><span>⌁</span><b>{item.name}<small>{item.building} {item.floor}{item.zone ? ` · ${item.zone}` : ""}</small></b><i>→</i></button>) : <p className="empty-small">没有匹配结果，请咨询 1F 导医服务总台。</p>}</div></aside>
    <section className="floor-view"><div className="floor-tabs">{catalog.maps.map((item) => <button className={item.id === selected?.id ? "active" : ""} onClick={() => setMapId(item.id)} key={item.id}>{item.name}</button>)}</div>{selected && <><div className="map-image"><img src={selected.image} alt={`${selected.name}院方楼层图`} width="1732" height="1080" loading={selected.id === "outpatient-1f" ? "eager" : "lazy"} /></div><div className="map-caption"><div><b>{selected.name}</b><span>{selected.summary}</span></div><small>院方原始楼层图 · 位置调整时以现场标识为准</small></div></>}</section>
  </div>;
}

function DepartmentsModule({ catalog, onOpen }: { catalog: Catalog; onOpen: (view: View) => void }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(18);
  const [selected, setSelected] = useState<Department | null>(null);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.departments.filter((item) => !term || `${item.name}${item.desc}${item.specialty}${item.floor}`.toLowerCase().includes(term));
  }, [catalog.departments, query]);
  return <>
    <div className="catalog-toolbar"><input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(18); }} placeholder="搜索科室、疾病方向或特色技术" /><span>共 {filtered.length} 个结果</span></div>
    <div className="content-grid">{filtered.slice(0, limit).map((item) => <article className="info-card" key={item.id}><span className="round-icon">{item.icon}</span><div><h3>{item.name}</h3><p>{item.desc}</p><small>⌁ {item.floor}</small></div><div className="card-actions"><button onClick={() => setSelected(item)}>查看介绍</button><button onClick={() => onOpen("guide")}>查看地图</button></div></article>)}</div>
    {limit < filtered.length && <button className="load-more" onClick={() => setLimit(limit + 18)}>加载更多科室</button>}
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><p className="detail-location">⌁ {selected.floor}</p><h4>科室介绍</h4><p>{selected.desc}</p><h4>特色方向</h4><p>{selected.specialty || "具体诊疗范围以院方当日门诊安排为准。"}</p></Modal>}
  </>;
}

function DoctorsModule({ catalog }: { catalog: Catalog }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("全部科室");
  const [limit, setLimit] = useState(18);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const departmentOptions = useMemo(() => ["全部科室", ...Array.from(new Set(catalog.doctors.map((item) => item.dept))).sort((a, b) => a.localeCompare(b, "zh-CN"))], [catalog.doctors]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.doctors.filter((item) => (department === "全部科室" || item.dept === department) && (!term || `${item.name}${item.dept}${item.rank}${item.skill}${item.profile}`.toLowerCase().includes(term)));
  }, [catalog.doctors, department, query]);
  return <>
    <div className="catalog-toolbar doctor-toolbar"><input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(18); }} placeholder="搜索医生姓名、科室或擅长方向" /><select value={department} onChange={(event) => { setDepartment(event.target.value); setLimit(18); }}>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select><span>{filtered.length} 位医生</span></div>
    <div className="doctor-grid">{filtered.slice(0, limit).map((item) => <article className="doctor-card" key={item.id}><div className="avatar" style={{ background: item.color }}>{item.name.slice(0, 1)}</div><span className="source-status">院方资料</span><h3>{item.name}</h3><p>{item.rank} · {item.dept}</p><dl><dt>擅长</dt><dd>{item.skill || "详见医生介绍"}</dd><dt>资料排班</dt><dd>{item.time}</dd></dl><button className="primary" onClick={() => setSelected(item)}>查看医生详情</button></article>)}</div>
    {limit < filtered.length && <button className="load-more" onClick={() => setLimit(limit + 18)}>加载更多医生</button>}
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><div className="doctor-detail-head"><div className="avatar" style={{ background: selected.color }}>{selected.name.slice(0, 1)}</div><div><b>{selected.rank}</b><span>{selected.dept}</span></div></div><h4>擅长方向</h4><p>{selected.skill}</p><h4>医生介绍</h4><p>{selected.profile}</p><div className="schedule-box"><small>资料中的出诊安排</small><b>{selected.time}</b><span>实际号源与停诊信息以医院当日排班系统为准。</span></div><p className="source-line">资料来源：{selected.source}</p></Modal>}
  </>;
}

function HospitalModule({ catalog }: { catalog: Catalog }) {
  const [processId, setProcessId] = useState(catalog.processes[0]?.id || "");
  const process = catalog.processes.find((item) => item.id === processId) || catalog.processes[0];
  const stats = catalog.profile.stats;
  return <div className="hospital-page-grid">
    <article className="hospital-intro"><span className="eyebrow">医院概况 · 资料日期 2026-07-03</span><h2>{catalog.hospital.name}</h2><p>{catalog.profile.description}</p><p className="hospital-address">⌁ {catalog.hospital.address}</p><div className="hospital-stats"><span><b>{stats.beds}</b>编制床位</span><span><b>{stats.employees}</b>名职工</span><span><b>{stats.specialtyCenters}</b>个专病中心</span><span><b>{stats.buildingArea}</b>建筑面积</span></div></article>
    <section className="process-panel"><div className="process-nav">{catalog.processes.map((item) => <button className={item.id === process?.id ? "active" : ""} onClick={() => setProcessId(item.id)} key={item.id}>{item.title}<span>→</span></button>)}</div>{process && <article className="process-detail"><span className="eyebrow">办理步骤</span><h3>{process.title}</h3><ol>{process.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><b>{step}</b></li>)}</ol><small>{process.source} · 流程调整时以医院现场公告为准</small></article>}</section>
    <article className="contact-card"><div><small>门诊咨询</small><a href={`tel:${catalog.profile.servicePhone}`}>{catalog.profile.servicePhone}</a></div><div><small>院内急救</small><a href="tel:02883611120">028-83611120</a></div><div><small>社会急救</small><a href="tel:120">120</a></div></article>
  </div>;
}

function EducationModule({ catalog }: { catalog: Catalog }) {
  const [selected, setSelected] = useState<Article | null>(null);
  return <><div className="policy-warning"><b>医保政策版本提示</b><span>院方上传的医保政策材料形成于 2023 年 2 月，可能已调整。系统暂不公开旧报销比例，正式上线前须由医院医保办复核。</span></div><div className="article-grid">{catalog.knowledgeArticles.map((item, index) => <article key={item.id}><div className={`article-cover c${index % 4 + 1}`}><span>{["流", "挂", "急", "护"][index % 4]}</span></div><small>{item.category}</small><h3>{item.title}</h3><p>{item.summary}</p><button onClick={() => setSelected(item)}>查看完整步骤 →</button></article>)}</div>{selected && <Modal title={selected.title} onClose={() => setSelected(null)}><p className="article-content">{selected.content}</p><p className="source-line">资料来源：院方上传流程文件；实际办理以现场公告为准。</p></Modal>}</>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><article className="detail-modal" role="dialog" aria-modal="true" aria-label={title}><header><h3>{title}</h3><button onClick={onClose} aria-label="关闭">×</button></header><div>{children}</div></article></div>;
}

function Admin({ catalog, refreshCatalog, onExit }: { catalog: Catalog; refreshCatalog: () => Promise<void>; onExit: () => void }) {
  const [section, setSection] = useState("总览");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  useEffect(() => { fetch("/api/v1/admin/overview?demo=1").then((response) => response.ok ? response.json() : null).then((payload: { data?: AdminOverview } | null) => { if (payload?.data) setOverview(payload.data); }).catch(() => {}); }, []);
  const nav = ["总览", "医院内容", "知识库管理", "接口联动", "权限与日志"];
  return <main className="admin-shell"><aside><div className="admin-brand"><span>角</span><b>未来仕角<small>运营管理平台</small></b></div><nav>{nav.map((item, index) => <button className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}><i>{["⌂", "＋", "◇", "↔", "⌾"][index]}</i>{item}</button>)}</nav><button className="exit" onClick={onExit}>← 返回患者端</button></aside><section className="admin-main"><header><div><b>{section}</b><span>{new Date().toLocaleDateString("zh-CN")} · 医院资料版</span></div><div><button>接口 {overview?.integration.status === "success" ? "正常" : "待医院接入"}</button><span className="admin-user">管</span><b>管理员</b></div></header>{section === "总览" ? <Dashboard overview={overview} catalog={catalog} setSection={setSection} /> : <AdminTable catalog={catalog} refreshCatalog={refreshCatalog} section={section} />}</section></main>;
}

function Dashboard({ overview, catalog, setSection }: { overview: AdminOverview | null; catalog: Catalog; setSection: (value: string) => void }) {
  const today = overview?.today;
  const kpis = [["已上线科室", String(overview?.masterData.departments ?? catalog.departments.length), "医院目录"], ["医生资料", String(overview?.masterData.doctors ?? catalog.doctors.length), "院方资料"], ["楼层地图", String(catalog.maps.length), "院方原图"], ["今日真实服务量", String(today?.serviceCount ?? 0), today ? "统计接口" : "尚未接入"]];
  return <div className="dashboard"><div className="dash-head"><div><span className="eyebrow">内容运行状态</span><h1>医院资料已完成结构化</h1><p>当前展示真实院方目录；HIS 号源、预约、叫号与运营统计仍需医院接口凭据。</p></div><button className="primary" onClick={() => setSection("医院内容")}>管理医院内容</button></div><div className="kpis">{kpis.map((item) => <article key={item[0]}><span>{item[0]}</span><b>{item[1]}</b><small>{item[2]}</small></article>)}</div><div className="dash-grid"><article className="card-panel full"><div className="card-title"><b>上线检查</b><span>不伪造医院业务结果</span></div><div className="check-grid"><div className="ok">✓<b>医院、科室、医生、地图</b><small>已从本次资料导入</small></div><div className="ok">✓<b>导诊与急症安全分流</b><small>已联动医院科室编码</small></div><div className="wait">…<b>HIS / 预约 / 叫号</b><small>等待医院测试地址与凭据</small></div><div className="wait">…<b>实时排班与运营统计</b><small>等待接口正式同步</small></div></div></article></div></div>;
}

function AdminTable({ section, catalog, refreshCatalog }: { section: string; catalog: Catalog; refreshCatalog: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const rows = section === "知识库管理" ? catalog.knowledgeArticles.map((item) => ({ id: item.id, realId: item.id, title: item.title, category: item.category, status: "已发布", updated: item.updatedAt?.slice(0, 10) || "院方资料", entity: "knowledge" })) : section === "医院内容" ? [...catalog.departments.map((item) => ({ id: item.id, realId: item.id, title: item.name, category: "科室", status: "已发布", updated: item.floor, entity: "departments" })), ...catalog.doctors.map((item) => ({ id: item.id, realId: item.id, title: item.name, category: item.dept, status: "已发布", updated: item.time, entity: "doctors" }))] : [{ id: "integration", realId: "", title: "医院接口适配器", category: "HMAC + 幂等", status: "待医院接入", updated: "需测试地址和凭据", entity: "" }];
  const filtered = rows.filter((item) => `${item.title}${item.category}${item.updated}`.toLowerCase().includes(query.toLowerCase()));
  async function edit(row: typeof rows[number]) {
    if (!row.entity) return;
    const next = window.prompt("修改名称/标题", row.title)?.trim();
    if (!next || next === row.title) return;
    const field = row.entity === "knowledge" ? "title" : "name";
    const response = await fetch(`/api/v1/admin/content/${row.entity}/${row.realId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ [field]: next }) });
    if (response.status === 401 || response.status === 403) { window.location.assign("/login?returnTo=%2F"); return; }
    if (response.ok) await refreshCatalog();
  }
  return <div className="dashboard"><div className="dash-head"><div><span className="eyebrow">运营模块</span><h1>{section}</h1><p>{section === "医院内容" || section === "知识库管理" ? "管理员修改后，患者端通过同一目录接口同步更新。" : "接口状态仅展示真实连接结果。"}</p></div><button className="primary">新增需管理员登录</button></div><article className="data-table"><div className="table-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、科室或关键词" /><button>筛选</button></div><div className="table-head"><span>内容 / 记录</span><span>分类</span><span>状态</span><span>资料 / 排班</span><span>操作</span></div>{filtered.slice(0, 100).map((row) => <div className="table-row" key={row.id}><span><b>{row.title}</b><small>ID · {row.id}</small></span><span>{row.category}</span><span><i className="published" />{row.status}</span><span>{row.updated}</span><button onClick={() => void edit(row)}>{row.entity ? "编辑" : "查看"}</button></div>)}</article></div>;
}
