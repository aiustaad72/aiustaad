import { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════
//  OWNER: Apni API key yahan lagao
//  Sirf aap yeh file dekhte hain
//  Users ko kabhi nahi dikhega
// ════════════════════════════════════════
const API_KEY = "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";

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
  { id:"both",    label:"Urdu + English", flag:"🌐" },
  { id:"urdu",    label:"Urdu Only",      flag:"🇵🇰" },
  { id:"english", label:"English Only",   flag:"🇺🇸" },
  { id:"arabic",  label:"Arabic",         flag:"🇸🇦" },
];

function getLang(l) {
  if(l==="urdu")    return "Sirf Urdu mein jawab do.";
  if(l==="english") return "Answer only in English.";
  if(l==="arabic")  return "Answer in Arabic with some English.";
  return "Answer in both Urdu and English.";
}

function store(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function load(k,d){  try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } }

function getUsage(){
  const today=new Date().toDateString();
  const u=load("au_usage",{date:"",count:0});
  return u.date!==today?{date:today,count:0}:u;
}
function addUsage(){ const u=getUsage(); u.count++; store("au_usage",u); }
function canUse(plan,bonus){
  if(plan!=="free") return true;
  if(bonus&&new Date(bonus)>new Date()) return true;
  return getUsage().count<FREE_LIMIT;
}

async function callAI(system,msg,max=1000){
  const r=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:max,system,messages:[{role:"user",content:msg}]})
  });
  const d=await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text||"No response.";
}

// ════════════════════════════════════════
// ROOT
// ════════════════════════════════════════
export default function App(){
  const [page,   setPage]   = useState("splash");
  const [screen, setScreen] = useState("home");
  const [user,   setUser]   = useState(null);
  const [lang,   setLang]   = useState("both");
  const [usage,  setUsage]  = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLang,    setShowLang]    = useState(false);
  const [showShare,   setShowShare]   = useState(false);

  useEffect(()=>{
    const u=load("au_user",null);
    const l=load("au_lang","both");
    if(l) setLang(l);
    setUsage(getUsage().count);
    setTimeout(()=>setPage(u?"app":"onboard"),2000);
    if(u) setUser(u);
  },[]);

  const saveUser=u=>{ setUser(u); store("au_user",u); };
  const saveLang=l=>{ setLang(l); store("au_lang",l); setShowLang(false); };

  const guard=()=>{
    if(!canUse(user?.plan||"free", user?.shareBonus)){
      setShowShare(true); return false;
    }
    addUsage();
    setUsage(getUsage().count);
    return true;
  };

  if(page==="splash")  return <Splash/>;
  if(page==="onboard") return <Onboard onSave={u=>{ saveUser(u); setPage("app"); }}/>;

  const plan=user?.plan||"free";
  const planColor=PLANS[plan].color;
  const hasBonus=user?.shareBonus&&new Date(user.shareBonus)>new Date();

  return(
    <div style={S.root}>
      {/* TOP BAR */}
      <div style={S.topbar}>
        <div style={S.brand}>
          <span style={{fontSize:24}}>📚</span>
          <div style={S.appName}>AI Ustaad</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button style={{...S.pill,borderColor:planColor,color:planColor}} onClick={()=>setShowUpgrade(true)}>
            {hasBonus?"🎁 Bonus":PLANS[plan].name}
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
      {plan==="free"&&!hasBonus&&(
        <div style={S.usageWrap}>
          <div style={{...S.usageFill,width:`${Math.min(100,usage/FREE_LIMIT*100)}%`}}/>
          <span style={S.usageTxt}>{Math.max(0,FREE_LIMIT-usage)} free questions left today</span>
        </div>
      )}

      {/* CONTENT */}
      <div style={S.content}>
        {screen==="home"    && <HomeScreen    user={user} lang={lang} guard={guard} usage={usage} hasBonus={hasBonus} onNav={setScreen} onUpgrade={()=>setShowUpgrade(true)} onShare={()=>setShowShare(true)}/>}
        {screen==="ai"      && <AIScreen      lang={lang} guard={guard} plan={plan} onUpgrade={()=>setShowShare(true)}/>}
        {screen==="group"   && <GroupScreen   lang={lang} userName={user?.name} guard={guard} onUpgrade={()=>setShowShare(true)}/>}
        {screen==="exam"    && <ExamScreen    lang={lang} guard={guard} onUpgrade={()=>setShowShare(true)}/>}
        {screen==="tools"   && <ToolsScreen   lang={lang} guard={guard} onUpgrade={()=>setShowShare(true)}/>}
        {screen==="profile" && <ProfileScreen user={user} usage={usage} plan={plan} hasBonus={hasBonus} onUpgrade={()=>setShowUpgrade(true)} onShare={()=>setShowShare(true)} onSignOut={()=>{ store("au_user",null); setUser(null); setPage("onboard"); }}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={S.nav}>
        {[
          {id:"home",  icon:"🏠", label:"Home"},
          {id:"ai",    icon:"🤖", label:"Tutor"},
          {id:"group", icon:"👥", label:"Group"},
          {id:"exam",  icon:"📝", label:"Exam"},
          {id:"tools", icon:"🛠", label:"Tools"},
          {id:"profile",icon:"👤",label:"Profile"},
        ].map(n=>(
          <button key={n.id} style={{...S.navBtn,borderTop:screen===n.id?`2px solid ${planColor}`:"2px solid transparent"}} onClick={()=>setScreen(n.id)}>
            <span style={{fontSize:20}}>{n.icon}</span>
            <span style={{...S.navLbl,color:screen===n.id?planColor:"#94a3b8"}}>{n.label}</span>
          </button>
        ))}
      </div>

      {showUpgrade && <UpgradeModal plan={plan} onUpgrade={p=>{ saveUser({...user,plan:p}); setShowUpgrade(false); }} onClose={()=>setShowUpgrade(false)}/>}
      {showLang    && <LangModal    current={lang} onSelect={saveLang} onClose={()=>setShowLang(false)}/>}
      {showShare   && <ShareModal   user={user} onUpdate={u=>saveUser(u)} onClose={()=>setShowShare(false)}/>}
    </div>
  );
}

