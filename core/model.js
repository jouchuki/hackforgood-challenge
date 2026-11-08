export const LEGACY_COUNTERS = ['shown','reflection_viewed','education_viewed','support_viewed','help_selected','dismissed','exited','duration_lt10','duration_10to30','duration_30to60','duration_gte60'];
export const ENGAGEMENT_COUNTERS = ['engagement_measured','scrolled','education_end_viewed'];
export const PATH_COUNTERS = ['path_measured','path_reflection_education','path_reflection_support','path_education_reflection','path_education_support','path_support_reflection','path_support_education'];
export const COUNTERS = [...LEGACY_COUNTERS, ...ENGAGEMENT_COUNTERS, ...PATH_COUNTERS];
export const ORDERS = [['reflection','education','support'],['education','reflection','support'],['education','support']];
export const DEFAULT_INTERVENTION = {
  name: 'A moment to choose', legal: true, country: 'NL', order: ORDERS[0], layout: 'reading',
  motion: { enabled: false, transition: 'fade', holdSeconds: 5 },
  en: { title:'There is another way forward.', body:'A single moment does not have to decide what comes next. Think about the people, relationships, and future you want to protect. You can choose a different next step.', button:'Continue to information', educationTitle:'Your choices can protect children.', educationBody:'Sexual abuse material involves harm to children. Choosing not to seek or share it is a step you can take now. Support is available if you are worried about your thoughts or behaviour.', helpTitle:'You do not have to figure this out alone.', helpBody:'Choose a next step that feels possible. These independent services explain their support, availability, and confidentiality.' },
  nl: { title:'Er is een andere weg vooruit.', body:'Eén moment hoeft niet te bepalen wat er hierna gebeurt. Denk aan de mensen, relaties en toekomst die je wilt beschermen. Je kunt kiezen voor een andere volgende stap.', button:'Verder naar informatie', educationTitle:'Jouw keuzes kunnen kinderen beschermen.', educationBody:'Materiaal van seksueel kindermisbruik brengt kinderen schade toe. Je kunt nu kiezen om er niet naar te zoeken en het niet te delen. Er is hulp als je je zorgen maakt over je gedachten of gedrag.', helpTitle:'Je hoeft dit niet alleen uit te zoeken.', helpBody:'Kies een volgende stap die haalbaar voelt. Deze onafhankelijke diensten leggen hun hulp, beschikbaarheid en vertrouwelijkheid uit.' }
};
export function newStudy(name='A moment before the message') {
  const a=structuredClone(DEFAULT_INTERVENTION); a.order=ORDERS[2]; a.name='Immediate warning';
  const b=structuredClone(DEFAULT_INTERVENTION); b.name='Reflection first';
  return {name,hypothesis:'A supportive reflection before the warning may increase engagement with help resources.',primary:'help_rate',countries:['NL'],languages:['en','nl'],arms:[{id:'A',name:a.name,weight:50,intervention:a},{id:'B',name:b.name,weight:50,intervention:b}]};
}
export const escapeHtml = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function preferredLanguage(languages=[]) {for(const language of languages){const code=String(language).toLowerCase().split('-')[0];if(['nl','en'].includes(code))return code;}return 'en';}
export function chooseArm(arms,random=Math.random) {let n=random()*100;for(const arm of arms){n-=arm.weight;if(n<0)return arm;}return arms.at(-1);}
