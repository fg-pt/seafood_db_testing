import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {loadAllData} from './data-loader.js';

// ─── App-level data (set after CSV load) ─────
let CO, SM, CM, AS, IU, ENV, SPD, CTD, BM;

// ─── CONSTANTS ──────────────────────────
const SL = {0:'N/A',1:'Poor',2:'Average',3:'Good'};
const SC = {0:'#475569',1:'#ef4444',2:'#f59e0b',3:'#22c55e'};
const SBG = {0:'#1e293b',1:'#7f1d1d',2:'#78350f',3:'#14532d'};
const SK = [
  {k:'transparency',l:'Transparency',s:'Trans.'},
  {k:'oceanHealth',l:'Ocean Health',s:'Ocean'},
  {k:'governance',l:'Governance',s:'Gov.'},
  {k:'fishingPractices',l:'Fishing Practices',s:'Fish. Prac.'},
  {k:'compliance',l:'Compliance',s:'Compl.'},
  {k:'stockSustainability',l:'Stock Sustainability',s:'Stock'},
];
const SEGS = ['Feed','Fishing','Aquaculture','Processing','Wholesale/Distribution','Retail','Foodservice'];
const SEGK = ['feed','fishing','aquaculture','processing','wholesale','retail','foodservice'];
const CAT_MAP = {
  transparency:'Transparency',oceanHealth:'Ocean Health',
  governance:'Management and Governance',fishingPractices:'Fishing Practices',
  compliance:'Compliance and Enforcement',stockSustainability:'Stock Sustainability'
};
const IUCN_COL = {'Least Concern':'#22c55e','Near Threatened':'#eab308','Vulnerable':'#f59e0b','Endangered':'#ef4444','Critically Endangered':'#dc2626','Data Deficient':'#64748b'};
const RANK_METRICS = [
  {key:'Reporting Precision PT Score',label:'Reporting Precision',short:'Precision',good:'high'},
  {key:'FishSource Score - Current Stock Health',label:'FishSource Stock Health',short:'Stock Health',good:'high'},
  {key:'Global Fishing Index - Proportion of 1990-2018 catches that is overfished',label:'Overfishing Proportion',short:'Overfished',good:'low'},
  {key:'SeaAroundUs Unreported / Total Catch (%)',label:'Unreported Catch %',short:'Unreported',good:'low'},
  {key:'Ocean Health Index - Score (2024)',label:'Ocean Health Index',short:'OHI 2024',good:'high'},
];

// ─── UTILITIES ──────────────────────────
const fN = (v,d=1) => {if(v==null||isNaN(v))return'—';return Math.abs(v)>=1e3?(v/1e3).toFixed(1)+'B':Number(v).toFixed(d)};
const fPraw = v => {if(v==null||isNaN(v))return'—';return Number(v).toFixed(1)+'%'};

function TrafficLight({score,size=20}) {
  if(score==null||score===0)return<span style={{fontSize:size,opacity:.3}}>⬜</span>;
  if(score===1)return<span style={{fontSize:size}} title="High Risk">🔴</span>;
  if(score===2)return<span style={{fontSize:size}} title="Medium Risk">🟡</span>;
  if(score===3)return<span style={{fontSize:size}} title="Lower Risk">🟢</span>;
  return<span style={{fontSize:size,opacity:.3}}>⬜</span>;
}
const Dot = ({v,sz=10}) => <span className="dot" style={{width:sz,height:sz,backgroundColor:SC[v]||SC[0]}} title={SL[v]}/>;
const Badge = ({v}) => <span className="pill" style={{background:SBG[v]||SBG[0],color:SC[v]||SC[0],border:`1px solid ${(SC[v]||SC[0])}40`}}>{SL[v]||'N/A'}</span>;

function MetricBar({value,benchmark,good='high',width=120}) {
  if(value==null)return<span style={{color:'#475569',fontSize:11}}>—</span>;
  const pct=Math.min(value*100,100);
  const isGood=good==='high'?value>=(benchmark||0.5):value<=(benchmark||0.5);
  const color=isGood?'#22c55e':value>0.7&&good==='low'?'#ef4444':'#f59e0b';
  return(
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <div style={{width,height:8,borderRadius:4,background:'#1e293b',overflow:'hidden',position:'relative'}}>
        {benchmark!=null&&<div style={{position:'absolute',left:`${benchmark*100}%`,top:0,bottom:0,width:1,background:'#94a3b8',zIndex:1}}/>}
        <div style={{width:`${pct}%`,height:'100%',borderRadius:4,background:color,transition:'width .4s'}}/>
      </div>
      <span style={{fontSize:11,color:'#94a3b8',minWidth:36,textAlign:'right'}}>{(value*100).toFixed(0)}%</span>
    </div>
  );
}

const Arrow = ({onClick,label}) => (
  <button onClick={onClick} style={{background:'none',border:'none',color:'#5eead4',fontSize:12,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:2,fontFamily:'inherit',padding:0}}>
    {label} <span style={{fontSize:14}}>→</span>
  </button>
);