// ════════════════════════════════════════
// SPLASH
// ════════════════════════════════════════
function Splash(){
  return(
    <div style={S.center}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{fontSize:64}}>📚</div>
        <div style={{fontSize:34,fontWeight:900,color:"#6366f1"}}>AI Ustaad</div>
        <div style={{fontSize:14,color:"#94a3b8"}}>Your Smart Study Companion</div>
        <div style={S.loaderWrap}><div style={S.loaderBar}/></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// ONBOARD
// ════════════════════════════════════════
function Onboard({onSave}){
  const [name,setName]=useState("");
  const [cls,setCls]=useState("10th");
  return(
    <div style={S.center}>
      <div style={S.card}>
        <div style={{fontSize:52,textAlign:"center"}}>👋</div>
        <div style={{fontSize:22,fontWeight:800,color:"#6366f1",textAlign:"center"}}>Welcome to AI Ustaad!</div>
        <p style={{fontSize:13,color:"#94a3b8",textAlign:"center",lineHeight:1.6,margin:0}}>Pakistan's smartest AI study assistant!</p>
        <input style={S.inp} placeholder="Your name..." value={name} onChange={e=>setName(e.target.value)}/>
        <select style={S.sel} value={cls} onChange={e=>setCls(e.target.value)}>
          {CLASSES.map(c=><option key={c}>{c} Class</option>)}
        </select>
        <button style={S.btn} onClick={()=>name.trim()&&onSave({name:name.trim(),cls,plan:"free",joinedAt:Date.now(),shareCount:0,shareBonus:null})}>
          Get Started 🚀
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// UPGRADE MODAL
// ════════════════════════════════════════
function UpgradeModal({plan,onUpgrade,onClose}){
  const plans=[
    {id:"free",  icon:"🆓",name:"Free",       price:"$0",        f:["10 questions/day","AI Tutor","Group Study"]},
    {id:"pro",   icon:"⚡",name:"Pro Student", price:"$5/month",  f:["Unlimited questions","Exam Practice","MCQ Generator","Study Planner","Translator","📸 Photo Questions"]},
    {id:"class", icon:"🏫",name:"Class Pack",  price:"$30/month", f:["30 Students","Custom Exams","Full Reports","Priority Support"]},
  ];
  return(
    <div style={S.overlay}>
      <div style={{...S.modal,maxWidth:440}}>
        <div style={S.mHead}>
          <span style={S.mTitle}>💎 Upgrade Plan</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
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
                :<span style={{color:"#22c55e",fontWeight:700,fontSize:13}}>✓ Active</span>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {p.f.map(f=><span key={f} style={{background:"#f8fafc",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#64748b",border:"1px solid #e2e8f0"}}>✓ {f}</span>)}
            </div>
          </div>
        ))}
        <p style={{fontSize:11,color:"#94a3b8",textAlign:"center",margin:0}}>💳 EasyPaisa / JazzCash / Stripe — coming soon!</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// LANG MODAL
// ════════════════════════════════════════
function LangModal({current,onSelect,onClose}){
  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span style={S.mTitle}>🌐 Select Language</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        {LANGS.map(l=>(
          <button key={l.id} style={{display:"flex",alignItems:"center",gap:12,border:`1px solid ${current===l.id?"#6366f1":"#e2e8f0"}`,background:current===l.id?"#6366f10d":"#fff",borderRadius:12,padding:"12px 16px",cursor:"pointer",color:"#1e293b",fontSize:15,width:"100%",marginBottom:8}} onClick={()=>onSelect(l.id)}>
            <span style={{fontSize:22}}>{l.flag}</span>
            <span style={{fontWeight:600}}>{l.label}</span>
            {current===l.id&&<span style={{color:"#22c55e",marginLeft:"auto"}}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// SHARE MODAL
// ════════════════════════════════════════
function ShareModal({user,onUpdate,onClose}){
  const [copied,setCopied]=useState(false);
  const shareCount=user?.shareCount||0;
  const remaining=Math.max(0,SHARE_REQUIRED-shareCount);
  const hasBonus=user?.shareBonus&&new Date(user.shareBonus)>new Date();
  const shareLink=`https://aiustaad-eight.vercel.app?ref=${user?.name?.replace(/\s/g,"")||"friend"}`;

  const copy=()=>{ navigator.clipboard.writeText(shareLink).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }); };
  const whatsapp=()=>{ window.open(`https://wa.me/?text=${encodeURIComponent(`📚 AI Ustaad - Pakistan ka best AI study app! Free try karo:\n${shareLink}`)}`,"_blank"); };
  const markShared=()=>{
    const n=(user?.shareCount||0)+1;
    if(n>=SHARE_REQUIRED){
      const bonus=new Date(Date.now()+7*24*60*60*1000).toISOString();
      onUpdate({...user,shareCount:0,shareBonus:bonus});
    } else {
      onUpdate({...user,shareCount:n});
    }
  };

  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span style={S.mTitle}>🎁 Share to Unlock</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        {hasBonus?(
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:14,padding:16,textAlign:"center"}}>
            <div style={{fontSize:36}}>🎉</div>
            <div style={{fontWeight:700,color:"#16a34a",fontSize:16,marginTop:8}}>1 Week Bonus Active!</div>
            <div style={{color:"#64748b",fontSize:13,marginTop:4}}>Expires: {new Date(user.shareBonus).toLocaleDateString()}</div>
          </div>
        ):(
          <>
            <div style={{background:"#fef9c3",border:"1px solid #fef08a",borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontWeight:700,color:"#854d0e"}}>Daily limit reached!</div>
              <div style={{color:"#92400e",fontSize:13,marginTop:4}}>Share with {remaining} more friends → 1 week FREE!</div>
            </div>
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
                    {shareCount>=i?"✓":"👤"}
                  </div>
                ))}
              </div>
            </div>
            <button style={{...S.btn,background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={whatsapp}>📱 Share on WhatsApp</button>
            <button style={{...S.btn,background:copied?"#22c55e":"#6366f1"}} onClick={copy}>{copied?"✅ Copied!":"📋 Copy Link"}</button>
            <button style={{...S.btn,background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0"}} onClick={markShared}>✅ I Shared It! ({shareCount}/{SHARE_REQUIRED})</button>
            <div style={{fontSize:11,color:"#94a3b8",textAlign:"center"}}>Or upgrade to Pro → $5/month</div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// HOME
// ════════════════════════════════════════
function HomeScreen({user,lang,guard,usage,hasBonus,onNav,onUpgrade,onShare}){
  const [tip,setTip]=useState("Tap to get today's motivational study tip! 💡");
  const [tipLoad,setTipLoad]=useState(false);
  const plan=user?.plan||"free";

  const getTip=async()=>{
    if(!guard()) return;
    setTipLoad(true);
    try{ const t=await callAI(`Motivational study coach. ${getLang(lang)}`,"Give one powerful motivational study tip in 2 lines.",150); setTip(t); }
    catch(e){ setTip("❌ "+e.message); }
    setTipLoad(false);
  };

  return(
    <div style={S.page}>
      <div style={S.welcomeCard}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:"#ffffff33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff"}}>{user?.name?.[0]||"S"}</div>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>Hello, {user?.name?.split(" ")[0]}! 👋</div>
            <div style={{fontSize:12,color:"#c7d2fe"}}>What would you like to study today?</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
          <span style={S.wTag}>🎓 {user?.cls}</span>
          <span style={S.wTag}>{hasBonus?"🎁 Bonus Active":`${Math.max(0,FREE_LIMIT-usage)} questions left`}</span>
          <span style={{...S.wTag,fontWeight:700}}>{PLANS[plan].name}</span>
        </div>
      </div>

      <div style={S.tipCard} onClick={getTip}>
        <div style={{fontSize:12,fontWeight:700,color:"#6366f1",marginBottom:6}}>💡 Daily Tip {tipLoad&&"⏳"}</div>
        <div style={{fontSize:13,color:"#475569",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{tip}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {id:"ai",   icon:"🤖",title:"AI Tutor",    desc:"Ask any question",   c:"#6366f1"},
          {id:"group",icon:"👥",title:"Group Study", desc:"Study with friends",  c:"#8b5cf6"},
          {id:"exam", icon:"📝",title:"Exam Prep",   desc:"AI-generated papers", c:"#ec4899"},
          {id:"tools",icon:"🛠",title:"Study Tools", desc:"MCQ, Notes, Planner", c:"#06b6d4"},
        ].map(f=>(
          <div key={f.id} style={{background:"#fff",border:`1px solid ${f.c}33`,borderRadius:16,padding:"14px 12px",cursor:"pointer",boxShadow:"0 1px 3px #0001"}} onClick={()=>onNav(f.id)}>
            <div style={{width:40,height:40,borderRadius:12,background:f.c+"15",color:f.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:6}}>{f.icon}</div>
            <div style={{fontWeight:700,fontSize:13,color:"#1e293b"}}>{f.title}</div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{f.desc}</div>
          </div>
        ))}
      </div>

      {plan==="free"&&!hasBonus&&(
        <div style={{background:"#fef9c3",border:"1px solid #fef08a",borderRadius:12,padding:"10px 14px",fontSize:13,cursor:"pointer",color:"#854d0e",textAlign:"center"}} onClick={onShare}>
          🎁 Share with 5 friends → Get 1 week FREE unlimited!
        </div>
      )}
      {plan==="free"&&(
        <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"10px 14px",fontSize:13,cursor:"pointer",color:"#1d4ed8",textAlign:"center"}} onClick={onUpgrade}>
          ⚡ Upgrade to Pro — Unlimited AI + Exam + MCQ → <strong>$5/month</strong>
        </div>
      )}
      <div style={{background:"#f8fafc",border:"1px dashed #e2e8f0",borderRadius:10,padding:"10px 14px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>📢 Advertisement — Google AdSense</div>
    </div>
  );
}

// ════════════════════════════════════════
// AI TUTOR
// ════════════════════════════════════════
function AIScreen({lang,guard,plan,onUpgrade}){
  const [msgs,setMsgs]=useState([{role:"ai",text:"Hello! 👋 I'm your AI Ustaad!\n\nAsk me anything in Urdu, English, or Arabic.\nMath, Physics, Chemistry, Biology — I'm here to help! 🎓\n\n📸 Pro users: tap camera to send a photo!"}]);
  const [input,setInput]=useState("");
  const [subject,setSubject]=useState("General");
  const [loading,setLoading]=useState(false);
  const [imgPreview,setImgPreview]=useState(null);
  const [imgBase64,setImgBase64]=useState(null);
  const [imgType,setImgType]=useState("image/jpeg");
  const endRef=useRef();
  const fileRef=useRef();
  const isPro=plan==="pro"||plan==="class";

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  const handlePhoto=e=>{
    const file=e.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{ setImgBase64(ev.target.result.split(",")[1]); setImgPreview(ev.target.result); setImgType(file.type||"image/jpeg"); };
    reader.readAsDataURL(file);
  };

  const send=async()=>{
    const q=input.trim();
    if(!q&&!imgBase64) return;
    if(!guard()){onUpgrade();return;}
    const curImg=imgBase64; const curPrev=imgPreview; const curType=imgType;
    setInput(""); setImgBase64(null); setImgPreview(null);
    setMsgs(m=>[...m,{role:"user",text:q||(curImg?"📸 Photo question":""),img:curPrev}]);
    setLoading(true);
    try{
      const sys=`Expert AI tutor for Pakistani students. Subject: ${subject}. ${getLang(lang)} Give clear step-by-step solutions. End with short motivation.`;
      const history=msgs.slice(-6).map(m=>({role:m.role==="user"?"user":"assistant",content:m.text}));
      const userContent=curImg?[{type:"image",source:{type:"base64",media_type:curType,data:curImg}},{type:"text",text:q||"Solve this question from the image step by step."}]:q;
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:[...history,{role:"user",content:userContent}]})
      });
      const d=await res.json();
      setMsgs(m=>[...m,{role:"ai",text:d.error?"❌ "+d.error.message:d.content?.[0]?.text||"Error"}]);
    }catch(e){setMsgs(m=>[...m,{role:"ai",text:"❌ "+e.message}]);}
    setLoading(false);
  };

  return(
    <div style={S.chatPage}>
      <div style={S.chipBar}>
        {SUBJECTS.slice(0,8).map(s=>(
          <button key={s} style={{...S.chip,background:subject===s?"#6366f1":"#f1f5f9",color:subject===s?"#fff":"#475569",borderColor:subject===s?"#6366f1":"#e2e8f0"}} onClick={()=>setSubject(s)}>{s}</button>
        ))}
      </div>
      <div style={S.chatBox}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"83%",gap:4}}>
            {m.img&&<img src={m.img} style={{borderRadius:12,maxWidth:"100%",maxHeight:180,objectFit:"cover",border:"2px solid #6366f1"}} alt="q"/>}
            <div style={{padding:"10px 14px",fontSize:14,lineHeight:1.6,background:m.role==="user"?"#6366f1":"#f8fafc",color:m.role==="user"?"#fff":"#1e293b",borderRadius:m.role==="user"?"18px 18px 4px 18px":"4px 18px 18px 18px",boxShadow:"0 1px 3px #0001"}}>
              {m.role==="ai"&&<span style={{marginRight:6}}>🤖</span>}
              <span style={{whiteSpace:"pre-wrap"}}>{m.text}</span>
            </div>
          </div>
        ))}
        {loading&&<div style={{padding:"10px 14px",alignSelf:"flex-start",background:"#f8fafc",color:"#94a3b8",borderRadius:"4px 18px 18px 18px",fontSize:14}}>🤖 Thinking... ⏳</div>}
        <div ref={endRef}/>
      </div>
      {imgPreview&&(
        <div style={{padding:"6px 12px",background:"#fff",borderTop:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:8}}>
          <img src={imgPreview} style={{width:44,height:44,borderRadius:8,objectFit:"cover",border:"2px solid #6366f1"}} alt="preview"/>
          <span style={{fontSize:12,color:"#6366f1",flex:1}}>📸 Photo ready</span>
          <button style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"4px 8px",cursor:"pointer",color:"#ef4444",fontSize:11}} onClick={()=>{setImgPreview(null);setImgBase64(null);}}>✕</button>
        </div>
      )}
      <div style={S.inputRow}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
        <button style={{...S.sendBtn,background:isPro?"#ec4899":"#e2e8f0",color:isPro?"#fff":"#94a3b8",position:"relative"}} onClick={()=>{if(!isPro){onUpgrade();return;}fileRef.current?.click();}}>
          📸
          {!isPro&&<span style={{position:"absolute",top:-5,right:-5,background:"#f59e0b",borderRadius:"50%",width:15,height:15,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900}}>⭐</span>}
        </button>
        <input style={S.chatInp} placeholder="Ask your question..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button style={S.sendBtn} onClick={send} disabled={loading}>➤</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// GROUP STUDY
