import React,{Suspense,use} from 'react';

// A promise that never settles: suspending on it parks a subtree.
const NEVER=new Promise<never>(()=>{});
function Gate({frozen,children}:{frozen:boolean,children:React.ReactNode}){if(frozen)use(NEVER);return <>{children}</>;}

/** Keeps a screen mounted (state, scroll position, decoded images) while it's hidden, but skips its
 *  re-renders until it's shown again. Same technique as react-freeze, without the dependency:
 *  while frozen the subtree suspends, React keeps its fibers and hides its host views. */
export function Freeze({frozen,children}:{frozen:boolean,children:React.ReactNode}){
 return <Suspense fallback={null}><Gate frozen={frozen}>{children}</Gate></Suspense>;
}
