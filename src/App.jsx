"import { useState, useEffect, useRef } from "react";
import AdminPanel from "./AdminPanel.jsx";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FIREBASE CONFIG â€” App settings ke liye
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const FIREBASE_PROJECT = "aiustaad";
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ Constants (defaults â€” Firebase se override honge) â”€â”€
const FREE_LIMIT     = 10;
const SHARE_REQUIRED = 5;
const BONUS_DAYS     = 7;
const COOLDOWN_DAYS  = 7;

const SUBJECTS = ["General","Mathematics","Physics","Chemistry","Biology","English","Urdu","Computer","History","Geography","Economics","Islamic Studies"];
const CLASSES  = ["6th","7th","8th","9th","10th","11th","12th","University"];
const ROOMS    = {};

const PLANS = {
  free:  { name:"Free",       price:"$0",        color:"#f59e0b" },
  pro:   { name:"Pro",        price:"$5/month",  color:"#6366f1" },
  class: { name:"Class Pack", price:"$30/month", color:"#8b5cf6" },
};

const LANGS = [
  { id:"both",    label:"Urdu + English", flag:"ðŸŒ" },
  { id:"urdu",    label:"Only Urdu",      flag:"ðŸ‡µðŸ‡°" },
  { id:"english", label:"Only English",   flag:"ðŸ‡ºðŸ‡¸" },
  { id:"arabic",  label:"Arabic",         flag:"ðŸ‡¸ðŸ‡¦" },
  { id:"hindi",   label:"Hindi",          flag:"ðŸ‡®ðŸ‡³" },
];

const FEATURES = [
  { id:"tutor",  icon:"ðŸ¤–", label:"AI Tutor",       desc:"Ask any question"      },
  { id:"group",  icon:"ðŸ‘¥", label:"Group Study",     desc:"Study with friends"    },
  { id:"exam",   icon:"ðŸ“", label:"Exam Prep",       desc:"Practice with AI"      },
  { id:"tools",  icon:"ðŸ› ", label:"Study Tools",     desc:"MCQ, Notes, Planner"   },
  { id:"tips",   icon:"ðŸ’¡", label:"Daily Tips",      desc:"Motivational tips"     },
];

function getLang(l) {
  if(l==="urdu")    return "Sirf Urdu mein jawab do.";
  if(l==="english") return "Answer only in English.";
  if(l==="arabic")  return "Ø£Ø¬Ø¨ Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© ÙÙ‚Ø·.";
  if(l==="hindi")   return "Sirf Hindi mein jawab do.";
  return "Urdu aur English dono mein jawab do.";
}

function store(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function load(k,d){  try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } }

function getUsage(){
  const today=new Date().toDateString();
  const u=load("au_usage",{date:"",count:0});
  return u.date!==today?{date:today,count:0}:u;
}
function addUsage(){ const u=getUsage(); u.count++; store("au_usage",u); }

function canUse(user){
  const plan=user?.plan||"free";
  if(plan!=="free") return true;
  const bonus=user?.shareBonus;
  if(bonus&&new Date(bonus)>new Date()) return true;
  return getUsage().count<FREE_LIMIT;
}

