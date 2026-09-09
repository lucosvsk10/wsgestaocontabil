import { motion } from 'framer-motion';
import { useState } from 'react';

export type ExtractorIconName = 'dashboard'|'company'|'document'|'report'|'certificate'|'history'|'settings'|'search'|'refresh'|'download'|'upload'|'eye'|'warning'|'check';

type Props={name:ExtractorIconName;className?:string;title?:string};

export default function AnimatedExtractorIcon({name,className='',title}:Props){
  const [hot,setHot]=useState(false);
  const common={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  const enter=()=>setHot(true),leave=()=>setHot(false);
  const transition={duration:.42,ease:[.22,1,.36,1] as [number,number,number,number]};
  return <motion.svg viewBox="0 0 24 24" aria-hidden={title?undefined:true} role={title?'img':undefined} className={className} onMouseEnter={enter} onMouseLeave={leave} initial={false}>
    {title&&<title>{title}</title>}
    {name==='search'&&<><motion.circle cx="11" cy="11" r="6.6" {...common} animate={{rotate:hot?22:0,scale:hot?1.04:1}} style={{transformOrigin:'11px 11px'}} transition={transition}/><motion.path d="m16 16 4.1 4.1" {...common} animate={{x:hot?1:0,y:hot?1:0}} transition={transition}/></>}
    {name==='document'&&<><path d="M7 3.5h7l4 4V20H7z" {...common}/><path d="M14 3.5V8h4" {...common}/><motion.path d="M10 11h5.5" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.55}}/><motion.path d="M10 14.5h5.5" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.55,delay:hot?.12:0}}/><motion.path d="M10 18h3.8" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.5,delay:hot?.22:0}}/></>}
    {name==='company'&&<><motion.path d="M4 20V8l8-4 8 4v12" {...common} animate={{y:hot?-.4:0}} transition={transition}/><path d="M8 20v-5h8v5" {...common}/>{[8,12,16].map((x,i)=><motion.rect key={x} x={x-1} y="9.5" width="2" height="2.2" rx=".35" {...common} animate={{opacity:hot?[.35,1,.35]:1,y:hot?[0,-.5,0]:0}} transition={{duration:.72,delay:i*.09}}/>)}</>}
    {name==='report'&&<><path d="M4 20h16" {...common}/><motion.path d="M7 17v-5" {...common} animate={{scaleY:hot?1.5:1}} style={{transformOrigin:'7px 17px'}} transition={transition}/><motion.path d="M12 17V8" {...common} animate={{scaleY:hot?1.18:1}} style={{transformOrigin:'12px 17px'}} transition={{...transition,delay:.05}}/><motion.path d="M17 17v-8" {...common} animate={{scaleY:hot?1.35:1}} style={{transformOrigin:'17px 17px'}} transition={{...transition,delay:.1}}/></>}
    {name==='certificate'&&<><motion.path d="M12 3.5 19 6v5.2c0 4.4-2.8 7.4-7 9.3-4.2-1.9-7-4.9-7-9.3V6z" {...common} animate={{rotate:hot?[0,-4,3,0]:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.6}}/><motion.path d="m8.8 12 2 2 4.4-4.4" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.55}}/></>}
    {name==='history'&&<><circle cx="12" cy="12" r="8.2" {...common}/><motion.path d="M12 7.6V12l3 2" {...common} animate={{rotate:hot?360:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.9,ease:'easeInOut'}}/></>}
    {name==='settings'&&<><motion.g animate={{rotate:hot?90:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.6,ease:[.22,1,.36,1]}}><path d="M9.6 4.3 10.2 3h3.6l.6 1.3 1.5.6 1.3-.5 2.5 2.5-.5 1.3.6 1.5 1.3.6v3.6l-1.3.6-.6 1.5.5 1.3-2.5 2.5-1.3-.5-1.5.6-.6 1.3h-3.6l-.6-1.3-1.5-.6-1.3.5-2.5-2.5.5-1.3-.6-1.5-1.3-.6V9.8l1.3-.6.6-1.5-.5-1.3 2.5-2.5 1.3.5z" {...common}/><circle cx="12" cy="12" r="2.4" {...common}/></motion.g></>}
    {name==='dashboard'&&<>{[[4,4,7,6],[13,4,7,9],[4,12,7,8],[13,15,7,5]].map((r,i)=><motion.rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx="1.2" {...common} animate={{y:hot?[0,i%2?-.7:.7,0]:0}} transition={{duration:.58,delay:i*.06}}/>)}</>}
    {name==='refresh'&&<motion.g animate={{rotate:hot?360:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.72,ease:[.22,1,.36,1]}}><path d="M20 7v5h-5" {...common}/><path d="M4 17v-5h5" {...common}/><path d="M18.1 9a7 7 0 0 0-11.8-2.2L4 9" {...common}/><path d="M5.9 15a7 7 0 0 0 11.8 2.2L20 15" {...common}/></motion.g>}
    {name==='download'&&<><path d="M5 19.5h14" {...common}/><motion.path d="M12 4v10m0 0-3.5-3.5M12 14l3.5-3.5" {...common} animate={{y:hot?[0,2,0]:0}} transition={{duration:.58}}/></>}
    {name==='upload'&&<><path d="M5 19.5h14" {...common}/><motion.path d="M12 16V6m0 0L8.5 9.5M12 6l3.5 3.5" {...common} animate={{y:hot?[0,-2,0]:0}} transition={{duration:.58}}/></>}
    {name==='eye'&&<><motion.path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5S3.5 12 3.5 12Z" {...common} animate={{scaleX:hot?[1,.92,1]:1}} style={{transformOrigin:'12px 12px'}} transition={{duration:.45}}/><motion.circle cx="12" cy="12" r="2.4" {...common} animate={{x:hot?[0,1.2,0]:0}} transition={{duration:.45}}/></>}
    {name==='warning'&&<><motion.path d="M12 4 21 20H3z" {...common} animate={{rotate:hot?[0,-3,3,0]:0}} style={{transformOrigin:'12px 12px'}} transition={{duration:.5}}/><path d="M12 9v4.5" {...common}/><circle cx="12" cy="16.8" r=".7" fill="currentColor" stroke="none"/></>}
    {name==='check'&&<motion.path d="m5 12.5 4.2 4.2L19 7" {...common} initial={{pathLength:1}} animate={{pathLength:hot?[0,1]:1}} transition={{duration:.55}}/>}
  </motion.svg>;
}