// ─── LANDING ────────────────────────────
function Landing({go}) {
  const [segment,setSegment]=useState('All');
  const [hqFilter,setHqFilter]=useState('All');
  const allCountries=useMemo(()=>['All',...[...new Set(CO.map(c=>c.co).filter(Boolean))].sort()],[]);
  const allSpecies=useMemo(()=>{const s=new Set();Object.values(SM).forEach(a=>a.forEach(sp=>s.add(sp)));return[...s].sort()},[]);
  const stats=useMemo(()=>({c:CO.length,co:allCountries.length-1,sp:allSpecies.length}),[allCountries,allSpecies]);

  return(
    <div className="fade" style={{maxWidth:1000,margin:'0 auto',padding:'48px 20px'}}>
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{fontSize:13,fontWeight:600,letterSpacing:'.15em',color:'#0d9488',textTransform:'uppercase',marginBottom:12}}>Planet Tracker</div>
        <h1 className="sf" style={{fontSize:42,fontWeight:700,lineHeight:1.2,marginBottom:12,background:'linear-gradient(135deg,#e2e8f0,#5eead4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Seafood Database</h1>
        <p style={{fontSize:15,color:'#94a3b8',maxWidth:560,margin:'0 auto',lineHeight:1.7}}>
          Explore sustainability risks across {stats.c} companies, {stats.co} countries, and {stats.sp} species in the global seafood supply chain.
        </p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        <div style={{background:'#111d35',border:'1px solid #243352',borderRadius:12,padding:28}}>
          <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>🔍 Company Explorer</h2>
          <p style={{fontSize:13,color:'#94a3b8',marginBottom:20,lineHeight:1.6}}>Filter and rank companies by supply chain segment, headquarters, and sustainability metrics.</p>
          <div style={{display:'grid',gap:12,marginBottom:20}}>
            <div>
              <label style={{fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4,display:'block'}}>Supply Chain</label>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {['All',...SEGS].map(s=>(<button key={s} className={`chip ${segment===s?'on':''}`} onClick={()=>setSegment(s)} style={{fontSize:11,padding:'4px 10px'}}>{s}</button>))}
              </div>
            </div>
            <div>
              <label style={{fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4,display:'block'}}>Headquarters</label>
              <select value={hqFilter} onChange={e=>setHqFilter(e.target.value)} style={{width:'100%'}}>
                {allCountries.map(c=><option key={c} value={c}>{c==='All'?'All Countries':c}</option>)}
              </select>
            </div>
          </div>
          <button className="tab on" style={{width:'100%',padding:'10px',fontSize:14}} onClick={()=>go('ranking',{segment,hq:hqFilter})}>Explore →</button>
        </div>
        <div style={{background:'#111d35',border:'1px solid #243352',borderRadius:12,padding:28,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',textAlign:'center'}}>
          <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>📊 Portfolio Assessment</h2>
          <p style={{fontSize:13,color:'#94a3b8',marginBottom:20,lineHeight:1.6}}>Select specific companies to compare against the 300-company benchmark on key metrics.</p>
          <button className="tab on" style={{padding:'10px 32px',fontSize:14}} onClick={()=>go('portfolio')}>Build Portfolio →</button>
        </div>
      </div>
    </div>
  );
}

// ─── RANKING ────────────────────────────
function Ranking({goCompany,goCountry,goSpecies,initFilters}) {
  const [q,setQ]=useState('');
  const [sf,setSf]=useState(initFilters?.segment||'All');
  const [cf,setCf]=useState(initFilters?.hq||'All');
  const [sc,setSc]=useState('n');
  const [sd,setSd]=useState('asc');
  const [expanded,setExpanded]=useState(null);

  const cos=useMemo(()=>['All',...[...new Set(CO.map(c=>c.co).filter(Boolean))].sort()],[]);
  const sort=useCallback(col=>{if(sc===col)setSd(d=>d==='asc'?'desc':'asc');else{setSc(col);setSd(col==='n'?'asc':'desc')}},[sc]);

  const data=useMemo(()=>{
    let d=[...CO];
    if(q){const s=q.toLowerCase();d=d.filter(c=>c.n.toLowerCase().includes(s)||(c.co||'').toLowerCase().includes(s))}
    if(sf!=='All'){const sk=SEGK[SEGS.indexOf(sf)];d=d.filter(c=>c.seg[sk])}
    if(cf!=='All')d=d.filter(c=>c.co===cf);
    d.sort((a,b)=>{let va,vb;
      if(sc==='n'){va=a.n;vb=b.n}else if(sc==='ms'){va=a.ms||'';vb=b.ms||''}
      else if(sc==='rev'){va=a.rev??-1e9;vb=b.rev??-1e9}
      else if(sc.startsWith('m_')){const mk=sc.slice(2);va=ENV[a.n]?.[mk]??-1;vb=ENV[b.n]?.[mk]??-1}
      else{va=0;vb=0}
      if(typeof va==='string')return sd==='asc'?va.localeCompare(vb):vb.localeCompare(va);
      return sd==='asc'?va-vb:vb-va;
    });return d;
  },[q,sf,cf,sc,sd]);

  const SI=({col})=>{if(sc!==col)return<span style={{opacity:.3,marginLeft:4}}>↕</span>;return<span style={{color:'#5eead4',marginLeft:4}}>{sd==='asc'?'↑':'↓'}</span>};
  const expandedSpecies=expanded?(SM[expanded]||[]):[];
  const expandedCountries=expanded?(CM[expanded]||[]):[];

  return(
    <div className="fade" style={{padding:20}}>
      <div style={{marginBottom:16,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'0 0 240px'}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,opacity:.5}}>🔍</span>
          <input className="sinp" placeholder="Search company or country..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {['All',...SEGS].map(s=><button key={s} className={`chip ${sf===s?'on':''}`} onClick={()=>setSf(s)}>{s}</button>)}
        </div>
        <select value={cf} onChange={e=>setCf(e.target.value)}>
          {cos.map(c=><option key={c} value={c}>{c==='All'?'🌍 All Countries':c}</option>)}
        </select>
        <span style={{fontSize:12,color:'#94a3b8',marginLeft:'auto'}}>{data.length} of {CO.length}</span>
      </div>
      <div style={{borderRadius:10,border:'1px solid #243352',overflow:'auto',maxHeight:'calc(100vh - 180px)',background:'#111d35'}}>
        <table className="rtbl"><thead><tr>
          <th style={{width:30}}>#</th>
          <th onClick={()=>sort('n')} style={{minWidth:160}}>Company<SI col="n"/></th>
          <th onClick={()=>sort('ms')}>Segment<SI col="ms"/></th>
          {RANK_METRICS.map(m=><th key={m.key} onClick={()=>sort('m_'+m.key)} style={{textAlign:'center',minWidth:100}}>{m.short}<SI col={'m_'+m.key}/></th>)}
          <th onClick={()=>sort('rev')} style={{textAlign:'right'}}>Rev ($M)<SI col="rev"/></th>
        </tr></thead><tbody>
          {data.map((c,i)=>{const isExp=expanded===c.n;return(
            <React.Fragment key={c.id||c.n}>
              <tr onClick={()=>setExpanded(isExp?null:c.n)} style={{background:isExp?'#162544':'transparent'}}>
                <td style={{color:'#94a3b8',fontSize:11}}>{i+1}</td>
                <td style={{fontWeight:600,fontSize:13}}><div style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>{c.n}</div><div style={{fontSize:11,color:'#94a3b8',fontWeight:400}}>{c.co||''}</div></td>
                <td><span className="pill" style={{background:'#0b1426',color:'#94a3b8',border:'1px solid #243352',fontSize:10}}>{c.ms||'—'}</span></td>
                {RANK_METRICS.map(m=><td key={m.key} style={{textAlign:'center'}}><MetricBar value={ENV[c.n]?.[m.key]} benchmark={BM[m.key]?.mean} good={m.good} width={80}/></td>)}
                <td style={{textAlign:'right',fontSize:12,fontFamily:'monospace'}}>{c.rev!=null?fN(c.rev):'—'}</td>
              </tr>
              {isExp&&<tr><td colSpan={3+RANK_METRICS.length+1} style={{padding:0,borderBottom:'2px solid #0d9488'}}>
                <div className="fade" style={{padding:'16px 20px',background:'#0b1426'}}>
                  <div style={{display:'flex',gap:24}}>
                    <div style={{flex:'0 0 260px'}}>
                      <h4 style={{fontSize:12,fontWeight:700,color:'#5eead4',marginBottom:8,textTransform:'uppercase',letterSpacing:'.05em'}}>Sustainability Assessment</h4>
                      <div style={{display:'grid',gap:4}}>
                        {SK.map(({k,l})=><div key={k} style={{display:'flex',alignItems:'center',gap:8}}><TrafficLight score={c.s[k]} size={16}/><span style={{fontSize:12,color:'#94a3b8'}}>{l}</span></div>)}
                      </div>
                      <button className="tab on" style={{marginTop:12,fontSize:12,padding:'6px 16px'}} onClick={e=>{e.stopPropagation();goCompany(c.n)}}>Explore Company →</button>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <h4 style={{fontSize:12,fontWeight:700,color:'#5eead4',marginBottom:8,textTransform:'uppercase',letterSpacing:'.05em'}}>Sourcing Insights</h4>
                      <div style={{display:'flex',gap:16}}>
                        <div style={{flex:1}}><div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>Countries ({expandedCountries.length})</div><div style={{display:'flex',flexWrap:'wrap',gap:3}}>{expandedCountries.slice(0,12).map(co=><Arrow key={co} label={co} onClick={e=>{e.stopPropagation();goCountry(co)}}/>)}{expandedCountries.length>12&&<span style={{fontSize:11,color:'#475569'}}>+{expandedCountries.length-12} more</span>}</div></div>
                        <div style={{flex:1}}><div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>Species ({expandedSpecies.length})</div><div style={{display:'flex',flexWrap:'wrap',gap:3}}>{expandedSpecies.slice(0,12).map(sp=><Arrow key={sp} label={sp} onClick={e=>{e.stopPropagation();goSpecies(sp)}}/>)}{expandedSpecies.length>12&&<span style={{fontSize:11,color:'#475569'}}>+{expandedSpecies.length-12} more</span>}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
              </td></tr>}
            </React.Fragment>
          )})}
        </tbody></table>
      </div>
    </div>
  );
}

// ─── COMPANY PROFILE ────────────────────
function CompanyProfile({name,goCountry,goSpecies,goBack}) {
  const c=CO.find(x=>x.n===name);
  if(!c)return<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Company not found</div>;
  const species=SM[name]||[];const countries=CM[name]||[];const assess=AS[name]||{};const env=ENV[name]||{};
  return(
    <div className="fade" style={{maxWidth:960,margin:'0 auto',padding:'24px 20px'}}>
      <button onClick={goBack} style={{background:'none',border:'none',color:'#5eead4',fontSize:13,cursor:'pointer',marginBottom:16,fontFamily:'inherit'}}>← Back</button>
      <div style={{marginBottom:24}}><h1 style={{fontSize:28,fontWeight:700,marginBottom:4}}>{c.n}</h1>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <span className="pill" style={{background:'#162544',color:'#5eead4',border:'1px solid #243352',fontSize:12}}>{c.ms}</span>
          {c.co&&<span style={{fontSize:13,color:'#94a3b8'}}>📍 {c.co}</span>}
          {c.web&&<a href={c.web.startsWith('http')?c.web:'https://'+c.web} target="_blank" rel="noopener" style={{fontSize:12,color:'#0d9488'}}>🔗 Website</a>}
        </div>
      </div>
      {c.desc&&<p style={{fontSize:14,color:'#94a3b8',lineHeight:1.7,marginBottom:24,background:'#111d35',padding:16,borderRadius:8,border:'1px solid #243352'}}>{c.desc}</p>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div>
          <h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:12}}>Environmental Metrics</h3>
          <div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',padding:16}}>
            {RANK_METRICS.map(m=><div key={m.key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><div style={{width:130,fontSize:12,color:'#94a3b8'}}>{m.short}</div><div style={{flex:1}}><MetricBar value={env[m.key]} benchmark={BM[m.key]?.mean} good={m.good} width={140}/></div></div>)}
            <div style={{fontSize:10,color:'#475569',marginTop:8}}>Grey line = benchmark average across all companies</div>
          </div>
          <h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:12,marginTop:20}}>Financial Overview</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
            {[{l:'Revenue',v:c.rev!=null?(c.rev>=1e3?'$'+(c.rev/1e3).toFixed(1)+'B':'$'+Number(c.rev).toFixed(0)+'M'):'—'},{l:'Market Cap',v:c.mc!=null?(c.mc>=1e3?'$'+(c.mc/1e3).toFixed(1)+'B':'$'+Number(c.mc).toFixed(0)+'M'):'—'},{l:'EBIT Margin',v:fPraw(c.em)},{l:'ROE',v:fPraw(c.roe)}].map(i=>(<div key={i.l} style={{background:'#111d35',borderRadius:8,padding:12,border:'1px solid #243352'}}><div style={{fontSize:11,color:'#94a3b8',marginBottom:2}}>{i.l}</div><div style={{fontSize:16,fontWeight:600}}>{i.v}</div></div>))}
          </div>
        </div>
        <div>
          <h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:12}}>Sustainability Assessment</h3>
          <div style={{display:'grid',gap:10}}>
            {SK.map(({k,l})=>{const a=assess[CAT_MAP[k]]||{};return(<div key={k} style={{background:'#111d35',borderRadius:8,padding:14,border:'1px solid #243352'}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><TrafficLight score={c.s[k]} size={18}/><span style={{fontSize:13,fontWeight:600}}>{l}</span><Badge v={c.s[k]}/></div>{a.t&&<p style={{fontSize:12,color:'#94a3b8',lineHeight:1.6,marginLeft:28}}>{a.t}</p>}</div>)})}
          </div>
        </div>
      </div>
      <div style={{marginTop:24,display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div><h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:12}}>Sourcing Countries ({countries.length})</h3><div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',padding:16,display:'flex',flexWrap:'wrap',gap:6}}>{countries.sort().map(co=><Arrow key={co} label={co} onClick={()=>goCountry(co)}/>)}{!countries.length&&<span style={{fontSize:13,color:'#475569',fontStyle:'italic'}}>No country data</span>}</div></div>
        <div><h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:12}}>Sourcing Species ({species.length})</h3><div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',padding:16,display:'flex',flexWrap:'wrap',gap:6}}>{species.sort().map(sp=><Arrow key={sp} label={sp} onClick={()=>goSpecies(sp)}/>)}{!species.length&&<span style={{fontSize:13,color:'#475569',fontStyle:'italic'}}>No species data</span>}</div></div>
      </div>
    </div>
  );
}

