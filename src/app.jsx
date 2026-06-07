import { useState, useEffect, useRef } from "react";

// â”€â”€ In-memory rooms â”€â”€
const ROOMS = {};
const FREE_LIMIT = 10;
const SHARE_REQUIRED = 5;

const SUBJECTS = ["General","Mathematics","Physics","Chemistry","Biology","English","Urdu","Computer","History","Geography","Economics","Islamic Studies"];
const CLASSES  = ["6th","7th","8th","9th","10th","11th","12th","University"];

const PLANS = {
  free:  { name:"Free",       price:"$0",        color:"#6366f1" },
  pro:   { name:"Pro",        price:"$5/month",  color:"#8b5cf6" },
  class: { name:"Class Pack", price:"$30/month", color:"#ec4899" },
};

const LANGS = [
  { id:"both",    label:"Urdu + English", flag:"ðŸŒ" },
  { id:"urdu",    label:"Urdu Only",      flag:"ðŸ‡µðŸ‡°" },
  { id:"english", label:"English Only",   flag:"ðŸ‡ºðŸ‡¸" },
  { id:"arabic",  label:"Arabic",         flag:"ðŸ‡¸ðŸ‡¦" },
];

function getLang(l) {
  if(l==="urdu")    return "Sirf Urdu mein jawab do.";
  if(l==="english") return "Answer only in English.";
  if(l==="arabic")  return "Answer in Arabic with some English.";
  return "Answer in both Urdu and English.";
}

// â”€â”€ Storage helpers â”€â”€
function store(key, val) { try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} }
function load(key, def)  { try{ const v=localStorage.getItem(key); return v?JSON.parse(v):def; }catch{ return def; } }

function getUsage() {
  const today = new Date().toDateString();
  const u = load("au_usage", { date:"", count:0 });
  if(u.date !== today) return { date:today, count:0 };
  return u;
}
function addUsage() {
  const u = getUsage(); u.count++;
  store("au_usage", u);
}
function canUse(plan, shareBonus) {
  if(plan !== "free") return true;
  if(shareBonus && new Date(shareBonus) > new Date()) return true;
  return getUsage().count < FREE_LIMIT;
}