async function callAPI(body){
  const r=await fetch("/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const d=await r.json();
  if(d.error) throw new Error(d.error.message||"API Error");
  return d.content?.[0]?.text||"No response.";
}

async function askAI(system,msg,max=1000){
  return callAPI({model:"claude-haiku-4-5-20251001",max_tokens:max,system,messages:[{role:"user",content:msg}]});
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROOT APP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function App(){
  // â”€â”€ Admin Panel Route Check â”€â”€
  if(typeof window!=="undefined" && window.location.pathname==="/admin"){
    return <AdminPanel/>;
  }

  const [page,    setPage]    = useState("splash");
  const [user,    setUser]    = useState(null);
  const [lang,    setLang]    = useState("both");
  const [screen,  setScreen]  = useState("tutor");
  const [sidebar, setSidebar] = useState(false);
  const [modal,   setModal]   = useState(null); // upgrade|share|lang|payment

  useEffect(()=>{
    const u=load("au_user",null);
    const l=load("au_lang","both");
    if(l) setLang(l);
    setTimeout(()=>{ if(u){ setUser(u); setPage("app"); } else setPage("onboard"); },1800);
  },[]);

  const saveUser=u=>{ setUser(u); store("au_user",u); };
  const saveLang=l=>{ setLang(l); store("au_lang",l); setModal(null); };

  const guard=()=>{
    if(!canUse(user)){ setModal("share"); return false; }
    addUsage(); return true;
  };

  if(page==="splash")  return <Splash/>;
  if(page==="onboard") return <Onboard onSave={u=>{ saveUser(u); setPage("app"); }}/>;

  const plan=user?.plan||"free";
  const usage=getUsage();
  const hasBonus=user?.shareBonus&&new Date(user.shareBonus)>new Date();
  const inCooldown=user?.shareCooldown&&new Date(user.shareCooldown)>new Date();
  const cooldownLeft=inCooldown?Math.ceil((new Date(user.shareCooldown)-new Date())/(1000*60*60*24)):0;

  return(
    <div style={S.root}>
      {/* SIDEBAR OVERLAY */}
      {sidebar&&<div style={S.sideOverlay} onClick={()=>setSidebar(false)}/>}

      {/* SIDEBAR */}
      <div style={{...S.sidebar, transform:sidebar?"translateX(0)":"translateX(-100%)"}}>
        <div style={S.sideHead}>
          <div style={S.sideLogoRow}>
            <span style={{fontSize:28}}>ðŸ“š</span>
            <div>
              <div style={S.sideAppName}>AI Ustaad</div>
              <div style={S.sidePlan}>{PLANS[plan].name} Plan</div>
            </div>
          </div>
          <div style={S.sideUser}>
            <div style={{...S.avatar,background:PLANS[plan].color}}>{user?.name?.[0]?.toUpperCase()||"U"}</div>
            <div>
              <div style={S.sideUserName}>{user?.name}</div>
              <div style={S.sideUserClass}>{user?.cls}</div>
            </div>
          </div>
        </div>

        {/* Usage bar */}
        {plan==="free"&&!hasBonus&&(
          <div style={S.sideUsage}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#92400e",marginBottom:4}}>
              <span>Daily Usage</span>
              <span>{usage.count}/{FREE_LIMIT}</span>
            </div>
            <div style={{background:"#fde68a",borderRadius:9,height:6,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(100,usage.count/FREE_LIMIT*100)}%`,background:"#f59e0b",borderRadius:9}}/>
            </div>
          </div>
        )}
        {hasBonus&&(
          <div style={{...S.sideUsage,background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
            <div style={{fontSize:12,color:"#16a34a",fontWeight:600}}>ðŸŽ Bonus Active until {new Date(user.shareBonus).toLocaleDateString()}</div>
          </div>
        )}

        {/* Features */}
        <div style={S.sideSection}>Features</div>
        {FEATURES.map(f=>(
          <button key={f.id} style={{...S.sideItem, background:screen===f.id?"#fef3c7":"transparent", fontWeight:screen===f.id?700:400}} onClick={()=>{ setScreen(f.id); setSidebar(false); }}>
            <span style={{fontSize:18}}>{f.icon}</span>
            <div>
              <div style={{fontSize:14,color:"#1e293b"}}>{f.label}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{f.desc}</div>
            </div>
          </button>
        ))}

        {/* Settings */}
        <div style={S.sideSection}>Settings</div>

        <button style={S.sideItem} onClick={()=>{ setModal("lang"); setSidebar(false); }}>
          <span style={{fontSize:18}}>{LANGS.find(l=>l.id===lang)?.flag||"ðŸŒ"}</span>
          <div>
            <div style={{fontSize:14,color:"#1e293b"}}>Language</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>{LANGS.find(l=>l.id===lang)?.label}</div>
          </div>
        </button>

        <button style={S.sideItem} onClick={()=>{ setModal("upgrade"); setSidebar(false); }}>
          <span style={{fontSize:18}}>ðŸ’Ž</span>
          <div>
            <div style={{fontSize:14,color:"#1e293b"}}>Upgrade Plan</div>
            <div style={{fontSize:11,color:PLANS[plan].color}}>{PLANS[plan].name} â€” {PLANS[plan].price}</div>
          </div>
        </button>

        <button style={S.sideItem} onClick={()=>{ setModal("payment"); setSidebar(false); }}>
          <span style={{fontSize:18}}>ðŸ’³</span>
          <div>
            <div style={{fontSize:14,color:"#1e293b"}}>Payment Options</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>EasyPaisa, JazzCash, Stripe</div>
          </div>
        </button>

        <button style={S.sideItem} onClick={()=>{ setModal("share"); setSidebar(false); }}>
          <span style={{fontSize:18}}>ðŸŽ</span>
          <div>
            <div style={{fontSize:14,color:"#1e293b"}}>Share with Friends</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>5 share = 1 week free!</div>
          </div>
        </button>

        <button style={S.sideItem} onClick={()=>{
          if(window.confirm("Add AI Ustaad to your home screen?\n\nOn Chrome: Menu â†’ Add to Home Screen")){
            alert("ðŸ“± Steps:\n1. Tap browser menu (3 dots)\n2. Tap 'Add to Home Screen'\n3. Done! App icon will appear!");
          }
        }}>
          <span style={{fontSize:18}}>ðŸ“±</span>
          <div>
            <div style={{fontSize:14,color:"#1e293b"}}>Add App to Phone</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>Works like Play Store app</div>
          </div>
        </button>

        <div style={{flex:1}}/>

        <button style={{...S.sideItem,borderTop:"1px solid #f1f5f9"}} onClick={()=>{ store("au_user",null); setUser(null); setPage("onboard"); setSidebar(false); }}>
          <span style={{fontSize:18}}>ðŸšª</span>
          <div style={{fontSize:14,color:"#ef4444"}}>Sign Out</div>
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={S.main}>
        {/* TOP BAR */}
        <div style={S.topbar}>
          <button style={S.menuBtn} onClick={()=>setSidebar(true)}>
            <span style={{fontSize:22}}>ðŸ“š</span>
          </button>
          <div style={S.topTitle}>{FEATURES.find(f=>f.id===screen)?.label||"AI Ustaad"}</div>
          <div style={{...S.planBadge,background:PLANS[plan].color}}>
            {hasBonus?"ðŸŽ":PLANS[plan].name}
          </div>
        </div>

        {/* SCREENS */}
        <div style={S.content}>
          {screen==="tutor" && <TutorScreen  lang={lang} guard={guard} user={user} onUpgrade={()=>setModal("share")}/>}
          {screen==="group" && <GroupScreen  lang={lang} guard={guard} userName={user?.name} onUpgrade={()=>setModal("share")}/>}
          {screen==="exam"  && <ExamScreen   lang={lang} guard={guard} onUpgrade={()=>setModal("share")}/>}
          {screen==="tools" && <ToolsScreen  lang={lang} guard={guard} onUpgrade={()=>setModal("share")}/>}
          {screen==="tips"  && <TipsScreen   lang={lang} guard={guard} onUpgrade={()=>setModal("share")}/>}
        </div>
      </div>

      {/* MODALS */}
      {modal==="upgrade"  && <UpgradeModal  plan={plan} onUpgrade={p=>{ saveUser({...user,plan:p}); setModal(null); }} onClose={()=>setModal(null)}/>}
      {modal==="share"    && <ShareModal    user={user} onUpdate={saveUser} onClose={()=>setModal(null)} hasBonus={hasBonus} inCooldown={inCooldown} cooldownLeft={cooldownLeft}/>}
      {modal==="lang"     && <LangModal     current={lang} onSelect={saveLang} onClose={()=>setModal(null)}/>}
      {modal==="payment"  && <PaymentModal  onClose={()=>setModal(null)}/>}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPLASH
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Splash(){
  return(
    <div style={S.center}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
        <div style={{fontSize:72}}>ðŸ“š</div>
        <div style={{fontSize:36,fontWeight:900,color:"#f59e0b"}}>AI Ustaad</div>
        <div style={{fontSize:15,color:"#64748b"}}>Your Smart Study Companion</div>
        <div style={{width:200,height:3,background:"#fde68a",borderRadius:9,overflow:"hidden"}}>
          <div style={{height:"100%",width:"65%",background:"#f59e0b",borderRadius:9}}/>
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ONBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Onboard({onSave}){
  const [name,setName]=useState("");
  const [cls,setCls]=useState("10th");
  return(
    <div style={S.center}>
      <div style={S.card}>
        <div style={{fontSize:52,textAlign:"center"}}>ðŸ‘‹</div>
        <div style={{fontSize:24,fontWeight:800,color:"#f59e0b",textAlign:"center"}}>Welcome!</div>
        <p style={{fontSize:14,color:"#64748b",textAlign:"center",margin:0}}>Pakistan's smartest AI study assistant</p>
        <input style={S.inp} placeholder="Your name..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&name.trim()&&onSave({name:name.trim(),cls,plan:"free",joinedAt:Date.now(),shareCount:0})}/>
        <select style={S.sel} value={cls} onChange={e=>setCls(e.target.value)}>
          {CLASSES.map(c=><option key={c}>{c} Class</option>)}
        </select>
        <button style={S.btn} onClick={()=>name.trim()&&onSave({name:name.trim(),cls,plan:"free",joinedAt:Date.now(),shareCount:0})}>
          Get Started ðŸš€
        </button>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UPGRADE MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function UpgradeModal({plan,onUpgrade,onClose}){
  const [selected,setSelected]=useState(null);
  const plans=[
    {id:"free",  icon:"ðŸ†“",name:"Free",       price:"$0",        f:["10 questions/day","AI Tutor","Group Study","Daily Tips"]},
    {id:"pro",   icon:"âš¡",name:"Pro",         price:"$5/month",  f:["Unlimited questions","Exam Practice","MCQ Generator","Study Planner","Translator","ðŸ“¸ Photo Questions"]},
    {id:"class", icon:"ðŸ«",name:"Class Pack",  price:"$30/month", f:["30 Students","Custom Exams","Full Reports","Priority Support"]},
  ];

  // Payment info â€” Admin panel se change ho sakta hai
  const EASYPAISA = "0300-XXXXXXX";
  const JAZZCASH  = "0300-XXXXXXX";
  const WHATSAPP  = "0300-XXXXXXX";

  if(selected && selected!=="free"){
    return(
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={S.mHead}>
            <span style={S.mTitle}>ðŸ’³ Payment Info</span>
            <button style={S.closeBtn} onClick={()=>setSelected(null)}>â†</button>
          </div>
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:24}}>{plans.find(p=>p.id===selected)?.icon}</div>
            <div style={{fontWeight:700,color:"#92400e"}}>{plans.find(p=>p.id===selected)?.name}</div>
            <div style={{fontWeight:800,color:"#f59e0b",fontSize:18}}>{plans.find(p=>p.id===selected)?.price}</div>
          </div>

          <div style={{fontSize:13,fontWeight:700,color:"#1e293b",marginBottom:4}}>ðŸ“± Payment Methods:</div>

          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:12,marginBottom:8}}>
            <div style={{fontWeight:700,color:"#16a34a",marginBottom:4}}>ðŸ’š EasyPaisa</div>
            <div style={{fontSize:15,fontWeight:800,color:"#1e293b"}}>{EASYPAISA}</div>
          </div>

          <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:12,marginBottom:8}}>
            <div style={{fontWeight:700,color:"#dc2626",marginBottom:4}}>ðŸ”´ JazzCash</div>
            <div style={{fontSize:15,fontWeight:800,color:"#1e293b"}}>{JAZZCASH}</div>
          </div>

          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:12,fontSize:13,color:"#92400e",lineHeight:1.6}}>
            <strong>ðŸ“‹ Steps:</strong><br/>
            1. EasyPaisa/JazzCash se payment karo<br/>
            2. Screenshot lo<br/>
            3. WhatsApp karo: <strong>{WHATSAPP}</strong><br/>
            4. "AI Ustaad Pro" likh kar bhejo<br/>
            5. 24 ghante mein activate ho jayega! âœ…
          </div>

          <button style={{...S.btn,background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>window.open(`https://wa.me/${WHATSAPP.replace(/-/g,"")}?text=${encodeURIComponent("AI Ustaad Pro subscription - payment screenshot attach hai")}`)}>
            ðŸ“± WhatsApp Par Bhejo
          </button>

          <button style={{...S.btn,background:"#f1f5f9",color:"#64748b"}} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return(
    <div style={S.overlay}>
      <div style={{...S.modal,maxWidth:440}}>
        <div style={S.mHead}>
          <span style={S.mTitle}>ðŸ’Ž Upgrade Plan</span>
          <button style={S.closeBtn} onClick={onClose}>âœ•</button>
        </div>
        {plans.map(p=>(
          <div key={p.id} style={{border:`2px solid ${plan===p.id?PLANS[p.id].color:"#f1f5f9"}`,background:plan===p.id?PLANS[p.id].color+"0d":"#fff",borderRadius:14,padding:14,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:26}}>{p.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:"#1e293b"}}>{p.name}</div>
                <div style={{fontWeight:800,color:PLANS[p.id].color,fontSize:15}}>{p.price}</div>
              </div>
              {plan===p.id
                ?<span style={{color:"#22c55e",fontWeight:700}}>âœ“ Active</span>
                :p.id==="free"
                  ?<span style={{color:"#94a3b8",fontSize:12}}>Current</span>
                  :<button style={{...S.btn,width:"auto",padding:"7px 18px",fontSize:13,background:PLANS[p.id].color}} onClick={()=>setSelected(p.id)}>Get â†’</button>
              }
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {p.f.map(f=><span key={f} style={{background:"#f8fafc",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#64748b",border:"1px solid #e2e8f0"}}>âœ“ {f}</span>)}
            </div>
          </div>
        ))}
        <div style={{fontSize:11,color:"#94a3b8",textAlign:"center"}}>Payment ke baad 24 ghante mein activate hoga</div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SHARE MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ShareModal({user,onUpdate,onClose,hasBonus,inCooldown,cooldownLeft}){
  const [justShared,setJustShared]=useState(false);
  const [copied,setCopied]=useState(false);
  const shareCount=user?.shareCount||0;
  const remaining=Math.max(0,SHARE_REQUIRED-shareCount);
  const shareLink=`https://aiustaad-eight.vercel.app`;
  const shareText=`ðŸ“š AI Ustaad - Pakistan ka best AI study app! Bilkul free try karo:\n${shareLink}`;

  const doWhatsApp=()=>{ window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`,"_blank"); setJustShared(true); };
  const doCopy=()=>{ navigator.clipboard.writeText(shareLink).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); setJustShared(true); }); };

  const markShared=()=>{
    if(!justShared){ alert("Pehle Share ya Copy dabao â€” phir yahan click karo!"); return; }
    const n=shareCount+1;
    if(n>=SHARE_REQUIRED){
      const bonusExpiry=new Date(Date.now()+BONUS_DAYS*24*60*60*1000).toISOString();
      const cooldownEnd=new Date(Date.now()+(BONUS_DAYS+COOLDOWN_DAYS)*24*60*60*1000).toISOString();
      onUpdate({...user,shareCount:0,shareBonus:bonusExpiry,shareCooldown:cooldownEnd});
      alert("ðŸŽ‰ 1 week FREE bonus mil gaya!");
      onClose();
    } else {
      onUpdate({...user,shareCount:n});
      setJustShared(false);
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
            <div style={{fontSize:40}}>ðŸŽ‰</div>
            <div style={{fontWeight:700,color:"#16a34a",fontSize:16,marginTop:8}}>Bonus Active!</div>
            <div style={{color:"#64748b",fontSize:13,marginTop:4}}>Expires: {new Date(user.shareBonus).toLocaleDateString()}</div>
            <div style={{color:"#94a3b8",fontSize:11,marginTop:4}}>After expiry, wait {COOLDOWN_DAYS} days, then share with NEW friends!</div>
          </div>
        ):inCooldown?(
          <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:14,padding:16,textAlign:"center"}}>
            <div style={{fontSize:40}}>â³</div>
            <div style={{fontWeight:700,color:"#dc2626",fontSize:16,marginTop:8}}>Please Wait!</div>
            <div style={{color:"#64748b",fontSize:13,marginTop:4}}>{cooldownLeft} din baad share option wapas aayega</div>
            <div style={{color:"#94a3b8",fontSize:11,marginTop:4}}>Tab nayi 5 logon ko share karna hoga!</div>
            <button style={{...S.btn,marginTop:12,background:"#6366f1"}} onClick={()=>{ window.location.href="#upgrade"; onClose(); }}>Ya Pro lo â†’ $5/month</button>
          </div>
        ):(
          <>
            <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontWeight:700,color:"#92400e"}}>Daily limit reached! ðŸ˜Š</div>
              <div style={{color:"#92400e",fontSize:13,marginTop:4}}>Share with {remaining} more NEW friends â†’ 1 week FREE!</div>
            </div>

            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#92400e",marginBottom:8}}>
                <span>Progress: {shareCount}/{SHARE_REQUIRED}</span>
                <span>{remaining} more needed</span>
              </div>
              <div style={{background:"#fde68a",borderRadius:9,height:10,overflow:"hidden",marginBottom:12}}>
                <div style={{height:"100%",width:`${Math.min(100,shareCount/SHARE_REQUIRED*100)}%`,background:"#f59e0b",borderRadius:9,transition:"width 0.3s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {[1,2,3,4,5].map(i=>(
                  <div key={i} style={{width:38,height:38,borderRadius:"50%",background:shareCount>=i?"#f59e0b":"#fff",border:`2px solid ${shareCount>=i?"#f59e0b":"#fde68a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:shareCount>=i?"#fff":"#94a3b8"}}>
                    {shareCount>=i?"âœ“":"ðŸ‘¤"}
                  </div>
                ))}
              </div>
            </div>

            <button style={{...S.btn,background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:16}} onClick={doWhatsApp}>
              ðŸ“± Share on WhatsApp
            </button>
            <button style={{...S.btn,background:copied?"#22c55e":"#f59e0b"}} onClick={doCopy}>
              {copied?"âœ… Link Copied!":"ðŸ“‹ Copy Link"}
            </button>
            <button style={{...S.btn,background:justShared?"#16a34a":"#e2e8f0",color:justShared?"#fff":"#94a3b8"}} onClick={markShared}>
              {justShared?`âœ… Done! (${shareCount+1}/${SHARE_REQUIRED})`:"ðŸ”’ Share First, Then Tap Here"}
            </button>
            <div style={{fontSize:11,color:"#94a3b8",textAlign:"center"}}>âš ï¸ Every time NEW friends required</div>
          </>
        )}
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LANG MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function LangModal({current,onSelect,onClose}){
  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span style={S.mTitle}>ðŸŒ Language</span>
          <button style={S.closeBtn} onClick={onClose}>âœ•</button>
        </div>
        {LANGS.map(l=>(
          <button key={l.id} style={{display:"flex",alignItems:"center",gap:14,border:`2px solid ${current===l.id?"#f59e0b":"#f1f5f9"}`,background:current===l.id?"#fffbeb":"#fff",borderRadius:12,padding:"13px 16px",cursor:"pointer",width:"100%",marginBottom:8}} onClick={()=>onSelect(l.id)}>
            <span style={{fontSize:24}}>{l.flag}</span>
            <span style={{fontWeight:600,color:"#1e293b",fontSize:15}}>{l.label}</span>
            {current===l.id&&<span style={{color:"#f59e0b",marginLeft:"auto",fontWeight:700}}>âœ“</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAYMENT MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function PaymentModal({onClose}){
  const methods=[
    {icon:"ðŸ’š",name:"EasyPaisa",  desc:"0300-XXXXXXX",    color:"#16a34a",status:"Coming Soon"},
    {icon:"ðŸ”´",name:"JazzCash",   desc:"0300-XXXXXXX",    color:"#dc2626",status:"Coming Soon"},
    {icon:"ðŸ”µ",name:"Stripe",     desc:"Visa/Mastercard", color:"#6366f1",status:"Coming Soon"},
    {icon:"ðŸ’›",name:"Payoneer",   desc:"International",   color:"#f59e0b",status:"Coming Soon"},
  ];
  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span style={S.mTitle}>ðŸ’³ Payment Options</span>
          <button style={S.closeBtn} onClick={onClose}>âœ•</button>
        </div>
        <p style={{fontSize:13,color:"#64748b",margin:"0 0 12px"}}>Subscription payment methods â€” coming soon!</p>
        {methods.map(m=>(
          <div key={m.name} style={{display:"flex",alignItems:"center",gap:12,border:"1px solid #f1f5f9",borderRadius:12,padding:"12px 14px",marginBottom:8,background:"#fafafa"}}>
            <span style={{fontSize:26}}>{m.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:"#1e293b"}}>{m.name}</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>{m.desc}</div>
            </div>
            <span style={{fontSize:11,background:"#fef9c3",color:"#92400e",padding:"3px 10px",borderRadius:20,fontWeight:600}}>{m.status}</span>
          </div>
        ))}
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:12,fontSize:13,color:"#92400e",textAlign:"center",marginTop:4}}>
          ðŸ’¡ Abhi Pro use karne ke liye <strong>Share with 5 friends</strong> option use karo â€” 1 week FREE!
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AI TUTOR SCREEN â€” ChatGPT Style
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function TutorScreen({lang,guard,user,onUpgrade}){
  const [msgs,setMsgs]=useState(()=>{
    // Load saved conversation from localStorage
    try{ const saved=localStorage.getItem("au_chat"); return saved?JSON.parse(saved):[]; }catch{ return []; }
  });
  const [input,setInput]=useState("");
  const [subject,setSubject]=useState("General");
  const [loading,setLoading]=useState(false);
  const [imgB64,setImgB64]=useState(null);
  const [imgPrev,setImgPrev]=useState(null);
  const [imgType,setImgType]=useState("image/jpeg");
  const endRef=useRef();
  const fileRef=useRef();
  const isPro=(user?.plan||"free")!=="free";

  // Save chat history whenever msgs change
  useEffect(()=>{
    if(msgs.length>0){
      // Save last 30 messages (without images to save space)
      const toSave=msgs.slice(-30).map(m=>({...m,img:undefined}));
      try{ localStorage.setItem("au_chat",JSON.stringify(toSave)); }catch{}
    }
  },[msgs]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,loading]);

  const handlePhoto=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{ setImgB64(ev.target.result.split(",")[1]); setImgPrev(ev.target.result); setImgType(f.type||"image/jpeg"); };
    r.readAsDataURL(f);
  };

  const send=async()=>{
    const q=input.trim();
    if(!q&&!imgB64) return;
    if(!guard()){onUpgrade();return;}
    const curImg=imgB64; const curPrev=imgPrev; const curType=imgType;
    setInput(""); setImgB64(null); setImgPrev(null);
    const userMsg={role:"user",text:q||(curImg?"ðŸ“¸ Photo question":""),img:curPrev};
    setMsgs(m=>[...m,userMsg]);
    setLoading(true);
    try{
      const sys=`Expert AI tutor for Pakistani students. Subject: ${subject}. ${getLang(lang)} Give clear step-by-step answers. End with short motivation.`;
      const history=msgs.slice(-6).map(m=>({role:m.role==="user"?"user":"assistant",content:m.text}));
      const userContent=curImg
        ?[{type:"image",source:{type:"base64",media_type:curType,data:curImg}},{type:"text",text:q||"Solve this question step by step."}]
        :q;
      const body={model:"claude-haiku-4-5-20251001",max_tokens:1000,system:sys,messages:[...history,{role:"user",content:userContent}]};
      const reply=await callAPI(body);
      setMsgs(m=>[...m,{role:"ai",text:reply}]);
    }catch(e){setMsgs(m=>[...m,{role:"ai",text:"âŒ "+e.message}]);}
    setLoading(false);
  };

  const clearChat=()=>{ if(window.confirm("Clear conversation history?")){ setMsgs([]); try{localStorage.removeItem("au_chat");}catch{} } };

  return(
    <div style={S.chatWrap}>
      {/* Subject bar */}
      <div style={{...S.subBar,justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:6,overflowX:"auto",flex:1}}>
          {SUBJECTS.slice(0,8).map(s=>(
            <button key={s} style={{...S.subChip,background:subject===s?"#f59e0b":"#fff",color:subject===s?"#fff":"#475569",border:`1px solid ${subject===s?"#f59e0b":"#e2e8f0"}`}} onClick={()=>setSubject(s)}>{s}</button>
          ))}
        </div>
        {msgs.length>0&&<button onClick={clearChat} style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"4px 10px",cursor:"pointer",color:"#ef4444",fontSize:12,flexShrink:0,marginLeft:6}}>ðŸ—‘</button>}
      </div>

      {/* Messages */}
      <div style={S.chatBox}>
        {msgs.length===0&&(
          <div style={S.emptyState}>
            <div style={{fontSize:48}}>ðŸ¤–</div>
            <div style={{fontSize:18,fontWeight:700,color:"#1e293b",marginTop:12}}>Hello! I'm AI Ustaad</div>
            <div style={{fontSize:14,color:"#64748b",marginTop:6,textAlign:"center"}}>Ask me anything in Urdu, English, Arabic or Hindi!</div>
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row"}}>
            <div style={{...S.msgAvatar,background:m.role==="user"?"#f59e0b":"#1e293b",flexShrink:0}}>
              {m.role==="user"?user?.name?.[0]?.toUpperCase()||"U":"ðŸ¤–"}
            </div>
            <div style={{maxWidth:"80%"}}>
              {m.img&&<img src={m.img} style={{borderRadius:10,maxWidth:"100%",maxHeight:160,objectFit:"cover",marginBottom:6,display:"block"}} alt="q"/>}
              <div style={{...S.msgBubble,background:m.role==="user"?"#f59e0b":"#fff",color:m.role==="user"?"#fff":"#1e293b",borderRadius:m.role==="user"?"18px 4px 18px 18px":"4px 18px 18px 18px"}}>
                <span style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{m.text}</span>
              </div>
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",gap:10,padding:"8px 0"}}>
            <div style={{...S.msgAvatar,background:"#1e293b"}}>ðŸ¤–</div>
            <div style={{...S.msgBubble,background:"#fff",color:"#94a3b8"}}>Thinking... â³</div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Image preview */}
      {imgPrev&&(
        <div style={{padding:"6px 16px",background:"#fffbeb",borderTop:"1px solid #fde68a",display:"flex",alignItems:"center",gap:8}}>
          <img src={imgPrev} style={{width:44,height:44,borderRadius:8,objectFit:"cover",border:"2px solid #f59e0b"}} alt="prev"/>
          <span style={{fontSize:12,color:"#92400e",flex:1}}>ðŸ“¸ Photo ready to send</span>
          <button style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"4px 8px",cursor:"pointer",color:"#ef4444",fontSize:11}} onClick={()=>{setImgPrev(null);setImgB64(null);}}>âœ•</button>
        </div>
      )}

      {/* Input */}
      <div style={S.inputWrap}>
        <div style={S.inputBox}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
          <button style={{...S.iconAction,color:isPro?"#ec4899":"#cbd5e1",position:"relative"}} onClick={()=>{if(!isPro){alert("ðŸ“¸ Photo feature is for Pro users only!\n\nUpgrade to Pro â†’ $5/month");return;}fileRef.current?.click();}}>
            ðŸ“¸
            {!isPro&&<span style={{position:"absolute",top:-4,right:-4,background:"#f59e0b",borderRadius:"50%",width:14,height:14,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900}}>â˜…</span>}
          </button>
          <input style={S.chatInp} placeholder="Ask your question..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}/>
          <button style={{...S.sendBtn,background:input.trim()||imgB64?"#f59e0b":"#e2e8f0",color:input.trim()||imgB64?"#fff":"#94a3b8"}} onClick={send} disabled={loading}>âž¤</button>
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GROUP STUDY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function GroupScreen({lang,guard,userName,onUpgrade}){
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
    ROOMS[c]={msgs:[{from:"System",text:`ðŸŽ‰ Room "${c}" created! Share this code with friends.`,isAI:false}],members:[userName]};
    enter(c);
  };
  const join=()=>{
    const c=code.toUpperCase().trim(); if(!c) return;
    if(!ROOMS[c]) ROOMS[c]={msgs:[{from:"System",text:`ðŸ“š Room "${c}" is active!`,isAI:false}],members:[]};
    if(!ROOMS[c].members.includes(userName)) ROOMS[c].members.push(userName);
    ROOMS[c].msgs.push({from:"System",text:`ðŸ‘‹ ${userName} joined!`,isAI:false});
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
    if(text){ROOMS[myRoom].msgs.push({from:userName,text,isAI:false});setInput("");setMsgs([...ROOMS[myRoom].msgs]);}
    if(aiMode||text.toLowerCase().startsWith("@ai")){
      setLoading(true);
      const q=text.replace(/@ai/i,"").trim()||text;
      try{
        const reply=await askAI(`Group study AI tutor. ${getLang(lang)} Keep answers short and clear.`,q,600);
        ROOMS[myRoom].msgs.push({from:"ðŸ¤– AI Ustaad",text:reply,isAI:true});
        setMsgs([...ROOMS[myRoom].msgs]);
      }catch(e){ROOMS[myRoom].msgs.push({from:"System",text:"âŒ "+e.message,isAI:false});setMsgs([...ROOMS[myRoom].msgs]);}
      setLoading(false);
    }
  };

  if(!joined) return(
    <div style={{...S.page,maxWidth:500,margin:"0 auto"}}>
      <div style={S.featureCard}>
        <div style={{fontSize:40,textAlign:"center",marginBottom:8}}>ðŸ‘¥</div>
        <div style={{fontWeight:700,fontSize:16,color:"#1e293b",textAlign:"center",marginBottom:4}}>Group Study Room</div>
        <div style={{fontSize:13,color:"#64748b",textAlign:"center",marginBottom:16}}>Study with friends â€” ask AI together!</div>
        <button style={S.btn} onClick={create}>Create New Room âœ¨</button>
        <div style={{textAlign:"center",color:"#94a3b8",margin:"10px 0",fontSize:13}}>OR</div>
        <input style={{...S.inp,marginBottom:8}} placeholder="Enter Room Code (e.g. XK9P2)" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==="Enter"&&join()}/>
        <button style={{...S.btn,background:"#1e293b"}} onClick={join}>Join Room â†’</button>
      </div>
      <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#92400e"}}>
        ðŸ’¡ Type <strong>@ai</strong> in chat to ask AI Ustaad â€” everyone sees the answer!
      </div>
    </div>
  );

  return(
    <div style={S.chatWrap}>
      <div style={{padding:"8px 16px",background:"#fffbeb",borderBottom:"1px solid #fde68a",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,flexWrap:"wrap",gap:6}}>
        <span style={{fontWeight:700,color:"#92400e"}}>ðŸ  Room: {myRoom}</span>
        <div style={{display:"flex",gap:4}}>{members.map(m=><span key={m} style={{background:"#fde68a",color:"#92400e",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{m}</span>)}</div>
        <span style={{color:"#f59e0b",fontSize:11,fontWeight:600}}>@ai = ask AI</span>
      </div>
      <div style={S.chatBox}>
        {msgs.map((m,i)=>(
          <div key={i} style={{padding:"8px 16px",borderBottom:"1px solid #f8fafc"}}>
            <span style={{fontWeight:600,fontSize:11,color:m.isAI?"#f59e0b":m.from===userName?"#6366f1":"#94a3b8",marginRight:8}}>{m.from}</span>
            <span style={{fontSize:14,color:"#1e293b",whiteSpace:"pre-wrap"}}>{m.text}</span>
          </div>
        ))}
        {loading&&<div style={{padding:"8px 16px",color:"#94a3b8",fontSize:13}}>ðŸ¤– AI is thinking...</div>}
        <div ref={endRef}/>
      </div>
      <div style={S.inputWrap}>
        <div style={S.inputBox}>
          <button style={{...S.iconAction,background:"#10b981",color:"#fff",borderRadius:10,padding:"0 12px",fontSize:13,fontWeight:600}} onClick={()=>send(true)} disabled={loading}>ðŸ¤– AI</button>
          <input style={S.chatInp} placeholder="Message or @ai question..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
          <button style={{...S.sendBtn,background:"#f59e0b"}} onClick={()=>send()} disabled={loading}>âž¤</button>
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXAM SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      const sysPrompt = "Return ONLY valid JSON array. No markdown. " + getLang(lang);
      const userPrompt = "Create " + numQ + " MCQ for " + cls + " " + subject + " Pakistani students. JSON:[{\"q\":\"...\",\"options\":[\"A)...\",\"B)...\",\"C)...\",\"D)...\"],\"answer\":\"A)...\",\"explanation\":\"...\"}]";
      const body={model:"claude-haiku-4-5-20251001",max_tokens:1500,system:sysPrompt,messages:[{role:"user",content:userPrompt}]};
      const text=await callAPI(body);
      const clean=text.replace(/```json|```/g,"").trim();
      setQs(JSON.parse(clean));setAns({});setTimeLeft(numQ*90);setStep("exam");
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
    const fb=qs.map((q,i)=>{const ok=ans[i]===q.answer;if(ok)score++;return{q:q.q,sel:ans[i]||"â€”",correct:q.answer,ok,exp:q.explanation};});
    setResult({score,total:qs.length,fb});setStep("result");
  };

  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const pct=result?Math.round(result.score/result.total*100):0;

  if(step==="setup") return(
    <div style={{...S.page,maxWidth:500,margin:"0 auto"}}>
      <div style={S.featureCard}>
        <div style={{fontSize:36,textAlign:"center",marginBottom:8}}>ðŸ“</div>
        <div style={{fontWeight:700,fontSize:16,color:"#1e293b",textAlign:"center",marginBottom:16}}>Exam Practice</div>
        <label style={S.lbl}>Subject</label>
        <select style={S.sel} value={subject} onChange={e=>setSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
        <label style={S.lbl}>Class</label>
        <select style={S.sel} value={cls} onChange={e=>setCls(e.target.value)}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select>
        <label style={S.lbl}>Questions: {numQ}</label>
        <input type="range" min={3} max={15} value={numQ} onChange={e=>setNumQ(+e.target.value)} style={{width:"100%",accentColor:"#f59e0b",margin:"6px 0 12px"}}/>
        <button style={S.btn} onClick={start} disabled={loading}>{loading?"Generating... â³":"Start Exam ðŸš€"}</button>
      </div>
    </div>
  );

  if(step==="exam") return(
    <div style={{...S.page,gap:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"10px 14px",position:"sticky",top:0}}>
        <span style={{fontWeight:700,color:"#92400e"}}>{subject}</span>
        <span style={{color:timeLeft<60?"#ef4444":"#16a34a",fontWeight:800,fontSize:18}}>â± {fmt(timeLeft)}</span>
        <button style={{...S.btn,width:"auto",padding:"6px 16px",fontSize:13}} onClick={submit}>Submit âœ“</button>
      </div>
      {qs.map((q,i)=>(
        <div key={i} style={S.featureCard}>
          <div style={{fontSize:11,color:"#f59e0b",fontWeight:700,marginBottom:4}}>Q{i+1}</div>
          <div style={{fontWeight:600,marginBottom:10,lineHeight:1.5,color:"#1e293b"}}>{q.q}</div>
          {q.options.map(o=>(
            <div key={o} style={{border:`2px solid ${ans[i]===o?"#f59e0b":"#e2e8f0"}`,background:ans[i]===o?"#fffbeb":"#fff",color:"#1e293b",borderRadius:10,padding:"9px 14px",cursor:"pointer",marginBottom:6,fontSize:13}} onClick={()=>setAns(a=>({...a,[i]:o}))}>
              {o}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return(
    <div style={{...S.page,gap:12,maxWidth:500,margin:"0 auto"}}>
      <div style={{textAlign:"center",padding:"16px 0"}}>
        <div style={{background:"#f59e0b",borderRadius:"50%",width:90,height:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <div style={{fontSize:26,fontWeight:900,color:"#fff"}}>{result.score}/{result.total}</div>
          <div style={{fontSize:13,color:"#fffbeb"}}>{pct}%</div>
        </div>
        <div style={{fontSize:16,fontWeight:700,color:"#1e293b"}}>{pct>=70?"ðŸŽ‰ Excellent!":pct>=40?"ðŸ‘ Good effort!":"ðŸ’ª Keep going!"}</div>
      </div>
      {result.fb.map((f,i)=>(
        <div key={i} style={{...S.featureCard,borderLeft:`3px solid ${f.ok?"#22c55e":"#ef4444"}`}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:4,color:"#1e293b"}}>{f.ok?"âœ…":"âŒ"} {f.q}</div>
          {!f.ok&&<div style={{color:"#ef4444",fontSize:12}}>Your: {f.sel} | Correct: {f.correct}</div>}
          <div style={{color:"#94a3b8",fontSize:11,marginTop:3}}>ðŸ’¡ {f.exp}</div>
        </div>
      ))}
      <button style={S.btn} onClick={()=>setStep("setup")}>Try Again ðŸ”„</button>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TOOLS SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ToolsScreen({lang,guard,onUpgrade}){
  const [active,setActive]=useState("summarize");
  return(
    <div style={S.page}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
        {[["summarize","ðŸ“š Summary"],["mcq","âœ… MCQ"],["planner","ðŸ“… Planner"],["translate","ðŸ”„ Translate"]].map(([id,lbl])=>(
          <button key={id} style={{...S.subChip,background:active===id?"#f59e0b":"#fff",color:active===id?"#fff":"#475569",border:`1px solid ${active===id?"#f59e0b":"#e2e8f0"}`,padding:"7px 14px"}} onClick={()=>setActive(id)}>{lbl}</button>
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
    if(!text.trim()) return; if(!guard()){onUpgrade();return;} setLoading(true);
    try{ const r=await askAI("Student helper.",`${mode==="summary"?`Short bullet summary. ${getLang(lang)}`:mode==="notes"?`Detailed study notes with headings. ${getLang(lang)}`:`Explain very simply like a child. ${getLang(lang)}`}\n\n${text}`); setRes(r); }
    catch(e){ setRes("âŒ "+e.message); }
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:6}}>
        {[["summary","ðŸ“‹ Summary"],["notes","ðŸ“ Notes"],["simple","ðŸ§’ Simple"]].map(([m,l])=>(
          <button key={m} style={{...S.subChip,background:mode===m?"#f59e0b":"#fff",color:mode===m?"#fff":"#475569",border:`1px solid ${mode===m?"#f59e0b":"#e2e8f0"}`}} onClick={()=>setMode(m)}>{l}</button>
        ))}
      </div>
      <textarea style={S.ta} placeholder="Paste your notes or text here..." value={text} onChange={e=>setText(e.target.value)}/>
      <button style={S.btn} onClick={go} disabled={loading}>{loading?"Processing... â³":"Process âœ¨"}</button>
      {res&&<div style={S.resBox}><div style={{fontWeight:700,color:"#f59e0b",marginBottom:8}}>âœ… Result:</div><div style={{whiteSpace:"pre-wrap",lineHeight:1.7,fontSize:14,color:"#1e293b"}}>{res}</div></div>}
    </div>
  );
}

function MCQTool({lang,guard,onUpgrade}){
  const [topic,setTopic]=useState("");const [num,setNum]=useState(5);const [qs,setQs]=useState([]);const [shown,setShown]=useState({});const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!topic.trim()) return; if(!guard()){onUpgrade();return;} setLoading(true); setQs([]);
    try{
      const sysPrompt2 = "Return ONLY valid JSON array. No markdown. " + getLang(lang);
      const userPrompt2 = "Generate " + num + " MCQs about \"" + topic + "\". JSON:[{\"q\":\"...\",\"options\":[\"A)...\",\"B)...\",\"C)...\",\"D)...\"],\"answer\":\"A)...\",\"hint\":\"...\"}]";
      const body={model:"claude-haiku-4-5-20251001",max_tokens:1200,system:sysPrompt2,messages:[{role:"user",content:userPrompt2}]};
      const text=await callAPI(body);
      setQs(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){alert("Error: "+e.message);}
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <input style={S.inp} placeholder="Enter topic (e.g. Photosynthesis, Algebra)" value={topic} onChange={e=>setTopic(e.target.value)}/>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:"#64748b"}}>Questions: {num}</span><input type="range" min={3} max={20} value={num} onChange={e=>setNum(+e.target.value)} style={{flex:1,accentColor:"#f59e0b"}}/></div>
      <button style={S.btn} onClick={go} disabled={loading}>{loading?"Generating... â³":"Generate MCQs ðŸŽ¯"}</button>
      {qs.map((q,i)=>(
        <div key={i} style={S.featureCard}>
          <div style={{fontSize:11,color:"#f59e0b",fontWeight:700}}>Q{i+1}</div>
          <div style={{fontWeight:600,margin:"6px 0 10px",lineHeight:1.5,color:"#1e293b"}}>{q.q}</div>
          {q.options.map(o=><div key={o} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 10px",marginBottom:4,fontSize:13,color:"#475569"}}>{o}</div>)}
          <button style={{...S.btn,padding:"5px 14px",fontSize:12,width:"auto",marginTop:6,background:"#1e293b"}} onClick={()=>setShown(s=>({...s,[i]:!s[i]}))}>
            {shown[i]?"Hide ðŸ™ˆ":"Show Answer ðŸ‘"}
          </button>
          {shown[i]&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#166534",marginTop:6}}>âœ… {q.answer} â€” ðŸ’¡ {q.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function PlanTool({lang,guard,onUpgrade}){
  const [exam,setExam]=useState("");const [days,setDays]=useState(7);const [subs,setSubs]=useState("Math, Physics, Chemistry");const [plan,setPlan]=useState("");const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!exam.trim()) return; if(!guard()){onUpgrade();return;} setLoading(true);
    try{ const r=await askAI(`Expert study planner. ${getLang(lang)}`,`Exam: "${exam}" in ${days} days. Subjects: ${subs}. Day-by-day schedule with breaks and motivation.`); setPlan(r); }
    catch(e){ setPlan("âŒ "+e.message); }
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <input style={S.inp} placeholder="Exam name (e.g. Matric Final, MDCAT)" value={exam} onChange={e=>setExam(e.target.value)}/>
      <input style={S.inp} placeholder="Subjects (e.g. Math, Physics, Chemistry)" value={subs} onChange={e=>setSubs(e.target.value)}/>
      <div style={{color:"#64748b",fontSize:13}}>Days until exam: {days}</div>
      <input type="range" min={1} max={60} value={days} onChange={e=>setDays(+e.target.value)} style={{accentColor:"#f59e0b"}}/>
      <button style={S.btn} onClick={go} disabled={loading}>{loading?"Creating... â³":"Create Study Plan ðŸ“…"}</button>
      {plan&&<div style={S.resBox}><div style={{fontWeight:700,color:"#f59e0b",marginBottom:8}}>ðŸ“… Your Plan:</div><div style={{whiteSpace:"pre-wrap",lineHeight:1.8,fontSize:14,color:"#1e293b"}}>{plan}</div></div>}
    </div>
  );
}

function TransTool({lang,guard,onUpgrade}){
  const [text,setText]=useState("");const [dir,setDir]=useState("ur2en");const [res,setRes]=useState("");const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!text.trim()) return; if(!guard()){onUpgrade();return;} setLoading(true);
    try{ const r=await askAI({ur2en:"Translate Urdu to English. Only translation.",en2ur:"Translate English to Urdu. Only translation.",auto:"Detect and translate Urduâ†”English. Only translation."}[dir],text,500); setRes(r); }
    catch(e){ setRes("âŒ "+e.message); }
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["ur2en","ðŸ‡µðŸ‡° Urduâ†’Eng"],["en2ur","ðŸ‡ºðŸ‡¸ Engâ†’Urdu"],["auto","ðŸ”„ Auto"]].map(([v,l])=>(
          <button key={v} style={{...S.subChip,background:dir===v?"#f59e0b":"#fff",color:dir===v?"#fff":"#475569",border:`1px solid ${dir===v?"#f59e0b":"#e2e8f0"}`}} onClick={()=>setDir(v)}>{l}</button>
        ))}
      </div>
      <textarea style={S.ta} placeholder="Enter text to translate..." value={text} onChange={e=>setText(e.target.value)}/>
      <button style={S.btn} onClick={go} disabled={loading}>{loading?"Translating... â³":"Translate ðŸ”„"}</button>
      {res&&<div style={S.resBox}><div style={{fontWeight:700,color:"#f59e0b",marginBottom:8}}>âœ… Translation:</div><div style={{fontSize:16,lineHeight:1.7,color:"#1e293b"}}>{res}</div></div>}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DAILY TIPS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function TipsScreen({lang,guard,onUpgrade}){
  const [tip,setTip]=useState("");
  const [loading,setLoading]=useState(false);
  const [tips,setTips]=useState([]);

  const getTip=async()=>{
    if(!guard()){onUpgrade();return;} setLoading(true);
    try{
      const t=await askAI(`Motivational study coach. ${getLang(lang)}`,"Give one powerful unique motivational study tip for Pakistani students. 3-4 lines. Make it inspiring and practical.",200);
      setTip(t);
      setTips(prev=>[{text:t,time:new Date().toLocaleTimeString()},...prev.slice(0,4)]);
    }catch(e){setTip("âŒ "+e.message);}
    setLoading(false);
  };

  useEffect(()=>{ getTip(); },[]);

  return(
    <div style={{...S.page,maxWidth:500,margin:"0 auto"}}>
      <div style={S.featureCard}>
        <div style={{fontSize:36,textAlign:"center"}}>ðŸ’¡</div>
        <div style={{fontWeight:700,fontSize:16,color:"#1e293b",textAlign:"center",marginBottom:8}}>Daily Motivation</div>
        {loading?(
          <div style={{textAlign:"center",color:"#94a3b8",padding:20}}>Getting your tip... â³</div>
        ):(
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:16,fontSize:14,lineHeight:1.8,color:"#1e293b",whiteSpace:"pre-wrap"}}>{tip}</div>
        )}
        <button style={{...S.btn,marginTop:12}} onClick={getTip} disabled={loading}>
          {loading?"Loading...":"Get New Tip ðŸ”„"}
        </button>
      </div>
      {tips.length>1&&(
        <div>
          <div style={{fontWeight:600,color:"#64748b",fontSize:13,marginBottom:8}}>Previous Tips:</div>
          {tips.slice(1).map((t,i)=>(
            <div key={i} style={{...S.featureCard,padding:"10px 14px",marginBottom:8}}>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>{t.time}</div>
              <div style={{fontSize:13,color:"#475569",lineHeight:1.6}}>{t.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// STYLES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const S={
  root:       {minHeight:"100vh",background:"#f8fafc",display:"flex",fontFamily:"'Segoe UI',Tahoma,sans-serif",position:"relative",overflow:"hidden",maxWidth:"100vw"},
  sideOverlay:{position:"fixed",inset:0,background:"#00000055",zIndex:40},
  sidebar:    {position:"fixed",left:0,top:0,bottom:0,width:"min(280px, 85vw)",background:"#fff",boxShadow:"2px 0 20px #0002",zIndex:50,display:"flex",flexDirection:"column",transition:"transform 0.25s ease",overflowY:"auto"},
  sideHead:   {padding:"20px 16px 12px",borderBottom:"1px solid #f1f5f9"},
  sideLogoRow:{display:"flex",alignItems:"center",gap:10,marginBottom:12},
  sideAppName:{fontSize:18,fontWeight:800,color:"#f59e0b"},
  sidePlan:   {fontSize:11,color:"#94a3b8"},
  sideUser:   {display:"flex",alignItems:"center",gap:10},
  avatar:     {width:38,height:38,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0},
  sideUserName:{fontSize:14,fontWeight:700,color:"#1e293b"},
  sideUserClass:{fontSize:11,color:"#94a3b8"},
  sideUsage:  {margin:"8px 12px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"8px 12px"},
  sideSection:{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",padding:"12px 16px 4px"},
  sideItem:   {display:"flex",alignItems:"center",gap:12,padding:"10px 16px",cursor:"pointer",border:"none",background:"transparent",width:"100%",textAlign:"left",borderRadius:0},
  main:       {flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",width:"100%",overflow:"hidden"},
  topbar:     {display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"#fff",borderBottom:"1px solid #f1f5f9",boxShadow:"0 1px 3px #0001",position:"sticky",top:0,zIndex:30},
  menuBtn:    {background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"},
  topTitle:   {flex:1,fontSize:16,fontWeight:700,color:"#1e293b"},
  planBadge:  {color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20},
  content:    {flex:1,overflowY:"auto",padding:"16px"},
  chatWrap:   {display:"flex",flexDirection:"column",height:"calc(100dvh - 57px)"},
  subBar:     {display:"flex",gap:6,padding:"8px 16px",overflowX:"auto",flexShrink:0,background:"#fff",borderBottom:"1px solid #f1f5f9"},
  subChip:    {border:"1px solid",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12,whiteSpace:"nowrap",flexShrink:0,fontWeight:500},
  chatBox:    {flex:1,overflowY:"auto",padding:"16px"},
  emptyState: {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:20},
  msgAvatar:  {width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0},
  msgBubble:  {padding:"10px 14px",fontSize:14,lineHeight:1.65,boxShadow:"0 1px 3px #0001"},
  inputWrap:  {padding:"8px 12px",background:"#fff",borderTop:"1px solid #f1f5f9",flexShrink:0,paddingBottom:"env(safe-area-inset-bottom, 8px)"},
  inputBox:   {display:"flex",gap:8,alignItems:"center",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:14,padding:"6px 8px"},
  iconAction: {background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"4px",position:"relative",flexShrink:0},
  chatInp:    {flex:1,background:"transparent",border:"none",outline:"none",fontSize:14,color:"#1e293b",padding:"6px 4px"},
  sendBtn:    {border:"none",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:16,fontWeight:700,flexShrink:0,transition:"all 0.2s"},
  page:       {display:"flex",flexDirection:"column",gap:12,paddingBottom:20},
  featureCard:{background:"#fff",border:"1px solid #f1f5f9",borderRadius:14,padding:16,boxShadow:"0 1px 3px #0001"},
  center:     {minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"#fffbeb"},
  card:       {background:"#fff",border:"1px solid #fde68a",borderRadius:20,padding:28,width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:14,boxShadow:"0 4px 20px #f59e0b22"},
  overlay:    {position:"fixed",inset:0,background:"#00000066",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16},
  modal:      {background:"#fff",borderRadius:20,padding:20,width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:10,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px #0003"},
  mHead:      {display:"flex",justifyContent:"space-between",alignItems:"center"},
  mTitle:     {fontSize:18,fontWeight:800,color:"#1e293b"},
  closeBtn:   {background:"#f1f5f9",border:"none",borderRadius:8,padding:"4px 10px",color:"#475569",cursor:"pointer",fontSize:16},
  lbl:        {fontSize:12,color:"#64748b",marginBottom:4,display:"block",marginTop:8},
  sel:        {background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",color:"#1e293b",fontSize:14,outline:"none",width:"100%"},
  ta:         {background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:12,color:"#1e293b",fontSize:14,minHeight:110,resize:"vertical",outline:"none",width:"100%",boxSizing:"border-box"},
  resBox:     {background:"#fff",border:"1px solid #fde68a",borderRadius:14,padding:14},
  inp:        {background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"10px 14px",color:"#1e293b",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"},
  btn:        {background:"#f59e0b",border:"none",borderRadius:12,padding:"12px 20px",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",width:"100%"},
};"
 content://downloads/all_downloads/116#:~:text=import%20%7B%20useState%2C%20useEffect,pointer%22%2Cwidth%3A%22100%25%22%7D%2C%0A%7D%3B