// ─── COUNTRY PROFILE ────────────────────
function CountryProfile({name,goCompany,goBack}) {
  const cd=CTD[name]||{};
  const companiesHere=useMemo(()=>{const r=[];for(const[cn,countries]of Object.entries(CM)){if(countries.includes(name))r.push(cn)}return r.sort()},[name]);
  const grouped=useMemo(()=>{const g={};for(const[metric,data]of Object.entries(cd)){
    let cat='Other';
    if(metric.includes('Ocean Health'))cat='Ocean Health Index';
    else if(metric.includes('Seafood Production')||metric.includes('Aquaculture Production'))cat='Seafood Production';
    else if(metric.includes('Seafood Imports')||metric.includes('Seafood Exports'))cat='Trade';
    else if(metric.includes('Food Consumption'))cat='Food Consumption';
    else if(metric.includes('Fishing Sustainability')||metric.includes('IUU')||metric.includes('fishing'))cat='Fishing Sustainability';
    else if(metric.includes('Governance')||metric.includes('observer'))cat='Governance & Monitoring';
    else if(metric.includes('RFMO'))cat='RFMO Membership';
    else if(metric.includes('treaty')||metric.includes('Convention')||metric.includes('Adoption'))cat='Key Treaties';
    else if(metric.includes('Top 10 Species'))cat='Top Species Caught';
    if(!g[cat])g[cat]=[];g[cat].push({metric,...data})}return g},[cd]);
  const catOrder=['Ocean Health Index','Fishing Sustainability','Governance & Monitoring','Seafood Production','Trade','Food Consumption','Top Species Caught','RFMO Membership','Key Treaties','Other'];
  return(
    <div className="fade" style={{maxWidth:960,margin:'0 auto',padding:'24px 20px'}}>
      <button onClick={goBack} style={{background:'none',border:'none',color:'#5eead4',fontSize:13,cursor:'pointer',marginBottom:16,fontFamily:'inherit'}}>← Back</button>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:4}}>🌍 {name}</h1>
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:24}}>{companiesHere.length} companies source from this country</p>
      <div style={{marginBottom:24}}><h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:8}}>Companies Sourcing Here</h3><div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',padding:16,display:'flex',flexWrap:'wrap',gap:6}}>{companiesHere.map(cn=><Arrow key={cn} label={cn} onClick={()=>goCompany(cn)}/>)}{!companiesHere.length&&<span style={{fontSize:13,color:'#475569'}}>No companies</span>}</div></div>
      {catOrder.filter(cat=>grouped[cat]).map(cat=>(<div key={cat} style={{marginBottom:20}}><h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:8}}>{cat}</h3><div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',overflow:'hidden'}}>{grouped[cat].map((r,i)=>(<div key={r.metric} style={{display:'flex',justifyContent:'space-between',padding:'8px 16px',borderBottom:i<grouped[cat].length-1?'1px solid #243352':'none'}}><span style={{fontSize:12,color:'#94a3b8'}}>{r.metric}</span><span style={{fontSize:12,fontWeight:600,color:r.t==='Bool'?(r.v==='Yes'?'#22c55e':'#ef4444'):'#e2e8f0'}}>{r.v}</span></div>))}</div></div>))}
    </div>
  );
}