// ════════════════════════════════════════
function GroupScreen({lang,userName,guard,onUpgrade}){
  const [joined,setJoined]=useState(false);
  const [myRoom,setMyRoom]=useState("");
  const [code,setCode]=useState("");
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [members,setMembers]=useState([]);
  const [loading,setLoading]=useState(false);
  const endRef=useRef();
  const pollRef=useRef();

  const create=()=>{
    const c=Math.random().toString(36).substring(2,7).toUpperCase();
    ROOMS[c]={msgs:[{from:"System",text:`🎉 Room "${c}" created! Share this code with friends.`,time:Date.now()}],members:[userName]};
    enter(c);
  };
  const join=()=>{
    const c=code.toUpperCase().trim();
    if(!c) return;
    if(!ROOMS[c]) ROOMS[c]={msgs:[{from:"System",text:`📚 Room "${c}" is active!`,time:Date.now()}],members:[]};
    if(!ROOMS[c].members.includes(userName)) ROOMS[c].members.push(userName);
    ROOMS[c].msgs.push({from:"System",text:`👋 ${userName} joined!`,time:Date.now()});
    enter(c);
  };
  const enter=c=>{setMyRoom(c);setMsgs([...ROOMS[c].msgs]);setMembers([...ROOMS[c].members]);setJoined(true);};

  useEffect(()=>{
    if(!joined) return;
    pollRef.current=setInterval(()=>{if(ROOMS[myRoom]){setMsgs([...ROOMS[myRoom].msgs]);setMembers([...ROOMS[myRoom].members]);}},800);
    return()=>clearInterval(pollRef.current);
  },[joined,myRoom]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const send=async(aiMode=false)=>{
    const text=input.trim();
    if(!text&&!aiMode) return;
    if(!guard()){onUpgrade();return;}
    if(text){ROOMS[myRoom].msgs.push({from:userName,text,time:Date.now()});setInput("");setMsgs([...ROOMS[myRoom].msgs]);}
    if(aiMode||text.toLowerCase().startsWith("@ai")){
      setLoading(true);
      const q=text.replace(/@ai/i,"").trim()||text;
      try{
        const reply=await callAI(`Group study AI tutor. ${getLang(lang)} Keep answers short.`,q,600);
        ROOMS[myRoom].msgs.push({from:"🤖 AI Ustaad",text:reply,time:Date.now(),isAI:true});
        setMsgs([...ROOMS[myRoom].msgs]);
      }catch(e){ROOMS[myRoom].msgs.push({from:"System",text:"❌ "+e.message,time:Date.now()});setMsgs([...ROOMS[myRoom].msgs]);}
      setLoading(false);
    }
  };

  if(!joined) return(
    <div style={S.page}>
      <div style={{fontSize:18,fontWeight:700,color:"#1e293b"}}>👥 Group Study</div>
      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:18,display:"flex",flexDirection:"column",gap:14,boxShadow:"0 1px 3px #0001"}}>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:"#1e293b",marginBottom:6}}>🆕 Create New Room</div>
          <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 8px"}}>Create a room and share the code</p>
          <button style={S.btn} onClick={create}>Create Room ✨</button>
        </div>
        <div style={{textAlign:"center",color:"#94a3b8",fontWeight:700}}>OR</div>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:"#1e293b",marginBottom:6}}>🔗 Join a Room</div>
          <input style={{...S.inp,marginBottom:8}} placeholder="Room Code (e.g. XK9P2)" value={code} onChange={e=>setCode(e.target.value)}/>
          <button style={S.btn} onClick={join}>Join Room →</button>
        </div>
      </div>
      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#1d4ed8"}}>💡 Type @ai in chat to ask AI Ustaad!</div>
    </div>
  );

  return(
    <div style={S.chatPage}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#fff",borderBottom:"1px solid #e2e8f0",fontSize:12,flexShrink:0,flexWrap:"wrap",gap:6}}>
        <span style={{fontWeight:700,color:"#1e293b"}}>🏠 Room: {myRoom}</span>
        <div style={{display:"flex",gap:4}}>{members.map(m=><span key={m} style={{background:"#eff6ff",color:"#6366f1",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{m}</span>)}</div>
        <span style={{color:"#6366f1",fontSize:11}}>@ai = ask AI</span>
      </div>
      <div style={S.chatBox}>
        {msgs.map((m,i)=>(
          <div key={i} style={{padding:"10px 12px",borderRadius:10,marginBottom:4,background:m.from===userName?"#6366f10d":m.isAI?"#10b9810d":"#f8fafc",border:`1px solid ${m.from===userName?"#6366f133":m.isAI?"#10b98133":"#e2e8f0"}`}}>
            <span style={{fontWeight:600,fontSize:11,display:"block",marginBottom:3,color:m.isAI?"#10b981":m.from===userName?"#6366f1":"#94a3b8"}}>{m.from}</span>
            <span style={{whiteSpace:"pre-wrap",fontSize:14,color:"#1e293b"}}>{m.text}</span>
          </div>
        ))}
        {loading&&<div style={{padding:"10px 12px",borderRadius:10,background:"#10b9810d",border:"1px solid #10b98133"}}><span style={{color:"#10b981"}}>🤖 AI is thinking...</span></div>}
        <div ref={endRef}/>
      </div>
      <div style={S.inputRow}>
        <input style={S.chatInp} placeholder="Message or @ai question..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button style={{...S.sendBtn,background:"#10b981"}} onClick={()=>send(true)} disabled={loading}>🤖</button>
        <button style={S.sendBtn} onClick={()=>send()} disabled={loading}>➤</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// EXAM
// ════════════════════════════════════════
function ExamScreen({lang,guard,onUpgrade}){
  const [step,setStep]=useState("setup");
  const [subject,setSubject]=useState("Mathematics");
  const [cls,setCls]=useState("10th");
  const [numQ,setNumQ]=useState(5);
  const [qs,setQs]=useState([]);
  const [ans,setAns]=useState({});
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [timeLeft,setTimeLeft]=useState(0);
  const timerRef=useRef();

  const start=async()=>{
    if(!guard()){onUpgrade();return;}
    setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,system:`Return ONLY valid JSON array. No markdown. ${getLang(lang)}`,messages:[{role:"user",content:`Create ${numQ} MCQ for ${cls} ${subject} Pakistani students. JSON:[{"q":"...","options":["A)...","B)...","C)...","D)..."],"answer":"A)...","explanation":"..."}]`}]})
      });
      const d=await res.json();
      let t=d.content?.[0]?.text||"[]";
      t=t.replace(/```json|```/g,"").trim();
      setQs(JSON.parse(t));setAns({});setTimeLeft(numQ*90);setStep("exam");
    }catch(e){alert("Error: "+e.message);}
    setLoading(false);
  };

  useEffect(()=>{
    if(step!=="exam") return;
    timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);submit();return 0;}return t-1;}),1000);
    return()=>clearInterval(timerRef.current);
  },[step]);

  const submit=()=>{
    clearInterval(timerRef.current);
    let score=0;
    const fb=qs.map((q,i)=>{const ok=ans[i]===q.answer;if(ok)score++;return{q:q.q,sel:ans[i]||"—",correct:q.answer,ok,exp:q.explanation};});
    setResult({score,total:qs.length,fb});setStep("result");
  };

  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const pct=result?Math.round(result.score/result.total*100):0;

  if(step==="setup") return(
    <div style={S.page}>
      <div style={{fontSize:18,fontWeight:700,color:"#1e293b"}}>📝 Exam Practice</div>
      <div style={S.card}>
        <label style={{fontSize:12,color:"#64748b",marginBottom:4,display:"block"}}>Subject</label>
        <select style={S.sel} value={subject} onChange={e=>setSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
        <label style={{fontSize:12,color:"#64748b",margin:"10px 0 4px",display:"block"}}>Class</label>
        <select style={S.sel} value={cls} onChange={e=>setCls(e.target.value)}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select>
        <label style={{fontSize:12,color:"#64748b",margin:"10px 0 4px",display:"block"}}>Questions: {numQ}</label>
        <input type="range" min={3} max={15} value={numQ} onChange={e=>setNumQ(+e.target.value)} style={{width:"100%",accentColor:"#6366f1",margin:"6px 0"}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#94a3b8",marginBottom:12}}>
          <span>⏱ {Math.ceil(numQ*1.5)} min</span><span>📝 {numQ} MCQs</span>
        </div>
        <button style={S.btn} onClick={start} disabled={loading}>{loading?"Generating... ⏳":"Start Exam 🚀"}</button>
      </div>
    </div>
  );

  if(step==="exam") return(
    <div style={{...S.page,gap:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#fff",borderRadius:12,border:"1px solid #e2e8f0"}}>
        <span style={{fontWeight:700,color:"#1e293b"}}>{subject}</span>
        <span style={{color:timeLeft<60?"#ef4444":"#22c55e",fontWeight:800,fontSize:18}}>⏱ {fmt(timeLeft)}</span>
        <button style={{...S.btn,width:"auto",padding:"6px 14px",fontSize:13}} onClick={submit}>Submit ✓</button>
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {qs.map((q,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:14,marginBottom:8}}>
            <div style={{fontSize:11,color:"#6366f1",fontWeight:700,marginBottom:4}}>Q{i+1}</div>
            <div style={{fontWeight:600,marginBottom:10,lineHeight:1.5,color:"#1e293b"}}>{q.q}</div>
            {q.options.map(o=>(
              <div key={o} style={{border:`1px solid ${ans[i]===o?"#6366f1":"#e2e8f0"}`,background:ans[i]===o?"#6366f10d":"#fff",color:ans[i]===o?"#6366f1":"#475569",borderRadius:10,padding:"9px 14px",cursor:"pointer",marginBottom:6,fontSize:13}} onClick={()=>setAns(a=>({...a,[i]:o}))}>
                {o}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return(
    <div style={{...S.page,gap:12}}>
      <div style={{textAlign:"center",padding:"16px 0"}}>
        <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:"50%",width:90,height:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <div style={{fontSize:26,fontWeight:900,color:"#fff"}}>{result.score}/{result.total}</div>
          <div style={{fontSize:13,color:"#c7d2fe"}}>{pct}%</div>
        </div>
        <div style={{fontSize:16,fontWeight:700,color:"#1e293b"}}>{pct>=70?"🎉 Excellent!":pct>=40?"👍 Good effort!":"💪 Keep going!"}</div>
      </div>
      {result.fb.map((f,i)=>(
        <div key={i} style={{background:"#fff",border:`1px solid ${f.ok?"#bbf7d0":"#fecaca"}`,borderLeft:`3px solid ${f.ok?"#22c55e":"#ef4444"}`,borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:4,color:"#1e293b"}}>{f.ok?"✅":"❌"} {f.q}</div>
          {!f.ok&&<div style={{color:"#ef4444",fontSize:12}}>Your: {f.sel} | Correct: {f.correct}</div>}
          <div style={{color:"#94a3b8",fontSize:11,marginTop:3}}>💡 {f.exp}</div>
        </div>
      ))}
      <button style={S.btn} onClick={()=>setStep("setup")}>Try Again 🔄</button>
    </div>
  );
}

// ════════════════════════════════════════
// TOOLS
// ════════════════════════════════════════
function ToolsScreen({lang,guard,onUpgrade}){
  const [active,setActive]=useState("summarize");
  return(
    <div style={{...S.page,gap:12}}>
      <div style={{fontSize:18,fontWeight:700,color:"#1e293b"}}>🛠 Study Tools</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["summarize","📚 Summary"],["mcq","✅ MCQ"],["planner","📅 Planner"],["translate","🔄 Translate"]].map(([id,lbl])=>(
          <button key={id} style={{...S.chip,background:active===id?"#6366f1":"#f1f5f9",color:active===id?"#fff":"#475569",borderColor:active===id?"#6366f1":"#e2e8f0",padding:"7px 14px"}} onClick={()=>setActive(id)}>{lbl}</button>
        ))}
      </div>
      {active==="summarize"&&<SumTool   lang={lang} guard={guard} onUpgrade={onUpgrade}/>}
      {active==="mcq"      &&<MCQTool   lang={lang} guard={guard} onUpgrade={onUpgrade}/>}
      {active==="planner"  &&<PlanTool  lang={lang} guard={guard} onUpgrade={onUpgrade}/>}
      {active==="translate"&&<TransTool lang={lang} guard={guard} onUpgrade={onUpgrade}/>}
    </div>
  );
}

function SumTool({lang,guard,onUpgrade}){
  const [text,setText]=useState("");const [res,setRes]=useState("");const [loading,setLoading]=useState(false);const [mode,setMode]=useState("summary");
  const go=async()=>{
    if(!text.trim()) return;
    if(!guard()){onUpgrade();return;}
    setLoading(true);
    try{ const r=await callAI("Student helper.",`${mode==="summary"?`Short bullet summary. ${getLang(lang)}`:mode==="notes"?`Detailed study notes. ${getLang(lang)}`:`Explain very simply. ${getLang(lang)}`}\n\nText:\n${text}`); setRes(r); }
    catch(e){ setRes("❌ "+e.message); }
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:6}}>{[["summary","📋 Summary"],["notes","📝 Notes"],["simple","🧒 Simple"]].map(([m,l])=><button key={m} style={{...S.chip,background:mode===m?"#6366f1":"#f1f5f9",color:mode===m?"#fff":"#475569",borderColor:mode===m?"#6366f1":"#e2e8f0"}} onClick={()=>setMode(m)}>{l}</button>)}</div>
      <textarea style={S.ta} placeholder="Paste your notes or text here..." value={text} onChange={e=>setText(e.target.value)}/>
      <button style={S.btn} onClick={go} disabled={loading}>{loading?"Processing... ⏳":"Process ✨"}</button>
      {res&&<div style={S.resBox}><div style={{fontWeight:700,color:"#6366f1",marginBottom:8}}>✅ Result:</div><div style={{whiteSpace:"pre-wrap",lineHeight:1.7,fontSize:14,color:"#1e293b"}}>{res}</div></div>}
    </div>
  );
}

function MCQTool({lang,guard,onUpgrade}){
  const [topic,setTopic]=useState("");const [num,setNum]=useState(5);const [qs,setQs]=useState([]);const [shown,setShown]=useState({});const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!topic.trim()) return;
    if(!guard()){onUpgrade();return;}
    setLoading(true);setQs([]);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,system:`Return ONLY valid JSON array. No markdown. ${getLang(lang)}`,messages:[{role:"user",content:`Generate ${num} MCQs about "${topic}". JSON:[{"q":"...","options":["A)...","B)...","C)...","D)..."],"answer":"A)...","hint":"..."}]`}]})});
      const d=await res.json();let t=d.content?.[0]?.text||"[]";t=t.replace(/```json|```/g,"").trim();setQs(JSON.parse(t));
    }catch(e){alert("Error: "+e.message);}
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <input style={S.inp} placeholder="Enter topic (e.g. Photosynthesis, Algebra)" value={topic} onChange={e=>setTopic(e.target.value)}/>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:"#64748b"}}>Questions: {num}</span><input type="range" min={3} max={20} value={num} onChange={e=>setNum(+e.target.value)} style={{flex:1,accentColor:"#6366f1"}}/></div>
      <button style={S.btn} onClick={go} disabled={loading}>{loading?"Generating... ⏳":"Generate MCQs 🎯"}</button>
      {qs.map((q,i)=>(
        <div key={i} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:14,marginBottom:4}}>
          <div style={{fontSize:11,color:"#6366f1",fontWeight:700}}>Q{i+1}</div>
          <div style={{fontWeight:600,margin:"6px 0 10px",lineHeight:1.5,color:"#1e293b"}}>{q.q}</div>
          {q.options.map(o=><div key={o} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 10px",marginBottom:4,fontSize:13,color:"#475569"}}>{o}</div>)}
          <button style={{...S.btn,padding:"5px 14px",fontSize:12,width:"auto",marginTop:6}} onClick={()=>setShown(s=>({...s,[i]:!s[i]}))}>
            {shown[i]?"Hide 🙈":"Show Answer 👁"}
          </button>
          {shown[i]&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#166534",marginTop:6}}>✅ {q.answer} — 💡 {q.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function PlanTool({lang,guard,onUpgrade}){
  const [exam,setExam]=useState("");const [days,setDays]=useState(7);const [subs,setSubs]=useState("Math, Physics, Chemistry");const [plan,setPlan]=useState("");const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!exam.trim()) return;
    if(!guard()){onUpgrade();return;}
    setLoading(true);
    try{ const r=await callAI(`Expert study planner. ${getLang(lang)}`,`Exam: "${exam}" in ${days} days. Subjects: ${subs}. Create detailed day-by-day schedule with breaks and motivation.`); setPlan(r); }
    catch(e){ setPlan("❌ "+e.message); }
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <input style={S.inp} placeholder="Exam name (e.g. Matric Final, MDCAT)" value={exam} onChange={e=>setExam(e.target.value)}/>
      <input style={S.inp} placeholder="Subjects (e.g. Math, Physics, Chemistry)" value={subs} onChange={e=>setSubs(e.target.value)}/>
      <div style={{color:"#64748b",fontSize:13}}>Days until exam: {days}</div>
      <input type="range" min={1} max={60} value={days} onChange={e=>setDays(+e.target.value)} style={{accentColor:"#6366f1"}}/>
      <button style={S.btn} onClick={go} disabled={loading}>{loading?"Creating plan... ⏳":"Create Study Plan 📅"}</button>
      {plan&&<div style={S.resBox}><div style={{fontWeight:700,color:"#6366f1",marginBottom:8}}>📅 Your Study Plan:</div><div style={{whiteSpace:"pre-wrap",lineHeight:1.8,fontSize:14,color:"#1e293b"}}>{plan}</div></div>}
    </div>
  );
}

function TransTool({lang,guard,onUpgrade}){
  const [text,setText]=useState("");const [dir,setDir]=useState("ur2en");const [res,setRes]=useState("");const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!text.trim()) return;
    if(!guard()){onUpgrade();return;}
    setLoading(true);
    try{ const r=await callAI({ur2en:"Translate Urdu to English. Only translation.",en2ur:"Translate English to Urdu. Only translation.",auto:"Detect and translate Urdu↔English. Only translation."}[dir],text,500); setRes(r); }
    catch(e){ setRes("❌ "+e.message); }
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["ur2en","🇵🇰 Urdu→Eng"],["en2ur","🇺🇸 Eng→Urdu"],["auto","🔄 Auto"]].map(([v,l])=>(
          <button key={v} style={{...S.chip,background:dir===v?"#06b6d4":"#f1f5f9",color:dir===v?"#fff":"#475569",borderColor:dir===v?"#06b6d4":"#e2e8f0"}} onClick={()=>setDir(v)}>{l}</button>
        ))}
      </div>
      <textarea style={S.ta} placeholder="Enter text to translate..." value={text} onChange={e=>setText(e.target.value)}/>
      <button style={S.btn} onClick={go} disabled={loading}>{loading?"Translating... ⏳":"Translate 🔄"}</button>
      {res&&<div style={S.resBox}><div style={{fontWeight:700,color:"#06b6d4",marginBottom:8}}>✅ Translation:</div><div style={{fontSize:16,lineHeight:1.7,color:"#1e293b"}}>{res}</div></div>}
    </div>
  );
}

