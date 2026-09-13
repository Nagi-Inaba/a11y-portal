import { START_CONDITIONS, type ComparisonProtocol, type HumanResult, type AiAction } from "./types.ts";
import { scanUrl } from "../scans/targets.ts";
const object=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("入力形式を確認してください。");return value as Record<string,unknown>;};
const text=(value:unknown,max=2000)=>{if(typeof value!=="string"||!value.trim()||value.length>max)throw new Error(`1〜${max}文字で入力してください。`);return value.trim();};
const lines=(value:unknown,maxItems=20,maxChars=1000)=>{if(!Array.isArray(value)||value.length>maxItems)throw new Error(`項目は${maxItems}件以内で入力してください。`);return value.map(v=>text(v,maxChars));};
export function comparisonProtocol(value:unknown,targetUrl:string,origins:string[]):ComparisonProtocol {
  const p=object(value);const steps=lines(p.steps);if(!steps.length)throw new Error("共通手順を入力してください。");
  const urls=[...new Set([targetUrl,...lines(p.allowedNavigationUrls,20,2048).map(v=>{
    const u=scanUrl(v);if(!origins.includes(u.origin))throw new Error("移動先は検査対象の登録済み接続先から指定してください。");return u.href;
  })])];
  const resources=[...new Set(lines(p.allowedResourceUrls??[],50,2048).map(v=>{const u=scanUrl(v);if(!origins.includes(u.origin))throw new Error("資材URLは登録済み接続先から指定してください。");return u.href;}))];
  return {goal:text(p.goal,1000),steps,successCriteria:text(p.successCriteria),startConditions:START_CONDITIONS,
    allowedClickSelectors:lines(p.allowedClickSelectors,10,200),allowedNavigationUrls:urls,allowedResourceUrls:resources};
}
export function humanResult(value:unknown):HumanResult {
  const h=object(value);const e=object(h.environment);
  if(!["completed","completed-with-workaround","blocked"].includes(String(h.outcome))||h.conditionsConfirmed!==true)throw new Error("共通条件と実際の操作結果を確認してください。");
  const checkedAt=text(h.checkedAt,50);if(!/^\d{4}-\d{2}-\d{2}T/.test(checkedAt)||!Number.isFinite(Date.parse(checkedAt)))throw new Error("確認日時を入力してください。");
  const steps=lines(h.steps);if(!steps.length)throw new Error("実際の操作手順を入力してください。");
  return {outcome:h.outcome as HumanResult["outcome"],actual:text(h.actual,5000),checkedAt,environment:{os:text(e.os,200),browser:text(e.browser,200),assistiveTech:text(e.assistiveTech,200)},steps,limitations:text(h.limitations,3000),conditionsConfirmed:true};
}
export function aiAction(value:unknown):AiAction {
  const a=object(value);
  if(!["click","press","finish","abort"].includes(String(a.action)))throw new Error("action_not_allowed");
  const action=a.action as AiAction["action"];const reason=text(a.reason,1000);
  if(action==="click"&&(!Number.isInteger(a.elementId)||Number(a.elementId)<0||Number(a.elementId)>99))throw new Error("action_not_allowed");
  if(action==="press"&&!["Tab","Shift+Tab","Escape","ArrowDown","ArrowUp","Home","End"].includes(String(a.key)))throw new Error("action_not_allowed");
  if(action==="finish"&&!["completed","blocked"].includes(String(a.outcome)))throw new Error("action_not_allowed");
  return {action,elementId:action==="click"?Number(a.elementId):null,key:action==="press"?a.key as AiAction["key"]:null,outcome:action==="finish"?a.outcome as AiAction["outcome"]:null,reason};
}