// ─── SPECIES PROFILE ────────────────────
function SpeciesProfile({name,goCompany,goBack}) {
  const sd=SPD[name]||{};const iucn=IU[name];
  const companiesUsing=useMemo(()=>{const r=[];for(const[cn,species]of Object.entries(SM)){if(species.includes(name))r.push(cn)}return r.sort()},[name]);
  const iucnCol=IUCN_COL[iucn?.cat]||'#94a3b8';
  return(
    <div className="fade" style={{maxWidth:960,margin:'0 auto',padding:'24px 20px'}}>
      <button onClick={goBack} style={{background:'none',border:'none',color:'#5eead4',fontSize:13,cursor:'pointer',marginBottom:16,fontFamily:'inherit'}}>← Back</button>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:4}}>🐟 {name}</h1>
      {iucn&&<div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>{iucn.sci&&<span style={{fontSize:14,color:'#94a3b8',fontStyle:'italic'}}>{iucn.sci}</span>}<span className="pill" style={{background:iucnCol+'20',color:iucnCol,border:`1px solid ${iucnCol}40`,fontSize:12}}>{iucn.cat}</span>{iucn.trend&&<span style={{fontSize:12,color:'#94a3b8'}}>Trend: {iucn.trend}</span>}</div>}
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:24}}>{companiesUsing.length} companies source this species</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div><h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:8}}>FishSource & Catch Data</h3><div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',overflow:'hidden'}}>{Object.entries(sd).map(([metric,value],i)=>{const isScore=metric.includes('FishSource');const pct=isScore&&value!=null?value/10:null;return(<div key={metric} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:i<Object.keys(sd).length-1?'1px solid #243352':'none'}}><span style={{fontSize:12,color:'#94a3b8',flex:1}}>{metric}</span><div style={{display:'flex',alignItems:'center',gap:8}}>{isScore&&pct!=null&&<div style={{width:60,height:6,borderRadius:3,background:'#1e293b',overflow:'hidden'}}><div style={{width:`${Math.min(pct*100,100)}%`,height:'100%',borderRadius:3,background:pct>0.7?'#22c55e':pct>0.4?'#f59e0b':'#ef4444'}}/></div>}<span style={{fontSize:12,fontWeight:600,minWidth:60,textAlign:'right'}}>{value!=null?(typeof value==='number'?(value>100?Number(value).toLocaleString():Number(value).toFixed(1)):value):'—'}</span></div></div>)})}
          {Object.keys(sd).length===0&&<div style={{padding:16,fontSize:13,color:'#475569',fontStyle:'italic'}}>No species data available</div>}
        </div></div>
        <div><h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:8}}>Companies Sourcing This Species</h3><div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',padding:16,display:'flex',flexWrap:'wrap',gap:6}}>{companiesUsing.map(cn=><Arrow key={cn} label={cn} onClick={()=>goCompany(cn)}/>)}</div></div>
      </div>
    </div>
  );
}

