export const ASSET_STATUS_LABELS={PLANNED:"Planificado",ACQUIRED:"Adquirido",IN_USE:"En uso",DISPOSED:"Dispuesto"};
const transitions={PLANNED:["ACQUIRED","DISPOSED"],ACQUIRED:["IN_USE","DISPOSED"],IN_USE:["DISPOSED"],DISPOSED:[]};
const cents=value=>{const match=String(value??"").trim().match(/^(-?)(\d+)(?:[.,](\d{1,2}))?$/);if(!match)throw new Error("Monto inválido.");return(BigInt(match[2])*100n+BigInt((match[3]??"").padEnd(2,"0")))*(match[1]==="-"?-1n:1n)};
/** @typedef {"PLANNED"|"ACQUIRED"|"IN_USE"|"DISPOSED"} AssetStatus */
/** @param {AssetStatus} from @param {AssetStatus} to */
export const canTransitionAsset=(from,to)=>Boolean(transitions[from]?.includes(to));
/** @param {AssetStatus} status @returns {AssetStatus[]} */
export const availableAssetTransitions=status=>transitions[status]??[];
export const validateAssetInput=input=>{const errors=[];if(!String(input.name??"").trim())errors.push("Indicá el nombre del activo.");if(!String(input.category??"").trim())errors.push("Indicá la categoría.");if(!input.acquisitionDate)errors.push("Indicá la fecha de adquisición.");try{if(cents(input.cost)<=0n)errors.push("El costo debe ser mayor a cero.")}catch{errors.push("Indicá un costo válido con hasta dos decimales.")}if(input.status&&!['PLANNED','ACQUIRED'].includes(input.status))errors.push("El estado inicial no es válido.");if(input.usefulLifeMonths&&(!Number.isInteger(Number(input.usefulLifeMonths))||Number(input.usefulLifeMonths)<1||Number(input.usefulLifeMonths)>600))errors.push("La vida útil debe estar entre 1 y 600 meses.");if((input.attachments??[]).some(url=>!(/^(https?:\/\/|\/)/).test(url)))errors.push("Los adjuntos deben ser URL http(s) o rutas internas.");return errors};
export const paymentStatusForAsset=(cost,paid)=>{const c=cents(cost),p=cents(paid);return p<=0n?"UNPAID":p>=c?"PAID":"PARTIALLY_PAID"};
export const categoryBars=rows=>{const max=rows.reduce((n,row)=>cents(row.total)>n?cents(row.total):n,0n);return rows.map(row=>({...row,percent:max===0n?0:Number(cents(row.total)*100n/max)}));};
export const createAssetIdempotencyKey=()=>crypto.randomUUID();