// ════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════
function ProfileScreen({user,usage,plan,hasBonus,onUpgrade,onShare,onSignOut}){
  return(
    <div style={S.page}>
      <div style={{fontSize:18,fontWeight:700,color:"#1e293b"}}>👤 Profile</div>
      <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:18,padding:20,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:"#ffffff33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:900,color:"#fff"}}>{user?.name?.[0]?.toUpperCase()||"S"}</div>
        <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{user?.name}</div>
        <div style={{fontSize:13,color:"#c7d2fe"}}>🎓 {user?.cls}</div>
        <span style={{background:"#ffffff22",border:"1px solid #ffffff33",borderRadius:20,padding:"3px 12px",fontSize:12,color:"#fff",fontWeight:700}}>{hasBonus?"🎁 Bonus Active":PLANS[plan].name+" Plan"}</span>
      </div>
      <div style={S.card}>
        <div style={{fontWeight:700,color:"#1e293b",marginBottom:10}}>📊 Today's Usage</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#64748b",marginBottom:6}}>
          <span>{usage} used</span>
          <span>{plan==="free"&&!hasBonus?`${FREE_LIMIT-usage} remaining`:"Unlimited ∞"}</span>
        </div>
        {plan==="free"&&!hasBonus&&(
          <div style={{background:"#f1f5f9",borderRadius:9,height:8,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(100,usage/FREE_LIMIT*100)}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)",borderRadius:9}}/>
          </div>
        )}
      </div>
      <button style={{...S.btn,background:"#fef9c3",color:"#854d0e",border:"1px solid #fef08a"}} onClick={onShare}>🎁 Share with 5 friends → Get 1 week FREE!</button>
      {plan==="free"&&<button style={{...S.btn,background:"linear-gradient(135deg,#6366f1,#ec4899)"}} onClick={onUpgrade}>⚡ Upgrade to Pro — $5/month</button>}
      <div style={S.card}>
        <div style={{fontWeight:700,color:"#1e293b",marginBottom:6}}>📱 Add App to Phone</div>
        <div style={{color:"#64748b",fontSize:13,lineHeight:1.6}}>Chrome → Menu (⋮) → "Add to Home Screen" → Works like a Play Store app! 🎉</div>
      </div>
      <button style={{...S.btn,background:"#f1f5f9",color:"#ef4444",border:"1px solid #fecaca"}} onClick={onSignOut}>Sign Out</button>
      <div style={{background:"#f8fafc",border:"1px dashed #e2e8f0",borderRadius:10,padding:"10px 14px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>📢 Advertisement — Google AdSense</div>
    </div>
  );
}

// ════════════════════════════════════════
// STYLES
// ════════════════════════════════════════
const S={
  root:      {minHeight:"100vh",background:"#f8fafc",color:"#1e293b",fontFamily:"'Segoe UI',Tahoma,sans-serif",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"},
  topbar:    {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:"#fff",borderBottom:"1px solid #e2e8f0",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 3px #0001"},
  brand:     {display:"flex",alignItems:"center",gap:10},
  appName:   {fontSize:18,fontWeight:800,color:"#6366f1"},
  pill:      {border:"1px solid",borderRadius:20,padding:"4px 12px",cursor:"pointer",background:"#fff",fontSize:12,fontWeight:700},
  iconBtn:   {background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:10,padding:"5px 10px",cursor:"pointer",fontSize:14},
  avatarSm:  {width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer"},
  usageWrap: {height:4,background:"#e2e8f0",position:"relative",overflow:"hidden"},
  usageFill: {height:"100%",background:"linear-gradient(90deg,#6366f1,#8b5cf6)",transition:"width 0.3s",position:"absolute",top:0,left:0},
  usageTxt:  {position:"absolute",top:6,right:10,fontSize:10,color:"#94a3b8"},
  content:   {flex:1,overflowY:"auto",paddingBottom:64},
  nav:       {position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,display:"flex",background:"#fff",borderTop:"1px solid #e2e8f0",zIndex:50,boxShadow:"0 -1px 3px #0001"},
  navBtn:    {flex:1,background:"transparent",border:"none",padding:"8px 4px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2},
  navLbl:    {fontSize:9,fontWeight:600},
  center:    {minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"#f8fafc"},
  loaderWrap:{width:180,height:3,background:"#e2e8f0",borderRadius:9,overflow:"hidden",marginTop:8},
  loaderBar: {height:"100%",width:"70%",background:"linear-gradient(90deg,#6366f1,#8b5cf6)",borderRadius:9},
  overlay:   {position:"fixed",inset:0,background:"#00000066",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16},
  modal:     {background:"#fff",borderRadius:20,padding:20,width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:10,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px #0003"},
  mHead:     {display:"flex",justifyContent:"space-between",alignItems:"center"},
  mTitle:    {fontSize:18,fontWeight:800,color:"#1e293b"},
  closeBtn:  {background:"#f1f5f9",border:"none",borderRadius:8,padding:"4px 10px",color:"#475569",cursor:"pointer",fontSize:16},
  page:      {padding:"16px 16px 20px",display:"flex",flexDirection:"column",gap:14},
  chatPage:  {display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"},
  chipBar:   {display:"flex",gap:6,padding:"8px 12px",overflowX:"auto",flexShrink:0,background:"#fff",borderBottom:"1px solid #e2e8f0"},
  chip:      {border:"1px solid",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12,whiteSpace:"nowrap",flexShrink:0,fontWeight:600},
  chatBox:   {flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:8,background:"#f8fafc"},
  inputRow:  {display:"flex",gap:8,padding:"8px 12px",background:"#fff",borderTop:"1px solid #e2e8f0",flexShrink:0},
  chatInp:   {flex:1,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"10px 14px",color:"#1e293b",fontSize:14,outline:"none"},
  sendBtn:   {background:"#6366f1",border:"none",borderRadius:12,padding:"0 16px",color:"white",fontSize:18,cursor:"pointer",flexShrink:0},
  welcomeCard:{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:18,padding:"18px 16px"},
  wTag:      {background:"#ffffff22",border:"1px solid #ffffff33",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#fff"},
  tipCard:   {background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"12px 14px",cursor:"pointer",boxShadow:"0 1px 3px #0001"},
  card:      {background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:16,boxShadow:"0 1px 3px #0001"},
  sel:       {background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",color:"#1e293b",fontSize:14,outline:"none",width:"100%"},
  ta:        {background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:12,color:"#1e293b",fontSize:14,minHeight:110,resize:"vertical",outline:"none",width:"100%",boxSizing:"border-box"},
  resBox:    {background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:14,boxShadow:"0 1px 3px #0001"},
  inp:       {background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"10px 14px",color:"#1e293b",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"},
  btn:       {background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:"12px 20px",color:"white",fontWeight:700,fontSize:15,cursor:"pointer",width:"100%"},
};