// ─── COUNTRIES EXPLORER ─────────────────
function CountriesExplorer({goCountry}) {
  const [q,setQ]=useState('');
  const countries=useMemo(()=>Object.keys(CTD).sort().map(name=>{let cc=0;for(const cn of Object.keys(CM)){if(CM[cn].includes(name))cc++}const cd=CTD[name]||{};const ohi=cd['Ocean Health Index - Score (2024)'];return{name,companyCount:cc,ohi:ohi?.v}}),[]);
  const filtered=useMemo(()=>{if(!q)return countries;const s=q.toLowerCase();return countries.filter(c=>c.name.toLowerCase().includes(s))},[countries,q]);
  return(
    <div className="fade" style={{maxWidth:960,margin:'0 auto',padding:'24px 20px'}}>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:4}}>🌍 Countries</h1>
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>{countries.length} countries in the database. Click any country to see its full profile.</p>
      <div style={{position:'relative',maxWidth:320,marginBottom:20}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,opacity:.5}}>🔍</span><input className="sinp" placeholder="Search countries..." value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
        {filtered.map(c=>(<div key={c.name} onClick={()=>goCountry(c.name)} style={{background:'#111d35',border:'1px solid #243352',borderRadius:8,padding:16,cursor:'pointer',transition:'border-color .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#0d9488'} onMouseLeave={e=>e.currentTarget.style.borderColor='#243352'}><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{c.name}</div><div style={{display:'flex',gap:16,fontSize:12,color:'#94a3b8'}}><span>{c.companyCount} {c.companyCount===1?'company':'companies'}</span>{c.ohi&&<span>OHI: {c.ohi}</span>}</div></div>))}
      </div>
    </div>
  );
}

