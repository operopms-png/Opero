          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {socials.filter((p:any)=>p.module===moduleFilter).length===0?(<div style={{gridColumn:'span 3' as const,textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}><div style={{fontSize:36,marginBottom:12}}>📱</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No posts yet</div></div>):socials.filter((p:any)=>p.module===moduleFilter).map((p:any)=>(
              <div key={p.id} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT}}>{p.platform}</span>
                  <span style={{fontSize:11,color:p.status==='Published'?'#10B981':'#667085',fontWeight:600}}>{p.status}</span>
                </div>
                <p style={{fontSize:13,color:'#344054',lineHeight:1.5,marginBottom:8}}>{p.caption}</p>
                {p.scheduled_at&&<div style={{fontSize:11,color:'#98A2B3',marginBottom:8}}>📅 {p.scheduled_at}</div>}
                <button onClick={()=>del('marketing_socials',p.id,setSocials)} style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444',width:'100%'}}>Delete</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Ads'&&(<div>
          {showAdForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Ad</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Ad Name *</label><input value={adForm.name} onChange={e=>setAdForm({...adForm,name:e.target.value})} placeholder="Ad name" style={inp}/></div>
              <div><label style={lbl}>Platform</label><select value={adForm.platform} onChange={e=>setAdForm({...adForm,platform:e.target.value})} style={inp}>{['Google','Facebook','Instagram','TikTok','LinkedIn'].map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={lbl}>Budget (£)</label><input value={adForm.budget} onChange={e=>setAdForm({...adForm,budget:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
              <div><label style={lbl}>Status</label><select value={adForm.status} onChange={e=>setAdForm({...adForm,status:e.target.value})} style={inp}>{['Draft','Active','Paused','Ended'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Start Date</label><input value={adForm.start_date} onChange={e=>setAdForm({...adForm,start_date:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>End Date</label><input value={adForm.end_date} onChange={e=>setAdForm({...adForm,end_date:e.target.value})} type="date" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!adForm.name)return;save('marketing_ads',{...adForm,budget:adForm.budget?parseFloat(adForm.budget):null},()=>setAdForm({name:'',platform:'Google',budget:'',status:'Draft',start_date:'',end_date:''}),()=>setShowAdForm(false))}} disabled={saving} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1}}>{saving?'Saving…':'Save'}</button>
              <button onClick={()=>setShowAdForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 120px 100px 100px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Ad Name</span><span>Platform</span><span>Budget</span><span>Start</span><span>Status</span><span></span>
            </div>
            {ads.filter((a:any)=>a.module===moduleFilter).length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>📢</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No ads yet</div></div>):ads.filter((a:any)=>a.module===moduleFilter).map((a:any)=>(
              <div key={a.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 100px 100px 100px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{a.name}</span>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{a.platform}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>{a.budget?'£'+parseFloat(a.budget).toLocaleString():'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{a.start_date||'—'}</span>
                <select value={a.status} onChange={e=>updateField('marketing_ads',a.id,'status',e.target.value,setAds)} style={{fontSize:11,border:'1px solid #E4E7EC',borderRadius:4,padding:'3px 6px',fontFamily:'inherit'}}>{['Draft','Active','Paused','Ended'].map(s=><option key={s}>{s}</option>)}</select>
                <button onClick={()=>del('marketing_ads',a.id,setAds)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Analytics'&&(()=>{
          const sentEmails = emails.filter((e:any)=>e.module===moduleFilter&&e.status==='Sent')
          const sentIds = sentEmails.map((e:any)=>e.id)
          const allSentEvents = emailEvents.filter((ev:any)=>sentIds.includes(ev.marketing_email_id))
          const deliveredCount = sentEmails.filter((e:any)=>allSentEvents.some((ev:any)=>ev.marketing_email_id===e.id&&ev.type==='delivered')).length
          const openedCount = new Set(allSentEvents.filter((ev:any)=>ev.type==='opened').map((ev:any)=>ev.marketing_email_id)).size
          const clickedCount = new Set(allSentEvents.filter((ev:any)=>ev.type==='clicked').map((ev:any)=>ev.marketing_email_id)).size
          const pct = (n:number,d:number)=>d>0?Math.round((n/d)*100):0

          const socialByPlatform: Record<string,number> = {}
          socials.forEach((s:any)=>{ socialByPlatform[s.platform]=(socialByPlatform[s.platform]||0)+1 })
          const maxSocial = Math.max(1,...Object.values(socialByPlatform))

          const adsByPlatform: Record<string,{spend:number,active:number,paused:number,ended:number,total:number}> = {}
          ads.forEach((a:any)=>{
            const p = a.platform||'Other'
            if(!adsByPlatform[p]) adsByPlatform[p]={spend:0,active:0,paused:0,ended:0,total:0}
            adsByPlatform[p].spend += parseFloat(a.budget||0)
            adsByPlatform[p].total += 1
            if(a.status==='Active') adsByPlatform[p].active += 1
            else if(a.status==='Paused') adsByPlatform[p].paused += 1
            else if(a.status==='Ended') adsByPlatform[p].ended += 1
          })

          return (
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:20,fontWeight:700,color:'#101828'}}>Marketing Analytics</div>
              <div style={{fontSize:12,color:'#667085',marginTop:2}}>Performance across every channel</div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Total Campaigns',v:campaigns.length,c:ACCENT},{l:'Emails Sent',v:sentEmails.length,c:'#10B981'},{l:'Social Posts',v:socials.length,c:'#F59E0B'},{l:'Ad Spend',v:'£'+ads.reduce((s:number,a:any)=>s+parseFloat(a.budget||0),0).toLocaleString(),c:'#101828'}].map((s:any)=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
                  <div style={{fontSize:26,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:22}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>✉️ Email Performance</div>
                  <button onClick={()=>{setSection('Email');setEmailSubTab('Analyze')}} style={{fontSize:11,color:ACCENT,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>View details →</button>
                </div>
                {sentEmails.length===0?(
                  <div style={{textAlign:'center' as const,padding:20,color:'#98A2B3',fontSize:12}}>No emails sent yet.</div>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    <div style={{textAlign:'center' as const}}><div style={{fontSize:18,fontWeight:700,color:'#101828'}}>{pct(openedCount,deliveredCount)}%</div><div style={{fontSize:10,color:'#98A2B3'}}>Open Rate</div></div>
                    <div style={{textAlign:'center' as const}}><div style={{fontSize:18,fontWeight:700,color:'#101828'}}>{pct(clickedCount,deliveredCount)}%</div><div style={{fontSize:10,color:'#98A2B3'}}>Click Rate</div></div>
                    <div style={{textAlign:'center' as const}}><div style={{fontSize:18,fontWeight:700,color:'#101828'}}>{deliveredCount}</div><div style={{fontSize:10,color:'#98A2B3'}}>Delivered</div></div>
                  </div>
                )}
              </div>

              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:22}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>📱 Social by Platform</div>
                {Object.keys(socialByPlatform).length===0?(
                  <div style={{textAlign:'center' as const,padding:20,color:'#98A2B3',fontSize:12}}>No posts yet.</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {Object.entries(socialByPlatform).map(([platform,count])=>(
                      <div key={platform} style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{width:70,fontSize:12,color:'#344054'}}>{platform}</span>
                        <div style={{flex:1,background:'#F2F4F7',borderRadius:4,height:8,overflow:'hidden'}}><div style={{width:(count/maxSocial*100)+'%',height:'100%',background:ACCENT}}/></div>
                        <span style={{fontSize:11,color:'#667085',width:16,textAlign:'right' as const}}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:22,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>📢 Ads by Platform</div>
              {Object.keys(adsByPlatform).length===0?(
                <div style={{textAlign:'center' as const,padding:20,color:'#98A2B3',fontSize:12}}>No ads yet.</div>
              ):(
                <div style={{display:'grid',gridTemplateColumns:`repeat(${Object.keys(adsByPlatform).length},1fr)`,gap:16}}>
                  {Object.entries(adsByPlatform).map(([platform,d])=>(
                    <div key={platform} style={{border:'1px solid #F2F4F7',borderRadius:8,padding:14}}>
                      <div style={{fontSize:11,color:'#667085',textTransform:'uppercase' as const,marginBottom:4}}>{platform}</div>
                      <div style={{fontSize:18,fontWeight:700,color:'#101828'}}>£{d.spend.toLocaleString()}</div>
                      <div style={{fontSize:11,color:d.active>0?'#10B981':'#98A2B3',marginTop:2}}>{d.active>0?`● ${d.active} Active`:d.paused>0?`● ${d.paused} Paused`:d.ended>0?`● ${d.ended} Ended`:'No active ads'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{padding:'16px 22px',fontSize:14,fontWeight:600,color:'#101828',borderBottom:'1px solid #F2F4F7'}}>Campaign Performance</div>
              {campaigns.filter((c:any)=>c.module===moduleFilter).length===0?<div style={{color:'#98A2B3',fontSize:13,textAlign:'center' as const,padding:40}}>No campaigns to show yet.</div>:(<>
                <div style={{display:'grid',gridTemplateColumns:'1.5fr 100px 100px 120px 100px',padding:'10px 22px',background:'#F9FAFB',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const}}>
                  <span>Campaign</span><span>Type</span><span>Budget</span><span>Dates</span><span>Status</span>
                </div>
                {campaigns.filter((c:any)=>c.module===moduleFilter).map((c:any)=>(
                  <div key={c.id} style={{display:'grid',gridTemplateColumns:'1.5fr 100px 100px 120px 100px',padding:'13px 22px',borderBottom:'1px solid #F2F4F7',fontSize:13,alignItems:'center'}}>
                    <span style={{color:'#101828',fontWeight:500}}>{c.name}</span>
                    <span style={{color:'#667085'}}>{c.type}</span>
                    <span style={{color:'#101828',fontWeight:600}}>{c.budget?'£'+parseFloat(c.budget).toLocaleString():'—'}</span>
                    <span style={{color:'#667085',fontSize:11}}>{c.start_date?`${c.start_date} – ${c.end_date||'—'}`:'—'}</span>
                    <span style={{fontSize:11,fontWeight:600,color:c.status==='Active'?'#10B981':'#667085',background:c.status==='Active'?'#ECFDF5':'#F9FAFB',padding:'3px 8px',borderRadius:4,width:'fit-content'}}>{c.status}</span>
                  </div>
                ))}
              </>)}
            </div>
          </div>
          )
        })()}

      </div>
    </div>
  )
}