// â”€â”€ Claude API â”€â”€
async function askClaude(apiKey, system, msg, max=1000) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": apiKey,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true"
    },
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens: max,
      system,
      messages:[{role:"user", content:msg}]
    })
  });
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || "No response.";
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROOT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function App() {
  const [page,   setPage]   = useState("splash");
  const [screen, setScreen] = useState("home");
  const [user,   setUser]   = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [lang,   setLang]   = useState("both");
  const [usage,  setUsage]  = useState(0);

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLang,    setShowLang]    = useState(false);
  const [showOwner,   setShowOwner]   = useState(false);
  const [showShare,   setShowShare]   = useState(false);

  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef(null);

  // Secret 7-tap on logo
  const handleTap = () => {
    const n = tapCount + 1;
    setTapCount(n);
    if(tapTimer.current) clearTimeout(tapTimer.current);
    if(n >= 7){ setTapCount(0); setShowOwner(true); }
    else tapTimer.current = setTimeout(()=>setTapCount(0), 2000);
  };

  useEffect(()=>{
    const u = load("au_user", null);
    const k = load("au_key",  "");
    const l = load("au_lang", "both");
    if(k) setApiKey(k);
    if(l) setLang(l);
    const u2 = getUsage();
    setUsage(u2.count);
    setTimeout(()=> setPage(u ? "app" : "onboard"), 2000);
    if(u) setUser(u);
  },[]);

  const saveUser = u => { setUser(u); store("au_user", u); };
  const saveKey  = k => { setApiKey(k); store("au_key", k); };
  const saveLang = l => { setLang(l); store("au_lang", l); setShowLang(false); };

  const guard = () => {
    if(!apiKey) return false;
    const plan  = user?.plan || "free";
    const bonus = user?.shareBonus || null;
    if(!canUse(plan, bonus)){ setShowShare(true); return false; }
    addUsage();
    setUsage(getUsage().count);
    return true;
  };

  if(page==="splash")  return <Splash/>;
  if(page==="onboard") return <Onboard onSave={u=>{ saveUser(u); setPage("app"); }}/>;

  const plan      = user?.plan || "free";
  const planColor = PLANS[plan].color;
  const hasBonus  = user?.shareBonus && new Date(user.shareBonus) > new Date();

  return (
    <div style={S.root}>
      {/* TOP BAR */}
      <div style={S.topbar}>
        <div style={S.brand} onClick={handleTap}>
          <span style={{fontSize:26}}>ðŸ“š</span>
          <div>
            <div style={S.appName}>AI Ustaad</div>
            {tapCount>0 && tapCount<7 && <div style={{fontSize:9,color:"#a5b4fc"}}>â—{tapCount}/7</div>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:apiKey?"#22c55e":"#ef4444"}}/>
          <button style={{...S.pill,borderColor:planColor,color:planColor}} onClick={()=>setShowUpgrade(true)}>
            {hasBonus ? "ðŸŽ Bonus" : PLANS[plan].name}
          </button>
          <button style={S.iconBtn} onClick={()=>setShowLang(true)}>
            {LANGS.find(l=>l.id===lang)?.flag}
          </button>
          <div style={{...S.avatarSm,background:planColor}} onClick={()=>setScreen("profile")}>
            {user?.name?.[0]?.toUpperCase()||"S"}
          </div>
        </div>
      </div>

      {/* USAGE BAR */}
      {plan==="free" && !hasBonus && (
        <div style={S.usageWrap}>
          <div style={{...S.usageFill, width:`${Math.min(100,usage/FREE_LIMIT*100)}%`}}/>
          <span style={S.usageTxt}>{Math.max(0,FREE_LIMIT-usage)} free questions left today</span>
        </div>
      )}

      {/* NO KEY WARNING */}
      {!apiKey && (
        <div style={S.warnBar}>âš ï¸ No API Key â€” Tap logo 7 times to add</div>
      )}

      {/* SCREENS */}
      <div style={S.content}>
        {screen==="home"    && <HomeScreen    user={user} lang={lang} guard={guard} apiKey={apiKey} usage={usage} hasBonus={hasBonus} onNav={setScreen} onUpgrade={()=>setShowUpgrade(true)} onShare={()=>setShowShare(true)}/>}
        {screen==="ai"      && <AIScreen      lang={lang} guard={guard} apiKey={apiKey} plan={plan} onUpgrade={()=>setShowUpgrade(true)}/>}
        {screen==="group"   && <GroupScreen   lang={lang} userName={user?.name} guard={guard} apiKey={apiKey} onUpgrade={()=>setShowShare(true)}/>}
        {screen==="exam"    && <ExamScreen    lang={lang} guard={guard} apiKey={apiKey} onUpgrade={()=>setShowShare(true)}/>}
        {screen==="tools"   && <ToolsScreen   lang={lang} guard={guard} apiKey={apiKey} onUpgrade={()=>setShowShare(true)}/>}
        {screen==="profile" && <ProfileScreen user={user} usage={usage} plan={plan} hasBonus={hasBonus} apiKey={apiKey} onUpgrade={()=>setShowUpgrade(true)} onShare={()=>setShowShare(true)} onSignOut={()=>{ store("au_user",null); setUser(null); setPage("onboard"); }}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={S.nav}>
        {[
          {id:"home",    icon:"ðŸ ", label:"Home"},
          {id:"ai",      icon:"ðŸ¤–", label:"Tutor"},
          {id:"group",   icon:"ðŸ‘¥", label:"Group"},
          {id:"exam",    icon:"ðŸ“", label:"Exam"},
          {id:"tools",   icon:"ðŸ› ", label:"Tools"},
          {id:"profile", icon:"ðŸ‘¤", label:"Profile"},
        ].map(n=>(
          <button key={n.id} style={{...S.navBtn, borderTop:screen===n.id?`2px solid ${planColor}`:"2px solid transparent"}} onClick={()=>setScreen(n.id)}>
            <span style={{fontSize:20}}>{n.icon}</span>
            <span style={{...S.navLbl, color:screen===n.id?planColor:"#94a3b8"}}>{n.label}</span>
          </button>
        ))}
      </div>

      {/* MODALS */}
      {showOwner   && <OwnerModal   apiKey={apiKey} onSave={k=>{saveKey(k);setShowOwner(false);}} onClose={()=>setShowOwner(false)}/>}
      {showUpgrade && <UpgradeModal plan={plan} onUpgrade={p=>{ saveUser({...user,plan:p}); setShowUpgrade(false); }} onClose={()=>setShowUpgrade(false)}/>}
      {showLang    && <LangModal    current={lang} onSelect={saveLang} onClose={()=>setShowLang(false)}/>}
      {showShare   && <ShareModal   user={user} onUpdate={u=>saveUser(u)} onClose={()=>setShowShare(false)}/>}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPLASH
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Splash(){
  return(
    <div style={S.center}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{fontSize:64}}>ðŸ“š</div>
        <div style={{fontSize:34,fontWeight:900,color:"#6366f1"}}>AI Ustaad</div>
        <div style={{fontSize:14,color:"#94a3b8"}}>Your Smart Study Companion</div>
        <div style={S.loaderWrap}><div style={S.loaderBar}/></div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ONBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Onboard({onSave}){
  const [name,setName]=useState("");
  const [cls,setCls]=useState("10th");
  return(
    <div style={S.center}>
      <div style={S.card}>
        <div style={{fontSize:52,textAlign:"center"}}>ðŸ‘‹</div>
        <div style={{fontSize:22,fontWeight:800,color:"#6366f1",textAlign:"center"}}>Welcome to AI Ustaad!</div>
        <p style={{fontSize:13,color:"#94a3b8",textAlign:"center",lineHeight:1.6,margin:0}}>Pakistan's smartest AI study assistant. Enter your details to get started!</p>
        <input style={S.inp} placeholder="Your name..." value={name} onChange={e=>setName(e.target.value)}/>
        <select style={S.sel} value={cls} onChange={e=>setCls(e.target.value)}>
          {CLASSES.map(c=><option key={c}>{c} Class</option>)}
        </select>
        <button style={S.btn} onClick={()=>name.trim()&&onSave({name:name.trim(),cls,plan:"free",joinedAt:Date.now(),shareCount:0,shareBonus:null})}>
          Get Started ðŸš€
        </button>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OWNER MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function OwnerModal({apiKey,onSave,onClose}){
  const [key,setKey]=useState(apiKey||"");
  const [pass,setPass]=useState("");
  const [auth,setAuth]=useState(false);
  const [err,setErr]=useState("");
  const verify=()=>{ pass==="aiustaad786"?( setAuth(true),setErr("")):setErr("âŒ Wrong password!"); };
  const save=()=>{ if(!key.trim().startsWith("sk-")){setErr("âŒ Invalid key!");return;} onSave(key.trim()); };
  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span style={S.mTitle}>âš™ï¸ Owner Settings</span>
          <button style={S.closeBtn} onClick={onClose}>âœ•</button>
        </div>
        <p style={{fontSize:12,color:"#94a3b8",margin:0}}>Only for the app owner</p>
        {!auth?(
          <>
            <input style={S.inp} type="password" placeholder="Owner password..." value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verify()}/>
            {err&&<div style={{color:"#dc2626",fontSize:13}}>{err}</div>}
            <button style={S.btn} onClick={verify}>Verify ðŸ”</button>
          </>
        ):(
          <>
            <div style={{fontSize:13,color:"#64748b"}}>Paste Claude API key:</div>
            <input style={S.inp} type="password" placeholder="sk-ant-api03-..." value={key} onChange={e=>setKey(e.target.value)}/>
            {apiKey&&<div style={{color:"#22c55e",fontSize:12}}>âœ… Current: {apiKey.slice(0,14)}...</div>}
            {err&&<div style={{color:"#dc2626",fontSize:13}}>{err}</div>}
            <button style={S.btn} onClick={save}>Save API Key âœ…</button>
          </>
        )}
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UPGRADE MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function UpgradeModal({plan,onUpgrade,onClose}){
  const plans=[
    {id:"free",  icon:"ðŸ†“",name:"Free",       price:"$0",        f:["10 questions/day","AI Tutor","Group Study"]},
    {id:"pro",   icon:"âš¡",name:"Pro Student", price:"$5/month",  f:["Unlimited questions","Exam Practice","MCQ Generator","Study Planner","Translator"]},
    {id:"class", icon:"ðŸ«",name:"Class Pack",  price:"$30/month", f:["30 Students","Custom Exams","Full Reports","Priority Support"]},
  ];
  return(
    <div style={S.overlay}>
      <div style={{...S.modal,maxWidth:440}}>
        <div style={S.mHead}>
          <span style={S.mTitle}>ðŸ’Ž Upgrade Plan</span>
          <button style={S.closeBtn} onClick={onClose}>âœ•</button>
        </div>
        {plans.map(p=>(
          <div key={p.id} style={{border:`1px solid ${plan===p.id?PLANS[p.id].color:"#e2e8f0"}`,background:plan===p.id?PLANS[p.id].color+"0d":"#fff",borderRadius:14,padding:14,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:24}}>{p.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:"#1e293b"}}>{p.name}</div>
                <div style={{fontWeight:800,color:PLANS[p.id].color}}>{p.price}</div>
              </div>
              {plan!==p.id
                ?<button style={{...S.btn,width:"auto",padding:"6px 16px",fontSize:13,background:PLANS[p.id].color}} onClick={()=>onUpgrade(p.id)}>Get</button>
                :<span style={{color:"#22c55e",fontWeight:700,fontSize:13}}>âœ“ Active</span>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {p.f.map(f=><span key={f} style={{background:"#f8fafc",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#64748b",border:"1px solid #e2e8f0"}}>âœ“ {f}</span>)}
            </div>
          </div>
        ))}
        <p style={{fontSize:11,color:"#94a3b8",textAlign:"center",margin:0}}>ðŸ’³ EasyPaisa / JazzCash / Stripe â€” coming soon!</p>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LANG MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function LangModal({current,onSelect,onClose}){
  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span style={S.mTitle}>ðŸŒ Select Language</span>
          <button style={S.closeBtn} onClick={onClose}>âœ•</button>
        </div>
        {LANGS.map(l=>(
          <button key={l.id} style={{display:"flex",alignItems:"center",gap:12,border:`1px solid ${current===l.id?"#6366f1":"#e2e8f0"}`,background:current===l.id?"#6366f10d":"#fff",borderRadius:12,padding:"12px 16px",cursor:"pointer",color:"#1e293b",fontSize:15,width:"100%",marginBottom:8}} onClick={()=>onSelect(l.id)}>
            <span style={{fontSize:22}}>{l.flag}</span>
            <span style={{fontWeight:600}}>{l.label}</span>
            {current===l.id&&<span style={{color:"#22c55e",marginLeft:"auto"}}>âœ“</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SHARE MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ShareModal({user,onUpdate,onClose}){
  const [copied,setCopied]=useState(false);
  const shareCount  = user?.shareCount||0;
  const remaining   = Math.max(0,SHARE_REQUIRED-shareCount);
  const hasBonus    = user?.shareBonus && new Date(user.shareBonus)>new Date();
  const shareLink   = `https://aiustaad.vercel.app?ref=${user?.name?.replace(/\s/g,"")||"friend"}`;

  const copyLink=()=>{
    navigator.clipboard.writeText(shareLink).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  const whatsapp=()=>{
    const msg=`ðŸ“š AI Ustaad - Pakistan ka best AI study app! Bilkul free try karo:\n${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
  };

  const markShared=()=>{
    const newCount=(user?.shareCount||0)+1;
    let bonus=user?.shareBonus||null;
    if(newCount>=SHARE_REQUIRED){
      bonus=new Date(Date.now()+7*24*60*60*1000).toISOString();
      onUpdate({...user,shareCount:0,shareBonus:bonus});
    } else {
      onUpdate({...user,shareCount:newCount});
    }
  };

  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span style={S.mTitle}>ðŸŽ Share to Unlock</span>
          <button style={S.closeBtn} onClick={onClose}>âœ•</button>
        </div>

        {hasBonus?(
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:14,padding:16,textAlign:"center"}}>
            <div style={{fontSize:36}}>ðŸŽ‰</div>
            <div style={{fontWeight:700,color:"#16a34a",fontSize:16,marginTop:8}}>1 Week Bonus Active!</div>
            <div style={{color:"#64748b",fontSize:13,marginTop:4}}>Expires: {new Date(user.shareBonus).toLocaleDateString()}</div>
            <div style={{color:"#64748b",fontSize:13,marginTop:4}}>Enjoy unlimited AI! ðŸš€</div>
          </div>
        ):(
          <>
            <div style={{background:"#fef9c3",border:"1px solid #fef08a",borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontWeight:700,color:"#854d0e",fontSize:14}}>Daily limit reached!</div>
              <div style={{color:"#92400e",fontSize:13,marginTop:4}}>Share with {remaining} more friends â†’ 1 week FREE!</div>
            </div>

            {/* Progress */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:14,border:"1px solid #e2e8f0"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#64748b",marginBottom:8}}>
                <span>Shared: {shareCount}/{SHARE_REQUIRED}</span>
                <span>{remaining} more needed</span>
              </div>
              <div style={{background:"#e2e8f0",borderRadius:9,height:10,overflow:"hidden",marginBottom:10}}>
                <div style={{height:"100%",width:`${Math.min(100,shareCount/SHARE_REQUIRED*100)}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)",borderRadius:9}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {[1,2,3,4,5].map(i=>(
                  <div key={i} style={{width:36,height:36,borderRadius:"50%",background:shareCount>=i?"#6366f1":"#f1f5f9",border:`2px solid ${shareCount>=i?"#6366f1":"#e2e8f0"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:shareCount>=i?"#fff":"#94a3b8"}}>
                    {shareCount>=i?"âœ“":"ðŸ‘¤"}
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#6366f1",wordBreak:"break-all"}}>{shareLink}</div>

            <button style={{...S.btn,background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={whatsapp}>
              ðŸ“± Share on WhatsApp
            </button>
            <button style={{...S.btn,background:copied?"#22c55e":"#6366f1"}} onClick={copyLink}>
              {copied?"âœ… Copied!":"ðŸ“‹ Copy Link"}
            </button>
            <button style={{...S.btn,background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0"}} onClick={markShared}>
              âœ… I Sh