// ─── SPECIES EXPLORER ───────────────────
function SpeciesExplorer({goSpecies}) {
  const [q,setQ]=useState('');const [iucnFilter,setIucnFilter]=useState('All');
  const allSpecies=useMemo(()=>{const sSet=new Set();Object.values(SM).forEach(arr=>arr.forEach(s=>sSet.add(s)));return[...sSet].sort().map(name=>{const iu=IU[name];let cc=0;for(const cn of Object.keys(SM)){if(SM[cn].includes(name))cc++}const sd=SPD[name]||{};const sh=sd['FishSource Score: Current Stock Health'];return{name,iucn:iu?.cat||'Not Assessed',sci:iu?.sci,companyCount:cc,stockHealth:sh}})},[]);
  const iucnCats=useMemo(()=>{const cats=new Set(allSpecies.map(s=>s.iucn));return['All',...['Critically Endangered','Endangered','Vulnerable','Near Threatened','Least Concern','Data Deficient','Not Assessed'].filter(c=>cats.has(c))]},[allSpecies]);
  const filtered=useMemo(()=>{let l=allSpecies;if(q){const s=q.toLowerCase();l=l.filter(sp=>sp.name.toLowerCase().includes(s)||(sp.sci||'').toLowerCase().includes(s))}if(iucnFilter!=='All')l=l.filter(sp=>sp.iucn===iucnFilter);return l},[allSpecies,q,iucnFilter]);
  return(
    <div className="fade" style={{maxWidth:960,margin:'0 auto',padding:'24px 20px'}}>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:4}}>🐟 Species</h1>
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>{allSpecies.length} species in the database.</p>
      <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:20}}>
        <div style={{position:'relative',flex:'0 0 280px'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,opacity:.5}}>🔍</span><input className="sinp" placeholder="Search species..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{iucnCats.map(cat=><button key={cat} className={`chip ${iucnFilter===cat?'on':''}`} onClick={()=>setIucnFilter(cat)} style={{fontSize:11,padding:'4px 10px',borderColor:cat!=='All'&&IUCN_COL[cat]?IUCN_COL[cat]+'60':undefined,color:iucnFilter===cat?'#fff':(IUCN_COL[cat]||'#94a3b8'),background:iucnFilter===cat?(IUCN_COL[cat]||'#0d9488'):'transparent'}}>{cat}</button>)}</div>
        <span style={{fontSize:12,color:'#94a3b8',marginLeft:'auto'}}>{filtered.length} species</span>
      </div>
      <div style={{borderRadius:10,border:'1px solid #243352',overflow:'auto',maxHeight:'calc(100vh - 220px)',background:'#111d35'}}>
        <table className="rtbl"><thead><tr><th style={{minWidth:180}}>Species</th><th>Scientific Name</th><th style={{textAlign:'center'}}>IUCN Status</th><th style={{textAlign:'center'}}>Stock Health</th><th style={{textAlign:'right'}}>Companies</th></tr></thead><tbody>
          {filtered.map(sp=>{const col=IUCN_COL[sp.iucn]||'#475569';return(<tr key={sp.name} onClick={()=>goSpecies(sp.name)}><td style={{fontWeight:600,fontSize:13}}>{sp.name}</td><td style={{fontSize:12,color:'#94a3b8',fontStyle:'italic'}}>{sp.sci||'—'}</td><td style={{textAlign:'center'}}><span className="pill" style={{background:col+'20',color:col,border:`1px solid ${col}40`,fontSize:11}}>{sp.iucn}</span></td><td style={{textAlign:'center'}}>{sp.stockHealth!=null?<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><div style={{width:40,height:6,borderRadius:3,background:'#1e293b',overflow:'hidden'}}><div style={{width:`${Math.min(sp.stockHealth*10,100)}%`,height:'100%',borderRadius:3,background:sp.stockHealth>7?'#22c55e':sp.stockHealth>4?'#f59e0b':'#ef4444'}}/></div><span style={{fontSize:11,color:'#94a3b8'}}>{sp.stockHealth.toFixed(1)}</span></div>:<span style={{color:'#475569',fontSize:11}}>—</span>}</td><td style={{textAlign:'right',fontSize:12}}>{sp.companyCount}</td></tr>)})}
        </tbody></table>
      </div>
    </div>
  );
}

