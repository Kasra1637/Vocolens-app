import { EmotionType, EmotionScores, EmotionIntensityLabels, RankedEmotion, BlendedEmotionType, BLENDED_EMOTION_LABELS, OPPOSITE_EMOTION_PAIRS, buildIntensityLabels, getIntensityLabel } from "../types";
function getBackendUrl() { return (process.env.EXPO_PUBLIC_BACKEND_URL || "https://vocolens-api.kasrammarvel.workers.dev").trim(); }
export function resolveBackendUrl() { return getBackendUrl(); }
export function computeTopThreeEmotions(scores) { return Object.entries(scores).sort(([,a],[,b])=>b-a).slice(0,3).map(([emotion,score],i)=>({emotion,score,rank:i+1,intensityLabel:getIntensityLabel(emotion,score)})); }
export function computeBlendedEmotions(scores) { const T=40,r=[]; for(const[b,[e1,e2]]of Object.entries(BLENDED_EMOTION_LABELS)){if(scores[e1]>=T&&scores[e2]>=T)r.push(b);} return r; }
export function detectAmbivalence(scores) { return OPPOSITE_EMOTION_PAIRS.filter(([e1,e2])=>scores[e1]>=35&&scores[e2]>=35).map(([e1,e2])=>e1+"<->"+e2); }
function parseResponse(result) { const ve=["happiness","sadness","anger","disgust","fear","surprise","trust","anticipation"]; const es={happiness:0,sadness:0,anger:0,disgust:0,fear:0,surprise:0,trust:0,anticipation:0}; if(result.emotionScores)for(const e of ve){const s=Number(result.emotionScores[e]);es[e]=isNaN(s)?0:Math.max(0,Math.min(100,s));} const em=((result.emotions??[]).filter(e=>ve.includes(e)).slice(0,4)); if(em.length===0)em.push("happiness"); const pe=ve.includes(result.primaryEmotion)?result.primaryEmotion:em[0]??"happiness"; const vb=Object.keys(BLENDED_EMOTION_LABELS); const top=Array.isArray(result.topThreeEmotions)&&result.topThreeEmotions.length>0?result.topThreeEmotions.filter(r=>ve.includes(r.emotion)).slice(0,3).map((r,i)=>({emotion:r.emotion,score:Math.max(0,Math.min(100,Number(r.score)||0)),rank:i+1,intensityLabel:r.intensityLabel||getIntensityLabel(r.emotion,Number(r.score)||0)})):computeTopThreeEmotions(es); const bl=Array.isArray(result.blendedEmotions)&&result.blendedEmotions.length>0?result.blendedEmotions.filter(b=>vb.includes(b)):computeBlendedEmotions(es); const am=Array.isArray(result.ambivalenceFlags)&&result.ambivalenceFlags.length>0?result.ambivalenceFlags:detectAmbivalence(es); const rt=typeof result.title==="string"?result.title.trim():""; const tw=rt.split(/\s+/).filter(Boolean); const title=tw.length>=3&&tw.length<=6?tw.map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "):tw.length>6?tw.slice(0,6).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "):tw.length>0&&tw.length<3?tw.map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "):"Journal Entry"; return {title,emotions:em,primaryEmotion:pe,emotionIntensity:Math.max(0,Math.min(100,Number(result.emotionIntensity)||50)),emotionScores:es,emotionIntensityLabels:buildIntensityLabels(es),topics:((result.topics??["reflection"]).slice(0,5)),analysis:result.analysis||"Your journal entry has been recorded.",reflection:result.reflection||"Thank you for sharing. Your feelings are valid.",insights:((result.insights??[]).slice(0,3)),confidence:Math.max(0,Math.min(1,Number(result.confidence)||0.8)),audioAnalyzed:false,valence:Math.max(-100,Math.min(100,Number(result.valence)??0)),arousal:Math.max(0,Math.min(100,Number(result.arousal)??50)),suggestedBodySensations:(result.suggestedBodySensations??[]).slice(0,3),distressLevel:["low","moderate","high"].includes(result.distressLevel)?result.distressLevel:"low",aiTopThreeEmotions:top,aiBlendedEmotions:bl,aiAmbivalenceFlags:am}; }
export async function analyzeWithOpenRouter(transcript,_a,personalizationContext) { if(!transcript||transcript.trim().length===0)throw new Error("Transcript is empty"); const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);try{const r=await fetch(`${getBackendUrl()}/api/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript,personalizationContext}),signal:controller.signal});clearTimeout(timeout);if(!r.ok){const e=await r.text();throw new Error(`Analysis error (${r.status}): ${e}`);}const j=await r.json();if(!j.success||!j.data)throw new Error(j.error||"Invalid response");return parseResponse(j.data);}catch(err){clearTimeout(timeout);throw err;} }
export async function checkOpenRouterStatus() { try{const r=await fetch(`${getBackendUrl()}/health`);if(!r.ok)return false;const j=await r.json();return j.status==="ok";}catch{return false;} }
export async function generateRecommendation(transcript,primaryEmotion="happiness") {
  if(!transcript||transcript.trim().length===0)return{advice:"Taking time to check in with yourself is meaningful.",audioAdvice:"Showing up here is already an act of self-care."};
  try{
    const r=await fetch(`${getBackendUrl()}/api/recommend`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript,primaryEmotion})});
    if(r.ok){
      const j=await r.json();
      // Require at least 60 chars (roughly 10+ words) to accept the AI response
      if(j.success&&j.data?.advice&&typeof j.data.advice==="string"&&j.data.advice.trim().length>=60){
        return j.data;
      }
      // If backend responded but advice is too short, log it and fall through to local fallback
      if(j.data?.advice){console.warn("[Recommendation] advice too short, using fallback. Got:",j.data.advice);}
    } else {
      console.warn("[Recommendation] backend returned",r.status);
    }
  }catch(e){console.warn("[Recommendation] network error:",e);}
  // ── Local fallback: content-grounded paragraph ────────────────────────────
  const t=transcript.replace(/\s+/g," ").trim();
  const sentences=t.split(/[.!?]+/).map(x=>x.trim()).filter(x=>x.split(" ").length>=4);
  const firstSentence=sentences[0]??t.slice(0,100).trim();
  const quote=firstSentence.length>80?firstSentence.slice(0,80)+"...":firstSentence;
  const ev={
    happiness:"The genuine joy coming through in what you shared is real and worth sitting with.",
    sadness:"The heaviness you described takes courage to name, and naming it already matters.",
    anger:"The frustration you felt is entirely understandable — your reaction makes complete sense.",
    disgust:"The discomfort you described points directly to something you deeply value.",
    fear:"The worry you named out loud took real courage, and that act alone is significant.",
    surprise:"The unexpected turn you described caught you off guard, and your response to it shows real self-awareness.",
    trust:"The quiet confidence running through your words is something worth recognising and building on.",
    anticipation:"The anticipation you feel shows how much this next step genuinely matters to you.",
  };
  const opening=ev[primaryEmotion.toLowerCase()]??"What you shared today resonates deeply.";
  const advice=`${opening} When you said "${quote}", you gave voice to something important that deserves your attention. Take a few minutes today to sit with that feeling without rushing to resolve it — simply acknowledging it is a meaningful act of self-care. Ask yourself what one small, concrete thing would honour what you are experiencing right now, and give yourself permission to do just that one thing.`;
  const audioAdvice=`${opening} Sitting with what you shared, without rushing to fix or explain it, is exactly the kind of care you deserve right now.`;
  return{advice,audioAdvice};
}
