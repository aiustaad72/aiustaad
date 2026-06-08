import { useState, useEffect, useRef } from "react";

// â”€â”€ Constants â”€â”€
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
  { id:"tools",  icon:"ðŸ› ", label:"Study Tools",     desc:"MCQ, Notes, Planner"   },
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
  return callAPI({model:"claude-sonnet-4-20250514",max_tokens:max,system,messages:[{role:"user",content:msg}]});
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROOT APP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function App(){
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
  const plans=[
    {id:"free",  icon:"ðŸ†“",name:"Free",       price:"$0",        f:["10 questions/day","AI Tutor","Group Study","Daily Tips"]},
    {id:"pro",   icon:"âš¡",name:"Pro",         price:"$5/month",  f:["Unlimited questions","Exam Practice","MCQ Generator","Study Planner","Translator","ðŸ“¸ Photo Questions"]},
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
          <div key={p.id} style={{border:`2px solid ${plan===p.id?PLANS[p.id].color:"#f1f5f9"}`,background:plan===p.id?PLANS[p.id].color+"0d":"#fff",borderRadius:14,padding:14,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:26}}>{p.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:"#1e293b"}}>{p.name}</div>
                <div style={{fontWeight:800,color:PLANS[p.id].color,fontSize:15}}>{p.price}</div>
              </div>
              {plan!==p.id
                ?<button style={{...S.btn,width:"auto",padding:"7px 18px",fontSize:13,background:PLANS[p.id].color}} onClick={()=>onUpgrade(p.id)}>Select</button>
                :<span style={{color:"#22c55e",fontWeight:700}}>âœ“ Active</span>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {p.f.map(f=><span key={f} style={{background:"#f8fafc",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#64748b",border:"1px solid #e2e8f0"}}>âœ“ {f}</span>)}
            </div>
          </div>
        ))}
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
     