// ─── PORTFOLIO ──────────────────────────
function Portfolio({goCompany}) {
  const [selected,setSelected]=useState([]);const [search,setSearch]=useState('');
  const searchResults=useMemo(()=>{if(!search)return[];const q=search.toLowerCase();return CO.filter(c=>c.n.toLowerCase().includes(q)&&!selected.includes(c.n)).slice(0,8)},[search,selected]);
  const add=n=>{setSelected(p=>[...p,n]);setSearch('')};const remove=n=>setSelected(p=>p.filter(x=>x!==n));
  const cd=useMemo(()=>selected.map(n=>CO.find(c=>c.n===n)).filter(Boolean),[selected]);

  const portfolioAvgs=useMemo(()=>{const a={};for(const m of RANK_METRICS){const v=cd.map(c=>ENV[c.n]?.[m.key]).filter(v=>v!=null);a[m.key]=v.length?v.reduce((a,b)=>a+b,0)/v.length:null}return a},[cd]);
  const sustainDist=useMemo(()=>{const d={};for(const{k,l}of SK){const counts={3:0,2:0,1:0,0:0};cd.forEach(c=>{const v=c.s[k];counts[v!=null?v:0]++});const scored=cd.filter(c=>c.s[k]!=null&&c.s[k]>0);const avg=scored.length?scored.reduce((a,c)=>a+c.s[k],0)/scored.length:null;const all=CO.filter(c=>c.s[k]!=null&&c.s[k]>0);const bmAvg=all.length?all.reduce((a,c)=>a+c.s[k],0)/all.length:null;d[k]={counts,avg,bmAvg,label:l}}return d},[cd]);
  const overallScore=useMemo(()=>{const d=Object.values(sustainDist).map(d=>d.avg).filter(v=>v!=null);return d.length?d.reduce((a,b)=>a+b,0)/d.length:null},[sustainDist]);
  const overallBM=useMemo(()=>{const d=Object.values(sustainDist).map(d=>d.bmAvg).filter(v=>v!=null);return d.length?d.reduce((a,b)=>a+b,0)/d.length:null},[sustainDist]);
  const scoreColor=v=>v>=2.5?'#22c55e':v>=1.5?'#f59e0b':v>0?'#ef4444':'#475569';

  return(
    <div className="fade" style={{maxWidth:1060,margin:'0 auto',padding:'24px 20px'}}>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:4}}>📊 Portfolio Assessment</h1>
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>Select companies to build a portfolio and compare against the 300-company benchmark.</p>

      <div style={{background:'#111d35',border:'1px solid #243352',borderRadius:10,padding:20,marginBottom:24}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{flex:'0 0 300px',position:'relative'}}>
            <label style={{fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4,display:'block'}}>Add Companies</label>
            <input className="sinp" style={{paddingLeft:12}} placeholder="Type company name..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {searchResults.length>0&&<div style={{position:'absolute',top:'100%',left:0,right:0,background:'#162544',border:'1px solid #243352',borderRadius:8,marginTop:4,zIndex:20,maxHeight:240,overflowY:'auto'}}>{searchResults.map(c=><div key={c.n} onClick={()=>add(c.n)} style={{padding:'8px 12px',fontSize:13,cursor:'pointer',borderBottom:'1px solid #243352'}} onMouseEnter={e=>e.currentTarget.style.background='#1a2740'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{c.n} <span style={{color:'#94a3b8',fontSize:11}}>· {c.ms} · {c.co||'—'}</span></div>)}</div>}
          </div>
          <div style={{flex:1}}><label style={{fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4,display:'block'}}>Selected ({selected.length})</label><div style={{display:'flex',flexWrap:'wrap',gap:4,minHeight:36}}>{selected.map(n=><span key={n} className="pill" style={{background:'#162544',color:'#5eead4',border:'1px solid #243352',cursor:'pointer',fontSize:11,padding:'4px 8px'}} onClick={()=>remove(n)}>{n} ✕</span>)}{!selected.length&&<span style={{fontSize:12,color:'#475569',fontStyle:'italic',alignSelf:'center'}}>No companies selected — type above to add</span>}</div></div>
        </div>
      </div>

      {!cd.length&&<div style={{textAlign:'center',padding:'60px 20px',color:'#475569'}}><div style={{fontSize:48,marginBottom:12}}>📋</div><p style={{fontSize:15}}>Add companies above to see your portfolio assessment</p></div>}

      {cd.length>0&&<>
        <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:20,marginBottom:24}}>
          <div style={{background:'#111d35',border:'1px solid #243352',borderRadius:10,padding:24,textAlign:'center'}}>
            <div style={{fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:12}}>Portfolio Score</div>
            <div style={{position:'relative',width:120,height:120,margin:'0 auto 12px'}}>
              <svg viewBox="0 0 120 120" style={{width:120,height:120}}><circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="8"/><circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor(overallScore||0)} strokeWidth="8" strokeDasharray={`${(overallScore||0)/3*327} 327`} strokeLinecap="round" transform="rotate(-90 60 60)" style={{transition:'stroke-dasharray .6s ease-out'}}/></svg>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:28,fontWeight:700,color:scoreColor(overallScore||0)}}>{overallScore!=null?overallScore.toFixed(1):'—'}</div><div style={{fontSize:11,color:'#94a3b8'}}>out of 3.0</div></div>
            </div>
            <div style={{fontSize:12,color:'#94a3b8'}}>Benchmark: <span style={{fontWeight:600,color:'#e2e8f0'}}>{overallBM!=null?overallBM.toFixed(1):'—'}</span></div>
            {overallScore!=null&&overallBM!=null&&<div style={{fontSize:11,color:overallScore>=overallBM?'#22c55e':'#ef4444',marginTop:4}}>{overallScore>=overallBM?`▲ ${((overallScore-overallBM)/overallBM*100).toFixed(0)}% above`:`▼ ${((overallBM-overallScore)/overallBM*100).toFixed(0)}% below`} benchmark</div>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {SK.map(({k,l})=>{const d=sustainDist[k];return(<div key={k} style={{background:'#111d35',border:'1px solid #243352',borderRadius:8,padding:14}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:12,fontWeight:600}}>{l}</span><span style={{fontSize:13,fontWeight:700,color:scoreColor(d.avg||0)}}>{d.avg!=null?d.avg.toFixed(1):'—'}</span></div><div style={{display:'flex',height:8,borderRadius:4,overflow:'hidden',marginBottom:6}}>{d.counts[3]>0&&<div style={{flex:d.counts[3],background:'#22c55e'}}/>}{d.counts[2]>0&&<div style={{flex:d.counts[2],background:'#f59e0b'}}/>}{d.counts[1]>0&&<div style={{flex:d.counts[1],background:'#ef4444'}}/>}{d.counts[0]>0&&<div style={{flex:d.counts[0],background:'#475569'}}/>}</div><div style={{display:'flex',gap:8,fontSize:10,color:'#94a3b8'}}><span>🟢{d.counts[3]}</span><span>🟡{d.counts[2]}</span><span>🔴{d.counts[1]}</span>{d.counts[0]>0&&<span>⬜{d.counts[0]}</span>}</div><div style={{fontSize:10,color:'#475569',marginTop:4}}>Benchmark: {d.bmAvg!=null?d.bmAvg.toFixed(2):'—'}</div></div>)})}
          </div>
        </div>

        <h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:12}}>Environmental Metrics — Portfolio vs. Benchmark</h3>
        <div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',padding:20,marginBottom:24}}>
          {RANK_METRICS.map(m=>{const pA=portfolioAvgs[m.key];const bA=BM[m.key]?.mean;const better=m.good==='high'?(pA||0)>=(bA||0):(pA||0)<=(bA||0);const mx=Math.max(pA||0,bA||0,0.01);return(<div key={m.key} style={{marginBottom:18}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,fontWeight:500}}>{m.label}</span><span style={{fontSize:12,color:better?'#22c55e':'#ef4444'}}>{better?'✓ Outperforms':'⚠ Underperforms'}{m.good==='low'&&<span style={{fontSize:10,color:'#475569',marginLeft:4}}>(lower is better)</span>}</span></div><div style={{display:'grid',gap:3}}>{[{l:'Portfolio',c:'#5eead4',v:pA,bc:better?'#22c55e':'#ef4444'},{l:'Benchmark',c:'#94a3b8',v:bA,bc:'#475569'}].map(r=>(<div key={r.l} style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:r.c,width:70}}>{r.l}</span><div style={{flex:1,height:14,borderRadius:4,background:'#1e293b',overflow:'hidden'}}>{r.v!=null&&<div style={{width:`${Math.min(r.v/Math.max(mx*1.1,0.01)*100,100)}%`,height:'100%',borderRadius:4,background:r.bc,transition:'width .4s'}}/>}</div><span style={{fontSize:12,fontWeight:r.l==='Portfolio'?600:400,color:r.l==='Portfolio'?'#e2e8f0':'#94a3b8',width:52,textAlign:'right'}}>{r.v!=null?(r.v*100).toFixed(1)+'%':'—'}</span></div>))}</div></div>)})}
        </div>

        <h3 style={{fontSize:14,fontWeight:700,color:'#5eead4',marginBottom:12}}>Company Breakdown</h3>
        <div style={{background:'#111d35',borderRadius:8,border:'1px solid #243352',overflow:'auto'}}>
          <table className="rtbl"><thead><tr><th style={{width:30}}></th><th>Company</th><th>Segment</th>{SK.map(({k,s})=><th key={k} style={{textAlign:'center'}}>{s}</th>)}{RANK_METRICS.map(m=><th key={m.key} style={{textAlign:'center'}}>{m.short}</th>)}</tr></thead><tbody>
            {cd.map(c=>(<tr key={c.n} onClick={()=>goCompany(c.n)} style={{cursor:'pointer'}}><td><button onClick={e=>{e.stopPropagation();remove(c.n)}} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:14,padding:0}}>✕</button></td><td style={{fontWeight:600,fontSize:13}}><div>{c.n}</div><div style={{fontSize:11,color:'#94a3b8',fontWeight:400}}>{c.co||''}</div></td><td><span className="pill" style={{background:'#0b1426',color:'#94a3b8',border:'1px solid #243352',fontSize:10}}>{c.ms}</span></td>{SK.map(({k})=><td key={k} style={{textAlign:'center'}}><TrafficLight score={c.s[k]} size={14}/></td>)}{RANK_METRICS.map(m=><td key={m.key} style={{textAlign:'center'}}><MetricBar value={ENV[c.n]?.[m.key]} benchmark={BM[m.key]?.mean} good={m.good} width={60}/></td>)}</tr>))}
          </tbody></table>
        </div>
      </>}
    </div>
  );
}

