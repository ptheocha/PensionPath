import { useState, useMemo, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";

// ═══════════════════════════════════════════════
// PLAN DATA (Ontario Only)
// ═══════════════════════════════════════════════
const PLANS = {
  hoopp: {
    name: "HOOPP",
    full: "Healthcare of Ontario Pension Plan",
    who: "Healthcare sector employees",
    normalRetAge: 60,
    earliestRetAge: 55,
    colaType: "partial",
    colaHistorical: 2.0,
    hasBridge: true,
    bridgeEndAge: 65,
    survivorPct: 66.67,
  },
  omers: {
    name: "OMERS",
    full: "Ontario Municipal Employees Retirement System",
    who: "Municipal & local government",
    normalRetAge: 65,
    earliestRetAge: 55,
    colaType: "partial",
    colaHistorical: 2.0,
    hasBridge: true,
    bridgeEndAge: 65,
    survivorPct: 66.67,
  },
  otpp: {
    name: "OTPP",
    full: "Ontario Teachers' Pension Plan",
    who: "Teachers & education workers",
    normalRetAge: 65,
    earliestRetAge: 50,
    colaType: "partial",
    colaHistorical: 2.0,
    hasBridge: true,
    bridgeEndAge: 65,
    survivorPct: 60,
  },
  optrust: {
    name: "OPTrust",
    full: "OPSEU Pension Trust",
    who: "Ontario public service (OPSEU)",
    normalRetAge: 65,
    earliestRetAge: 55,
    colaType: "guaranteed",
    colaHistorical: 2.0,
    hasBridge: true,
    bridgeEndAge: 65,
    survivorPct: 60,
  },
  pspp: {
    name: "PSPP",
    full: "Public Service Pension Plan",
    who: "Provincial government employees",
    normalRetAge: 65,
    earliestRetAge: 55,
    colaType: "guaranteed",
    colaHistorical: 2.0,
    hasBridge: true,
    bridgeEndAge: 65,
    survivorPct: 60,
  },
  caat: {
    name: "CAAT",
    full: "Colleges of Applied Arts & Technology",
    who: "College & polytechnic employees",
    normalRetAge: 65,
    earliestRetAge: 50,
    colaType: "conditional",
    colaHistorical: 2.0,
    hasBridge: true,
    bridgeEndAge: 65,
    survivorPct: 60,
  },
};

// ═══════════════════════════════════════════════
// ITA 8517 PV FACTORS & ONTARIO TAX
// ═══════════════════════════════════════════════
const PV_FACTORS = {49:9,50:9.4,51:9.6,52:9.8,53:10,54:10.2,55:10.4,56:10.6,57:10.8,58:11,59:11.3,60:11.5,61:11.7,62:12,63:12.2,64:12.3,65:12.4};
function getPV(age){if(age<50)return 9;if(age>=65)return 12.4;const lo=Math.floor(age),hi=Math.ceil(age),lf=PV_FACTORS[lo]||9,hf=PV_FACTORS[hi]||9;return lo===hi?lf:lf+(hf-lf)*(age-lo)}

const FED=[{l:57375,r:.15},{l:114750,r:.205},{l:158468,r:.26},{l:220000,r:.29},{l:1e9,r:.33}];
const ON=[{l:52886,r:.0505},{l:105775,r:.0915},{l:150000,r:.1116},{l:220000,r:.1216},{l:1e9,r:.1316}];
function marginalRate(inc){let f=.15,o=.0505;for(const b of FED){if(inc<=b.l){f=b.r;break}f=b.r}for(const b of ON){if(inc<=b.l){o=b.r;break}o=b.r}return f+o}

// ═══════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════
const fmt=(v)=>`$${Math.round(v).toLocaleString("en-CA")}`;
const fmtFull=(v)=>`$${v.toLocaleString("en-CA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtK=(v)=>v>=999500?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v.toFixed(0)}`;
const fmtPct=(v)=>`${(v*100).toFixed(1)}%`;

// ═══════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════
// Alphabetical plan order
const PLAN_ORDER = ["caat","hoopp","omers","optrust","otpp","pspp"];

function Tooltip({text}){
  const [show,setShow]=useState(false);
  const touched=useRef(false);
  const toggle=(e)=>{e.preventDefault();e.stopPropagation();setShow(s=>!s)};
  const close=(e)=>{e.preventDefault();e.stopPropagation();setShow(false)};
  const handleTouch=(e)=>{e.preventDefault();e.stopPropagation();touched.current=true;setShow(s=>!s)};
  const handleClick=(e)=>{e.preventDefault();e.stopPropagation();if(touched.current){touched.current=false;return}setShow(s=>!s)};
  return(
    <span style={{position:"relative",display:"inline-flex",alignItems:"center",marginLeft:6}}
      onClick={e=>e.stopPropagation()}>
      <span
        onClick={handleClick}
        onTouchEnd={handleTouch}
        role="button"
        tabIndex={0}
        style={{
          width:22,height:22,borderRadius:"50%",background:"#403e3a",border:"1px solid #524f44",
          display:"inline-flex",alignItems:"center",justifyContent:"center",
          fontSize:11,fontWeight:700,color:"#858070",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",lineHeight:1,userSelect:"none",
          transition:"all 0.15s",WebkitTapHighlightColor:"transparent",
          ...(show?{background:"#d4a843",color:"#24231e",borderColor:"#d4a843"}:{})
        }}>?</span>
      {show&&<>
        <div onClick={close} onTouchEnd={close} style={{position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.3)"}}/>
        <div style={{
          position:"fixed",left:"50%",top:"50%",transform:"translate(-50%, -50%)",
          background:"#2b2a25",border:"1px solid #524f44",borderRadius:10,padding:"16px 20px",
          fontSize:14,color:"#c4b99a",fontFamily:"'DM Sans',sans-serif",lineHeight:1.6,
          width:290,maxWidth:"calc(100vw - 40px)",zIndex:1000,boxShadow:"0 12px 40px rgba(0,0,0,0.7)",
          fontWeight:400,letterSpacing:"0",textTransform:"none"
        }}>
          {text}
          <div onClick={close} onTouchEnd={close} style={{marginTop:12,textAlign:"center",fontSize:12,color:"#858070",cursor:"pointer",padding:"6px 0"}}>Tap to close</div>
        </div>
      </>}
    </span>
  );
}

function Input({label,value,onChange,prefix,tooltip}){
  const formatDisplay = (v) => {
    if (v === "" || v === "-") return v;
    if (v.endsWith(".")) return Number(v.slice(0,-1)).toLocaleString("en-CA") + ".";
    const dotIdx = v.indexOf(".");
    if (dotIdx >= 0) {
      const intPart = v.slice(0, dotIdx);
      const decPart = v.slice(dotIdx);
      return (intPart === "" || intPart === "-" ? intPart : Number(intPart).toLocaleString("en-CA")) + decPart;
    }
    return Number(v).toLocaleString("en-CA");
  };
  const displayVal = formatDisplay(value);
  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, "");
    if (raw === "" || raw === "-") { onChange(raw); return; }
    if (/^-?\d*\.?\d*$/.test(raw)) onChange(raw);
  };
  return(
    <div style={{flex:"1 1 200px",minWidth:0,marginBottom:4}}>
      <div style={{display:"flex",alignItems:"center",fontSize:12,fontWeight:600,color:"#c4b99a",marginBottom:6,fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.01em"}}>
        {label}
        {tooltip&&<Tooltip text={tooltip}/>}
      </div>
      <div style={{display:"flex",alignItems:"center",background:"#302f29",border:"1px solid #524f44",borderRadius:10,overflow:"hidden",transition:"border-color 0.2s"}}>
        {prefix&&<span style={{padding:"12px 0 12px 14px",fontSize:16,color:"#858070",fontFamily:"'DM Mono',monospace"}}>{prefix}</span>}
        <input type="text" inputMode="decimal" value={displayVal} onChange={handleChange}
          style={{flex:1,background:"transparent",border:"none",color:"#f0e8d4",padding:prefix?"12px 14px 12px 8px":"12px 14px",fontSize:16,fontFamily:"'DM Mono',monospace",outline:"none",width:"100%",minWidth:0}}
          onFocus={e=>{e.target.parentElement.style.borderColor="#d4a843"}} onBlur={e=>{e.target.parentElement.style.borderColor="#524f44"}}/>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════
export default function PensionPath(){
  const [planKey,setPlanKey]=useState("");
  const [age,setAge]=useState("");
  const [cv,setCv]=useState("");
  const [excess,setExcess]=useState("");
  const [lifetime,setLifetime]=useState("");
  const [bridge,setBridge]=useState("");
  const [income,setIncome]=useState("");
  const [investReturn,setInvestReturn]=useState(7);
  const [colaRate,setColaRate]=useState(2);
  const [lifeExp,setLifeExp]=useState(85);
  const [showResults,setShowResults]=useState(false);
  const [showAdvanced,setShowAdvanced]=useState(false);
  const [email,setEmail]=useState("");
  const [emailSent,setEmailSent]=useState(false);

  const plan=PLANS[planKey];
  const a=parseFloat(age)||0, cvN=parseFloat(cv)||0, exN=parseFloat(excess)||0;
  const lifeN=parseFloat(lifetime)||0, bN=parseFloat(bridge)||0, incN=parseFloat(income)||70000;
  const totalMonthly=lifeN+(plan?.hasBridge?bN:0);
  const ready=planKey&&a>=18&&a<70&&cvN>0&&lifeN>0;

  const R=useMemo(()=>{
    if(!ready||!plan)return null;
    const total=cvN+exN, retAge=plan.normalRetAge, yToR=Math.max(retAge-a,0);
    const yInR=Math.max(lifeExp-retAge,1), cola=colaRate/100, inf=0.02;
    const fullMonthly=lifeN+(plan.hasBridge?bN:0), invR=investReturn/100;

    // DEFER
    let dR=0,dM=0;
    for(let y=0;y<yInR;y++){const c=Math.pow(1+cola,yToR+y),inB=plan.hasBridge&&(retAge+y)<plan.bridgeEndAge;
      const m=inB?(fullMonthly*c):(lifeN*c);if(!y)dM=m;dR+=(m*12)/Math.pow(1+inf,yToR+y)}

    // INVEST (LIRA)
    const pvF=getPV(a),mtv=(lifeN*12)*pvF,lira=Math.min(total,mtv),exOver=Math.max(total-mtv,0);
    const mRate=marginalRate(incN),taxEx=exOver*mRate,net=total-taxEx;
    const atRet=net*Math.pow(1+invR,yToR),mr=invR/12,nM=yInR*12;
    const draw=mr>0?atRet*mr/(1-Math.pow(1+mr,-nM)):atRet/nM;
    const lockedPct=lira/total,afterTax=draw*(1-0.25*lockedPct);
    let iR=0;for(let y=0;y<yInR;y++)iR+=(afterTax*12)/Math.pow(1+inf,yToR+y);

    // CASH
    const cTax=total*mRate,cNet=total-cTax,cAtRet=cNet*Math.pow(1+invR,yToR);
    const cDraw=mr>0?cAtRet*mr/(1-Math.pow(1+mr,-nM)):cAtRet/nM;
    let cR=0;for(let y=0;y<yInR;y++)cR+=(cDraw*12)/Math.pow(1+inf,yToR+y);

    // BREAKEVEN
    let bk=null,dC=0,iC=0;
    for(let y=0;y<50;y++){const ca=retAge+y;if(ca>100)break;const c=Math.pow(1+cola,yToR+y);
      const inB=plan.hasBridge&&ca<plan.bridgeEndAge;dC+=(inB?fullMonthly:lifeN)*c*12;iC+=afterTax*12;
      if(dC>=iC&&!bk&&y>0)bk=ca}

    return{total,dR,dM,iR,iM:afterTax,iAtRet:atRet,cR,cM:cDraw,cNet,cAtRet,cTax,mtv,lira,exOver,taxEx,mRate,pvF,bk,yToR,fullMonthly};
  },[ready,plan,a,cvN,exN,lifeN,bN,incN,investReturn,colaRate,lifeExp]);

  const best=R?[{k:"defer",v:R.dR},{k:"invest",v:R.iR},{k:"cash",v:R.cR}].sort((x,y)=>y.v-x.v)[0].k:null;
  const maxV=R?Math.max(R.dR,R.iR,R.cR):0;

  const scenarios=R?[
    {key:"defer",label:"Keep Your Pension",sub:`Collect at ${plan.normalRetAge} for life`,icon:"🛡️",color:"#4ecdc4",
      total:R.dR,monthly:R.dM,
      details:[
        {l:"Monthly at retirement",v:fmtFull(R.dM)},
        ...(plan.hasBridge&&bN>0?[{l:"Lifetime portion",v:`${fmtFull(lifeN)}/mo for life`},{l:"Bridge portion",v:`${fmtFull(bN)}/mo until ${plan.bridgeEndAge}`}]:[]),
        {l:"COLA protection",v:plan.colaType==="guaranteed"?"Guaranteed":plan.colaType==="partial"?"Partially guaranteed":"Conditional"},
        {l:"Survivor benefit",v:`${plan.survivorPct}% to spouse`},
        {l:"Investment risk",v:"Low"},
        {l:"Flexibility",v:"Low"},
      ]},
    {key:"invest",label:"Transfer & Invest",sub:"Tax-free transfer to a LIRA or RRSP",icon:"📈",color:"#d4a843",
      total:R.iR,monthly:R.iM,
      details:[
        {l:"Tax-free transfer",v:fmt(R.lira)},
        ...(R.exOver>0?[{l:"Taxable excess",v:fmt(R.exOver),warn:true},{l:`Tax on excess (${fmtPct(R.mRate)})`,v:`-${fmt(R.taxEx)}`,warn:true}]:[]),
        {l:`Grows to (at ${investReturn}%)`,v:fmtK(R.iAtRet)},
        {l:"Monthly at retirement",v:fmtFull(R.iM)},
        {l:"Investment risk",v:"Medium"},
        {l:"Flexibility",v:"Medium"},
      ]},
    {key:"cash",label:"Cash Out & Invest",sub:"Withdraw as cash, pay tax, invest the rest",icon:"💵",color:"#e07a5f",
      total:R.cR,monthly:R.cM,
      details:[
        {l:"Gross withdrawal",v:fmt(R.total)},
        {l:`Tax on withdrawal (${fmtPct(R.mRate)})`,v:`-${fmt(R.cTax)}`,warn:true},
        {l:"Amount you invest",v:fmt(R.cNet)},
        {l:`Grows to (at ${investReturn}%)`,v:fmtK(R.cAtRet)},
        {l:"Monthly at retirement",v:fmtFull(R.cM)},
        {l:"Investment risk",v:"High"},
        {l:"Flexibility",v:"High"},
      ]},
  ]:[];

  return(
    <div style={{minHeight:"100vh",background:"#24231e",color:"#f0e8d4",fontFamily:"'DM Sans',sans-serif",overflowX:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>

      {/* NAV */}
      <div style={{background:"#2b2a25",borderBottom:"1px solid #403e3a",padding:"14px 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:25,fontWeight:800,fontFamily:"'Playfair Display',serif",letterSpacing:"-0.02em",lineHeight:1}}><span style={{color:"#d4a843"}}>Pension</span><span style={{color:"#f0e8d4"}}>Path</span></span>
          <span style={{fontSize:9,color:"#858070",fontFamily:"'DM Mono',monospace",border:"1px solid #524f44",borderRadius:3,padding:"3px 6px",letterSpacing:"0.08em",fontWeight:500,lineHeight:1}}>ONTARIO</span>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"36px 16px"}}>

        {/* HERO */}
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{fontSize:11,color:"#d4a843",fontFamily:"'DM Mono',monospace",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Free Pension Analysis Tool</div>
          <h1 style={{fontSize:"clamp(24px, 5vw, 30px)",fontWeight:800,fontFamily:"'Playfair Display',serif",margin:0,lineHeight:1.2}}>
            Keep your pension<br/>or take the lump sum?
          </h1>
          <p style={{fontSize:15,color:"#8a8270",marginTop:12,lineHeight:1.6,maxWidth:480,marginLeft:"auto",marginRight:"auto"}}>
            Enter the numbers from your termination options package and see every scenario modeled in seconds.
          </p>
        </div>

        {/* ═══ FORM ═══ */}
        <div style={{background:"#2b2a25",border:"1px solid #403e3a",borderRadius:14,padding:"28px 24px",marginBottom:28}}>

          {/* Plan picker */}
          <div style={{fontSize:12,fontWeight:600,color:"#c4b99a",marginBottom:14,letterSpacing:"0.04em"}}>Which plan are you leaving?</div>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:10,marginBottom:20}}>
            {PLAN_ORDER.map(k=>{const p=PLANS[k];return(
              <button key={k} onClick={()=>{setPlanKey(k);setColaRate(PLANS[k].colaHistorical)}} style={{
                padding:"16px 8px",borderRadius:10,border:`1.5px solid ${planKey===k?"#d4a843":"#403e3a"}`,
                background:planKey===k?"#3e3828":"#302f29",cursor:"pointer",transition:"all 0.15s",textAlign:"center",
                width:"calc(33.33% - 8px)",minWidth:100,maxWidth:220,boxSizing:"border-box"
              }}>
                <div style={{fontSize:15,fontWeight:700,color:planKey===k?"#d4a843":"#c4b99a",fontFamily:"'DM Sans',sans-serif"}}>{p.name}</div>
                <div style={{fontSize:10,color:"#858070",marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>{p.who}</div>
              </button>
            )})}
          </div>

          {plan&&(
            <div style={{marginBottom:28,background:"#38362e",borderRadius:10,overflow:"hidden",border:"1px solid #403e3a"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #403e3a",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#d4a843"}}/>
                <span style={{fontSize:13,fontWeight:700,color:"#c4b99a"}}>{plan.full}</span>
              </div>
              {[
                ["Earliest retirement",`Age ${plan.earliestRetAge}`],
                ["COLA",plan.colaType==="guaranteed"?"Guaranteed (100% CPI)":plan.colaType==="partial"?"Partially guaranteed":"Conditional (plan discretion)"],
                ["Survivor benefit",`${plan.survivorPct}% to spouse`],
                ...(plan.hasBridge?[["Bridge benefit",`Paid until age ${plan.bridgeEndAge}`]]:[]),
              ].map(([l,v],i)=>(
                <div key={i} style={{padding:"9px 18px",borderBottom:"1px solid #403e3a",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,fontSize:12}}>
                  <span style={{color:"#858070",flexShrink:0}}>{l}</span>
                  <span style={{color:"#c4b99a",fontFamily:"'DM Sans',sans-serif",fontWeight:500,textAlign:"right"}}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Inputs */}
          <div style={{display:"flex",flexWrap:"wrap",gap:"20px 24px",marginBottom:24}}>
            <Input label="Your age" value={age} onChange={setAge}/>
            <Input label="Annual income" value={income} onChange={setIncome} prefix="$" tooltip="Your gross income this year before deductions. Used to estimate your tax rate."/>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"20px 24px",marginBottom:24}}>
            <Input label="Commuted value" value={cv} onChange={setCv} prefix="$" tooltip={plan
              ? `The lump sum ${plan.name} is offering instead of your future pension. Found on your termination options package.`
              : "The lump sum your plan is offering. Select your plan above for details."}/>
            <Input label="Excess contributions" value={excess} onChange={setExcess} prefix="$" tooltip={plan
              ? `A separate refund amount some ${plan.name} members receive. If listed on your termination package, enter it here. Otherwise leave blank.`
              : "A separate refund listed on some termination packages. Leave blank if not applicable."}/>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"20px 24px",marginBottom:24}}>
            <Input label="Lifetime pension (monthly)" value={lifetime} onChange={setLifetime} prefix="$" tooltip={plan
              ? `Your permanent monthly pension for life${plan.hasBridge ? `, starting at age ${plan.normalRetAge}. This continues after the bridge ends at ${plan.bridgeEndAge}` : ` starting at age ${plan.normalRetAge}`}. Found on your ${plan.name} termination statement.`
              : "The permanent monthly amount you receive for life. Select your plan for details."}/>
            {plan?.hasBridge&&(
              <Input label="Bridge benefit (monthly)" value={bridge} onChange={setBridge} prefix="$" tooltip={`A temporary monthly top-up from ${plan.name} that stops at age ${plan.bridgeEndAge} when CPP begins. Listed separately on your termination statement.`}/>
            )}
          </div>

          {/* Advanced */}
          <button onClick={()=>setShowAdvanced(!showAdvanced)} style={{background:"none",border:"none",color:"#858070",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,fontWeight:500,display:"flex",alignItems:"center",gap:6,marginBottom:showAdvanced?18:0}}>
            <span style={{transform:showAdvanced?"rotate(90deg)":"rotate(0)",transition:"transform 0.2s",display:"inline-block",fontSize:11}}>▸</span>
            Adjust assumptions
          </button>
          {showAdvanced&&(
            <div style={{padding:24,background:"#38362e",borderRadius:12,border:"1px solid #403e3a"}}>
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{display:"flex",alignItems:"center",fontSize:13,color:"#c4b99a",fontWeight:500}}>Expected investment return<Tooltip text="A Canadian balanced portfolio has averaged about 7% annually over the past 30 years. Lower is more conservative."/></span>
                  <span style={{fontSize:16,fontWeight:700,color:"#f0e8d4",fontFamily:"'DM Mono',monospace"}}>{investReturn}%</span>
                </div>
                <input type="range" min={4} max={10} step={0.1} value={investReturn} onChange={e=>setInvestReturn(parseFloat(e.target.value))} style={{width:"100%",accentColor:"#d4a843",height:8}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#636054",fontFamily:"'DM Mono',monospace",marginTop:2}}><span>4%</span><span>10%</span></div>
              </div>
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{display:"flex",alignItems:"center",fontSize:13,color:"#c4b99a",fontWeight:500}}>Assumed COLA rate<Tooltip text="The annual inflation adjustment applied to your pension. The Bank of Canada targets 2% inflation. Set to 0% to see what happens if your plan stops providing increases."/></span>
                  <span style={{fontSize:16,fontWeight:700,color:"#f0e8d4",fontFamily:"'DM Mono',monospace"}}>{colaRate}%</span>
                </div>
                <input type="range" min={0} max={4} step={0.1} value={colaRate} onChange={e=>setColaRate(parseFloat(e.target.value))} style={{width:"100%",accentColor:"#d4a843",height:8}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#636054",fontFamily:"'DM Mono',monospace",marginTop:2}}><span>0%</span><span>4%</span></div>
                {plan&&plan.colaType==="conditional"&&(
                  <div style={{fontSize:11,color:"#d4a843",marginTop:6,lineHeight:1.4}}>
                    {plan.name}'s COLA is not guaranteed — it is provided at the plan's discretion based on funding. Adjust this to see the impact if COLA is reduced or paused in some years.
                  </div>
                )}
                {plan&&plan.colaType==="partial"&&(
                  <div style={{fontSize:11,color:"#d4a843",marginTop:6,lineHeight:1.4}}>
                    {plan.name}'s COLA is guaranteed for older service but conditional for newer service. The 2% default reflects recent CPI. Adjust to model different scenarios.
                  </div>
                )}
                {plan&&plan.colaType==="guaranteed"&&(
                  <div style={{fontSize:11,color:"#4ecdc4",marginTop:6,lineHeight:1.4}}>
                    {plan.name} guarantees annual COLA adjustments. The 2% default reflects the long-term Canadian CPI average.
                  </div>
                )}
              </div>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{display:"flex",alignItems:"center",fontSize:13,color:"#c4b99a",fontWeight:500}}>Life expectancy<Tooltip text="Canadian average is 82. The longer you live, the more valuable keeping your pension becomes."/></span>
                  <span style={{fontSize:16,fontWeight:700,color:"#f0e8d4",fontFamily:"'DM Mono',monospace"}}>{lifeExp}</span>
                </div>
                <input type="range" min={70} max={100} step={1} value={lifeExp} onChange={e=>setLifeExp(parseInt(e.target.value))} style={{width:"100%",accentColor:"#d4a843",height:8}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#636054",fontFamily:"'DM Mono',monospace",marginTop:2}}><span>70</span><span>100</span></div>
              </div>
            </div>
          )}

          {/* CTA */}
          <button onClick={()=>{if(ready){setShowResults(true);setTimeout(()=>document.getElementById("results")?.scrollIntoView({behavior:"smooth"}),100)}}}
            disabled={!ready}
            style={{
              width:"100%",marginTop:28,padding:"16px",fontSize:16,fontWeight:700,
              color:"#24231e",background:ready?"linear-gradient(135deg,#d4a843,#b8922f)":"#524f44",
              border:"none",borderRadius:12,cursor:ready?"pointer":"not-allowed",
              fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s",
              boxShadow:ready?"0 4px 20px rgba(212,168,67,0.25)":"none",
              letterSpacing:"0.02em"
            }}>
            {ready?"Show My Results":!planKey?"Select your plan above":a<18||a>=70||!age?"Enter your age":cvN<=0?"Enter your commuted value":lifeN<=0?"Enter your lifetime pension":"Enter your details above"}
          </button>
        </div>

        {/* ═══ RESULTS ═══ */}
        {showResults&&R&&(
          <div id="results">
            {/* Summary */}
            <div style={{background:"#2b2a25",border:"1px solid #403e3a",borderRadius:14,padding:28,marginBottom:28,textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:600,color:"#d4a843",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10,fontFamily:"'DM Mono',monospace"}}>Your Personalized Analysis</div>
              <div style={{fontSize:15,color:"#8a8270",lineHeight:1.7}}>
                Leaving <strong style={{color:"#f0e8d4"}}>{plan.name}</strong> at age <strong style={{color:"#f0e8d4"}}>{a}</strong> with a commuted value of <strong style={{color:"#d4a843"}}>{fmt(R.total)}</strong> and a deferred pension of <strong style={{color:"#d4a843"}}>{fmtFull(totalMonthly)}/mo</strong>{plan.hasBridge&&bN>0?` (${fmtFull(lifeN)} lifetime + ${fmtFull(bN)} bridge)`:""} starting at age {plan.normalRetAge}.
                {R.yToR>0?` Your pension begins in ${R.yToR} years.`:R.yToR===0&&a>=plan.normalRetAge?" You are eligible to begin collecting immediately.":""}
              </div>
            </div>

            {/* Scenario cards */}
            <div style={{display:"flex",flexDirection:"column",gap:20,marginBottom:28}}>
              {scenarios.map(s=>(
                <div key={s.key} style={{
                  background:"linear-gradient(135deg,#2b2a25,#302f29)",
                  border:`1.5px solid ${best===s.key?s.color:"#403e3a"}`,
                  borderRadius:14,padding:28,position:"relative",overflow:"hidden",
                  boxShadow:best===s.key?`0 0 30px ${s.color}15`:"none",transition:"all 0.3s"
                }}>
                  {best===s.key&&(
                    <div style={{position:"absolute",top:0,right:20,background:s.color,color:"#24231e",fontSize:10,fontWeight:700,padding:"4px 12px",borderRadius:"0 0 8px 8px",fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.05em",textTransform:"uppercase"}}>Best outcome</div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
                    <div style={{flex:"1 1 240px",minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                        <div style={{width:40,height:40,borderRadius:10,background:`${s.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.icon}</div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:16,fontWeight:700,color:"#f0e8d4"}}>{s.label}</div>
                          <div style={{fontSize:12,color:"#858070"}}>{s.sub}</div>
                        </div>
                      </div>
                      <div style={{marginTop:4}}>
                        {s.details.map((d,i)=>{
                          const isLong = d.v && d.v.length > 30;
                          return isLong ? (
                            <div key={i} style={{padding:"7px 0",borderBottom:"1px solid #403e3a",fontSize:12}}>
                              <div style={{color:"#8a8270",marginBottom:3}}>{d.l}</div>
                              <div style={{color:d.warn?"#e07a5f":"#c4b99a",fontFamily:"'DM Sans',sans-serif",fontWeight:500,fontSize:11,lineHeight:1.5}}>{d.v}</div>
                            </div>
                          ) : (
                            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #403e3a",fontSize:12}}>
                              <span style={{color:"#8a8270"}}>{d.l}</span>
                              <span style={{color:d.warn?"#e07a5f":"#c4b99a",fontFamily:"'DM Mono',monospace",fontWeight:500}}>{d.v}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flex:"0 0 auto"}}>
                      <div style={{fontSize:11,color:"#858070",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'DM Mono',monospace"}}>Lifetime total</div>
                      <div style={{fontSize:"clamp(24px, 4vw, 30px)",fontWeight:800,color:s.color,fontFamily:"'DM Mono',monospace",letterSpacing:"-0.02em",lineHeight:1.1,marginTop:4}}>{fmtK(s.total)}</div>
                      <div style={{fontSize:11,color:"#636054",marginTop:4}}>in today's dollars</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bar comparison */}
            <div style={{background:"#2b2a25",border:"1px solid #403e3a",borderRadius:14,padding:28,marginBottom:28}}>
              <div style={{fontSize:13,fontWeight:600,color:"#c4b99a",marginBottom:20,letterSpacing:"0.04em"}}>Side-by-side comparison</div>
              {[{l:"Keep pension",v:R.dR,c:"#4ecdc4"},{l:"Transfer & invest",v:R.iR,c:"#d4a843"},{l:"Cash out & invest",v:R.cR,c:"#e07a5f"}].map((s,i)=>(
                <div key={i} style={{marginBottom:i<2?16:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#8a8270"}}>{s.l}</span>
                    <span style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>{fmtK(s.v)}</span>
                  </div>
                  <div style={{height:16,background:"#38362e",borderRadius:8,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${maxV>0?(s.v/maxV)*100:0}%`,background:`linear-gradient(90deg,${s.c}cc,${s.c})`,borderRadius:8,transition:"width 0.6s ease",minWidth:4}}/>
                  </div>
                </div>
              ))}
              {R.bk&&(
                <div style={{marginTop:18,padding:"12px 16px",background:"#2c3c32",border:"1px solid #3e5f4f",borderRadius:10,fontSize:13,color:"#4ecdc4",lineHeight:1.5}}>
                  <strong>Breakeven age: {R.bk}</strong> — If you live past age {R.bk}, keeping your {plan.name} pension beats investing in nominal terms.
                  {plan.colaType==="guaranteed"
                    ?` Since ${plan.name} guarantees COLA, this advantage is protected against inflation.`
                    :plan.colaType==="partial"
                    ?` Note: ${plan.name}'s COLA is partially guaranteed. Actual increases on newer service may vary.`
                    :` Note: this assumes continued COLA increases, which are not guaranteed under ${plan.name}.`}
                </div>
              )}
            </div>

            {/* ═══ EMAIL CAPTURE ═══ */}
            {!emailSent?(
              <div style={{background:"linear-gradient(135deg,#3e3828,#302f29)",border:"1px solid #d4a84333",borderRadius:14,padding:"32px 24px",marginBottom:28,textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:700,fontFamily:"'Playfair Display',serif",marginBottom:10}}>Personalized reports are coming soon</div>
                <div style={{fontSize:14,color:"#8a8270",maxWidth:420,margin:"0 auto 24px",lineHeight:1.7}}>
                  We're building personalized pension reports. Leave your email and be the first to get yours.
                </div>
                <div style={{display:"flex",gap:10,maxWidth:440,margin:"0 auto",flexWrap:"wrap"}}>
                  <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)}
                    style={{flex:"1 1 220px",minWidth:0,background:"#2b2a25",border:"1px solid #524f44",color:"#f0e8d4",padding:"12px 16px",fontSize:16,fontFamily:"'DM Mono',monospace",borderRadius:10,outline:"none",boxSizing:"border-box"}}
                    onFocus={e=>{e.target.style.borderColor="#d4a843"}} onBlur={e=>{e.target.style.borderColor="#524f44"}}/>
                  <button onClick={()=>{
                    if(!email.includes("@")||!email.includes("."))return;
                    fetch("https://formspree.io/f/xkoqnpnj",{
                      method:"POST",
                      headers:{"Content-Type":"application/json","Accept":"application/json"},
                      body:JSON.stringify({email,plan:plan?.name||"none",age:age||"",cv:cv||""})
                    }).then(r=>{if(r.ok)setEmailSent(true)}).catch(()=>setEmailSent(true));
                  }} style={{
                    padding:"12px 24px",background:"#d4a843",color:"#24231e",border:"none",borderRadius:10,
                    fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",
                    flex:"0 0 auto"
                  }}>Notify Me</button>
                </div>
                <div style={{fontSize:11,color:"#636054",marginTop:12}}>No spam. Unsubscribe anytime.</div>
              </div>
            ):(
              <div style={{background:"#2c3c32",border:"1px solid #3e5f4f",borderRadius:14,padding:28,marginBottom:24,textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:8}}>✉️</div>
                <div style={{fontSize:16,fontWeight:700,color:"#4ecdc4"}}>You're on the list!</div>
                <div style={{fontSize:13,color:"#8a8270",marginTop:6}}>We'll notify <strong style={{color:"#c4b99a"}}>{email}</strong> as soon as personalized reports are ready.</div>
              </div>
            )}

            {/* ═══ PLANNER CTA ═══ */}
            <div id="planner" style={{
              background:"linear-gradient(135deg,#38362e,#2b2a25)",border:"1px solid #524f44",
              borderRadius:14,padding:"36px 24px",marginBottom:28,textAlign:"center"
            }}>
              <div style={{fontSize:22,fontWeight:800,fontFamily:"'Playfair Display',serif",marginBottom:12,lineHeight:1.3}}>
                This decision is irreversible.
              </div>
              <div style={{fontSize:14,color:"#8a8270",maxWidth:460,margin:"0 auto 28px",lineHeight:1.7}}>
                A licensed financial planner can model your complete retirement picture — taxes, CPP, OAS, & existing savings — to ensure you are making the right decision.
              </div>
              <a href="https://docs.google.com/spreadsheets/d/1iGzy9kkSXqjGbhXfcfczs9qwSQfI1PdRuNUOMybxvl4/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer" style={{
                display:"inline-block",padding:"14px 28px",fontSize:15,fontWeight:700,
                background:"linear-gradient(135deg,#d4a843,#b8922f)",color:"#24231e",border:"none",borderRadius:12,
                cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textDecoration:"none",
                boxShadow:"0 4px 20px rgba(212,168,67,0.3)",letterSpacing:"0.02em",
                maxWidth:"100%",boxSizing:"border-box"
              }}>Find a Fee-Only Planner →</a>
              <div style={{fontSize:12,color:"#858070",marginTop:16}}>
                We only recommend fee-only planners who do not earn commissions on your decision.
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{padding:"20px 0",fontSize:11,color:"#636054",lineHeight:1.7,textAlign:"center"}}>
              <strong>Disclaimer:</strong> PensionPath is an educational tool and does not constitute financial, tax, or legal advice.
              Plan details verified against official plan websites as of March 2026.
              Results are estimates based on simplified assumptions. Actual outcomes depend on market performance, tax law changes,
              plan amendments, and your personal circumstances. Consult a licensed professional before making pension decisions.
              This choice is irreversible. Ontario plans only. Tax calculations are approximate.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{textAlign:"center",padding:"32px 0",fontSize:11,color:"#636054",fontFamily:"'DM Mono',monospace"}}>
          © 2026 www.pensionpath.ca · Built for Canadians
        </div>
      </div>
      <Analytics />
    </div>
  );
}