// ─── LOADING SCREEN ─────────────────────
function LoadingScreen({file,progress,total}) {
  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0b1426',color:'#e2e8f0'}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:'#0d9488',marginBottom:16}}/>
      <h1 style={{fontSize:20,fontWeight:700,marginBottom:8}}>Planet Tracker — Seafood Database</h1>
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:24}}>Loading data...</p>
      <div style={{width:300,height:6,borderRadius:3,background:'#1e293b',overflow:'hidden',marginBottom:8}}>
        <div style={{width:`${(progress/total)*100}%`,height:'100%',borderRadius:3,background:'#0d9488',transition:'width .3s'}}/>
      </div>
      <p style={{fontSize:11,color:'#475569'}}>{file} ({progress}/{total})</p>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────
function App() {
  const [page,setPage]=useState({view:'landing'});
  const [history,setHistory]=useState([]);
  const navigate=useCallback((view,params={})=>{setHistory(h=>[...h,page]);setPage({view,...params});window.scrollTo(0,0)},[page]);
  const goBack=useCallback(()=>{if(history.length){setPage(history[history.length-1]);setHistory(h=>h.slice(0,-1));window.scrollTo(0,0)}else setPage({view:'landing'})},[history]);

  const navItems=[{id:'landing',l:'Home'},{id:'ranking',l:'Companies'},{id:'countries',l:'Countries'},{id:'speciesList',l:'Species'},{id:'portfolio',l:'Portfolio'}];
  return(
    <div style={{minHeight:'100vh'}}>
      <header style={{background:'#111d35',borderBottom:'1px solid #243352',padding:'0 20px',display:'flex',alignItems:'center',height:52,position:'sticky',top:0,zIndex:40}}>
        <div style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>{setPage({view:'landing'});setHistory([])}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#0d9488'}}/><span style={{fontSize:14,fontWeight:700}}>Planet Tracker</span><span style={{fontSize:13,color:'#94a3b8'}}>Seafood Database</span>
        </div>
        <div style={{display:'flex',gap:4,marginLeft:32}}>
          {navItems.map(v=><button key={v.id} className={`tab ${page.view===v.id?'on':''}`} onClick={()=>{setPage({view:v.id});setHistory([])}}>{v.l}</button>)}
        </div>
        {['company','country','species'].includes(page.view)&&<div style={{marginLeft:16,fontSize:12,color:'#94a3b8'}}>/ <span style={{color:'#e2e8f0'}}>{page.name}</span></div>}
      </header>
      {page.view==='landing'&&<Landing go={(v,p)=>navigate(v,p)}/>}
      {page.view==='ranking'&&<Ranking initFilters={page} goCompany={n=>navigate('company',{name:n})} goCountry={n=>navigate('country',{name:n})} goSpecies={n=>navigate('species',{name:n})}/>}
      {page.view==='company'&&<CompanyProfile name={page.name} goCountry={n=>navigate('country',{name:n})} goSpecies={n=>navigate('species',{name:n})} goBack={goBack}/>}
      {page.view==='country'&&<CountryProfile name={page.name} goCompany={n=>navigate('company',{name:n})} goBack={goBack}/>}
      {page.view==='species'&&<SpeciesProfile name={page.name} goCompany={n=>navigate('company',{name:n})} goBack={goBack}/>}
      {page.view==='countries'&&<CountriesExplorer goCountry={n=>navigate('country',{name:n})}/>}
      {page.view==='speciesList'&&<SpeciesExplorer goSpecies={n=>navigate('species',{name:n})}/>}
      {page.view==='portfolio'&&<Portfolio goCompany={n=>navigate('company',{name:n})}/>}
    </div>
  );
}

// ─── BOOTSTRAP ──────────────────────────
function Root() {
  const [loaded,setLoaded]=useState(false);
  const [loadState,setLoadState]=useState({file:'',progress:0,total:9});

  useEffect(()=>{
    loadAllData((file,i,total)=>setLoadState({file,progress:i+1,total}))
      .then(data=>{
        CO=data.COMPANIES;SM=data.SPECIES_MAP;CM=data.COUNTRIES_MAP;AS=data.ASSESSMENTS;
        IU=data.IUCN;ENV=data.ENV_SCORES;SPD=data.SPECIES_DATA;CTD=data.COUNTRY_DATA;BM=data.BENCHMARKS;
        setLoaded(true);
      })
      .catch(err=>{console.error('Data load failed:',err);alert('Failed to load data. Make sure CSV files are in the data/ folder.')});
  },[]);

  if(!loaded) return <LoadingScreen {...loadState}/>;
  return <App/>;
}

createRoot(document.getElementById('root')).render(<Root/>);
