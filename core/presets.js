import { DEFAULT_INTERVENTION, ORDERS, newStudy } from './model.js';

export const MESSAGE_PRESETS = [
  { id:'supportive', name:{en:'Supportive',nl:'Ondersteunend'}, description:{en:'Reassurance, choice and access to support.',nl:'Geruststelling, keuze en toegang tot hulp.'} },
  { id:'harm', name:{en:'Harm-focused',nl:'Gericht op schade'}, description:{en:'Explain the harm and offer a next step.',nl:'Leg de schade uit en bied een volgende stap.'} },
  { id:'consequences', name:{en:'Legal information',nl:'Juridische informatie'}, description:{en:'Lead with reviewed consequences.',nl:'Begin met gecontroleerde juridische gevolgen.'} },
  { id:'combined', name:{en:'Combined',nl:'Gecombineerd'}, description:{en:'Reflection, harm and legal information.',nl:'Reflectie, schade en juridische informatie.'} },
];
export const STUDY_PRESETS = [
  {id:'experiences',name:{en:'Three experiences: legal, pause and life direction',nl:'Drie ervaringen: juridisch, pauze en levensrichting'}},
  {id:'legal-calm',name:{en:'Legal information vs immediate pause',nl:'Juridische informatie of direct pauzeren'}},
  {id:'calm-meaning',name:{en:'Immediate pause vs life direction',nl:'Direct pauzeren of levensrichting'}},
  {id:'reflection',name:{en:'Reflection first vs information first',nl:'Eerst reflectie of eerst informatie'}},
  {id:'tone',name:{en:'Supportive vs harm-focused',nl:'Ondersteunend of gericht op schade'}},
  {id:'legal',name:{en:'Legal information vs combined',nl:'Juridische informatie of gecombineerd'}},
];

export function interventionPreset(id) {
  if (!MESSAGE_PRESETS.some(preset=>preset.id===id)) throw new Error('Unknown message preset.');
  const value=structuredClone(DEFAULT_INTERVENTION);
  value.name=MESSAGE_PRESETS.find(preset=>preset.id===id).name.en;
  value.legal=['consequences','combined'].includes(id);
  if(id==='supportive'){
    const calm=experiencePreset('calm');value.en={...calm.en};value.nl={...calm.nl};
    Object.assign(value.en,{educationTitle:'You can choose a safer next step.',educationBody:'If you are worried about your thoughts or viewing behaviour, you can pause and explore professional support. You do not have to decide everything at once.'});
    Object.assign(value.nl,{educationTitle:'Je kunt een veiligere volgende stap kiezen.',educationBody:'Als je je zorgen maakt over je gedachten of kijkgedrag, kun je pauzeren en professionele hulp verkennen. Je hoeft niet alles tegelijk te beslissen.'});
  }
  if(id==='harm'){
    Object.assign(value.en,{title:'Your choice can protect children.',body:'Abuse material involves harm to children. Choosing not to continue is a step you can take now. Support is available.',educationTitle:'Abuse material causes real harm.',educationBody:'Behind abuse material are children who have been harmed. Choosing not to seek or share it can be a step towards safer behaviour. You can explore support for what to do next.'});
    Object.assign(value.nl,{title:'Jouw keuze kan kinderen beschermen.',body:'Misbruikmateriaal brengt kinderen schade toe. Je kunt nu kiezen om niet door te gaan. Er is ondersteuning beschikbaar.',educationTitle:'Misbruikmateriaal veroorzaakt echte schade.',educationBody:'Achter misbruikmateriaal staan kinderen die schade is toegebracht. Niet zoeken of delen kan een stap zijn naar veiliger gedrag. Je kunt hulp verkennen voor je volgende stap.'});
  }
  if(id==='consequences'){
    value.order=[...ORDERS[2]];
    Object.assign(value.en,{title:'Pause before you continue.',body:'Take a moment to understand the consequences and consider a different next step.',educationTitle:'Understand the legal consequences.',educationBody:'Take a moment to review the legal information where it is available below. If you are worried about your viewing behaviour, you can explore professional support and a different next step.'});
    Object.assign(value.nl,{title:'Sta even stil voordat je doorgaat.',body:'Neem een moment om de gevolgen te begrijpen en een andere volgende stap te overwegen.',educationTitle:'Begrijp de juridische gevolgen.',educationBody:'Neem een moment om de juridische informatie te lezen waar die hieronder beschikbaar is. Als je je zorgen maakt over je kijkgedrag, kun je professionele hulp en een andere volgende stap verkennen.'});
  }
  if(id==='combined'){
    Object.assign(value.en,{title:'Consider a different next step.',body:'Think about the people and future you want to protect. You can choose not to continue and explore a route towards support.',educationTitle:'Understand the harm and consequences.',educationBody:'Abuse material involves harm to children. Read the reviewed legal information where available, and consider whether professional support could help you take a safer next step.'});
    Object.assign(value.nl,{title:'Overweeg een andere volgende stap.',body:'Denk aan de mensen en toekomst die je wilt beschermen. Je kunt kiezen om niet door te gaan en een route naar hulp verkennen.',educationTitle:'Begrijp de schade en de gevolgen.',educationBody:'Misbruikmateriaal brengt kinderen schade toe. Lees de gecontroleerde juridische informatie waar die beschikbaar is en overweeg of professionele hulp je kan helpen een veiligere volgende stap te zetten.'});
  }
  return value;
}

export function createStudyPreset(id='reflection',name){
  const preset=STUDY_PRESETS.find(item=>item.id===id);if(!preset)throw new Error('Unknown study preset.');
  const study=newStudy(name||preset.name.en);
  if(id==='tone'||id==='legal'){
    const approaches=id==='tone'?['supportive','harm']:['consequences','combined'];
    study.arms=approaches.map((approach,i)=>({id:i?'B':'A',name:MESSAGE_PRESETS.find(p=>p.id===approach).name.en,weight:50,intervention:interventionPreset(approach)}));
    study.hypothesis=id==='tone'?'Compare help-link engagement after supportive and harm-focused messages.':'Compare help-link engagement after legal information and combined messaging.';
  }
  if(['experiences','legal-calm','calm-meaning'].includes(id)){
    const experiences=id==='experiences'?['plain','calm','meaning']:id==='legal-calm'?['plain','calm']:['calm','meaning'];
    study.arms=experiences.map((experience,i)=>({id:['A','B','C'][i],name:EXPERIENCE_PRESETS.find(p=>p.id===experience).name.en,weight:Math.floor(100/experiences.length)+(i<100%experiences.length?1:0),intervention:experiencePreset(experience)}));
    study.hypothesis='Compare aggregate engagement and help-link selection across different intervention experiences.';
  }
  return study;
}

export const EXPERIENCE_PRESETS = [
  {id:'plain',name:{en:'Plain legal page',nl:'Eenvoudige juridische pagina'},description:{en:'One page. Direct information, reviewed law and support.',nl:'Eén pagina. Directe informatie, gecontroleerde wetgeving en hulp.'},eyebrow:{en:'Plain information',nl:'Duidelijke informatie'}},
  {id:'calm',name:{en:'Pause and reset',nl:'Even pauzeren'},description:{en:'Practical prompts to step back from the screen, then choose what to do.',nl:'Korte, praktische aanwijzingen om afstand te nemen van het scherm.'},eyebrow:{en:'Pause here',nl:'Sta even stil'}},
  {id:'meaning',name:{en:'Life direction',nl:'Richting in je leven'},description:{en:'Direct questions about your time, your priorities and the life you want.',nl:'Directe vragen over je tijd, je prioriteiten en het leven dat je wilt.'},eyebrow:{en:'Your time. Your life.',nl:'Jouw tijd. Jouw leven.'}},
];

export function experiencePreset(id){
  if(!EXPERIENCE_PRESETS.some(preset=>preset.id===id))throw new Error('Unknown experience preset.');
  const value=structuredClone(DEFAULT_INTERVENTION);
  value.name=EXPERIENCE_PRESETS.find(preset=>preset.id===id).name.en;
  value.motion={enabled:false,transition:'none',holdSeconds:5};
  if(id==='plain'){
    value.layout='plain';value.order=[...ORDERS[2]];value.legal=true;
    Object.assign(value.en,{title:'Stop before you continue.',body:'You can choose a different next step.',educationTitle:'Stop before you continue.',educationBody:'Child sexual abuse material involves real children and real harm. Choosing not to access or share it is a step you can take now. Review the legal information available for your country and consider professional support.',helpTitle:'Support is available.',helpBody:'You can stop here and explore one of these independent support services.'});
    Object.assign(value.nl,{title:'Stop voordat je verdergaat.',body:'Je kunt een andere volgende stap kiezen.',educationTitle:'Stop voordat je verdergaat.',educationBody:'Materiaal van seksueel kindermisbruik gaat over echte kinderen en echte schade. Je kunt nu kiezen om het niet te bekijken of te delen. Lees de beschikbare juridische informatie voor je land en overweeg professionele hulp.',helpTitle:'Er is hulp beschikbaar.',helpBody:'Je kunt hier stoppen en een van deze onafhankelijke hulpdiensten bekijken.'});
  }
  if(id==='calm'){
    value.layout='reading';value.legal=false;
    Object.assign(value.en,{title:'Pause here.',body:'You do not need to continue right now. Look away from the screen for a moment. When you are ready, you can read the information or go straight to support.',button:'Read the information',educationTitle:'You can stop here.',educationBody:'Material involving sexual abuse harms children. If you are worried about your viewing behaviour, the support services below explain what help they offer. You can choose whether to contact them.',helpTitle:'Talk to someone, or start with self-help.',helpBody:'Choose the kind of support that feels manageable. Each independent service explains how it works.'});
    Object.assign(value.nl,{title:'Sta even stil.',body:'Je hoeft nu niet verder te gaan. Kijk een moment weg van het scherm. Als je eraan toe bent, kun je de informatie lezen of direct naar hulp gaan.',button:'Lees de informatie',educationTitle:'Je kunt hier stoppen.',educationBody:'Materiaal van seksueel misbruik brengt kinderen schade toe. Als je je zorgen maakt over je kijkgedrag, leggen de hulpdiensten hieronder uit wat ze aanbieden. Je kiest zelf of je contact opneemt.',helpTitle:'Praat met iemand of begin met zelfhulp.',helpBody:'Kies de ondersteuning die haalbaar voelt. Elke onafhankelijke dienst legt uit hoe die werkt.'});
  }
  if(id==='meaning'){
    value.layout='meaning';value.legal=false;
    Object.assign(value.en,{title:'Is this how you want to spend your time?',body:'Your time adds up to your life. Think about the relationships, interests and plans that matter to you. What would you rather make room for? Leaving this page can be one choice towards the life you want to build.',button:'Choose what matters to me',educationTitle:'What do you want your choices to reflect?',educationBody:'Child sexual abuse material depicts harm to children. If it is part of your viewing, consider how that fits with the values you want to live by. You can choose to stop and put your time elsewhere.',helpTitle:'Use this moment for something you care about.',helpBody:'Return to a plan, reach out to someone you care about, or explore professional support. If you want help changing your viewing behaviour, these independent services explain how to begin.'});
    Object.assign(value.nl,{title:'Is dit hoe je je tijd wilt besteden?',body:'Je tijd vormt je leven. Denk aan de relaties, interesses en plannen die belangrijk voor je zijn. Waar zou je liever ruimte voor maken? Deze pagina verlaten kan één keuze zijn voor het leven dat je wilt opbouwen.',button:'Kies wat voor mij telt',educationTitle:'Wat wil je dat je keuzes weerspiegelen?',educationBody:'Materiaal van seksueel kindermisbruik toont schade aan kinderen. Als je ernaar kijkt, overweeg dan hoe dat past bij de waarden waarnaar je wilt leven. Je kunt kiezen om te stoppen en je tijd anders te besteden.',helpTitle:'Gebruik dit moment voor iets dat je belangrijk vindt.',helpBody:'Pak een plan weer op, zoek contact met iemand om wie je geeft of verken professionele hulp. Als je hulp wilt om je kijkgedrag te veranderen, leggen deze onafhankelijke diensten uit hoe je kunt beginnen.'});
  }
  return value;
}

/** Complete bilingual starting points for moderation. Research variants may reuse them. */
export const MODERATION_TEMPLATES = [
  { id:'plain', name:{en:'The legal facts',nl:'De juridische feiten'}, description:{en:'A plain document. Reviewed law, direct information, then support.',nl:'Een eenvoudig document. Gecontroleerde wetgeving, duidelijke informatie en hulp.'}, category:{en:'Information',nl:'Informatie'}, layout:'plain', appearance:'default' },
  { id:'calm', name:{en:'Pause and reset',nl:'Even pauzeren'}, description:{en:'A quiet illustrated pause. Practical prompts, with no pressure to continue.',nl:'Een rustig, geïllustreerd moment. Praktische aanwijzingen zonder druk om verder te gaan.'}, category:{en:'Reflection',nl:'Reflectie'}, layout:'reading', appearance:'default' },
  { id:'meaning', name:{en:'Your time. Your life.',nl:'Jouw tijd. Jouw leven.'}, description:{en:'A bold editorial question about priorities, values and life direction.',nl:'Een directe, redactionele vraag over prioriteiten, waarden en levensrichting.'}, category:{en:'Reflection',nl:'Reflectie'}, layout:'meaning', appearance:'default' },
  { id:'harm', name:{en:'A child behind the material',nl:'Een kind achter het materiaal'}, description:{en:'A clear information sheet centred on harm to children and concrete actions.',nl:'Een helder informatieblad over schade aan kinderen en concrete keuzes.'}, category:{en:'Information',nl:'Informatie'}, layout:'reading', appearance:'facts' },
  { id:'quick-help', name:{en:'Straight to support',nl:'Direct naar hulp'}, description:{en:'One short page. A practical introduction and immediate support options.',nl:'Eén korte pagina. Een praktische inleiding en meteen de hulpopties.'}, category:{en:'Support',nl:'Hulp'}, layout:'plain', appearance:'quick-help' },
  { id:'guided', name:{en:'Change the next click',nl:'Verander je volgende klik'}, description:{en:'An optional three-scene sequence, with playback controls and a static reading view.',nl:'Een optionele reeks van drie scènes, met afspeelknoppen en een vaste leesweergave.'}, category:{en:'Guided',nl:'Begeleid'}, layout:'scene', appearance:'guided' },
];

const contentBlock = (id,type,en,nl) => ({ id,type,en,nl });
export function moderationTemplate(id) {
  const preset=MODERATION_TEMPLATES.find(item=>item.id===id);
  if(!preset)throw new Error('Choose a supported message template.');
  const value=experiencePreset(['plain','calm','meaning'].includes(id)?id:'calm');
  value.name=preset.name.en;
  value.appearance=preset.appearance;
  value.blocks={reflection:[],education:[],support:[]};
  if(id==='plain'){
    value.blocks.education=[contentBlock('plain-actions','list','Stop seeking or sharing abuse material\nRead the reviewed information for your country\nExplore the support options below','Stop met het zoeken naar of delen van misbruikmateriaal\nLees de gecontroleerde informatie voor je land\nBekijk de hulpopties hieronder')];
  }
  if(id==='calm'){
    value.blocks.reflection=[contentBlock('calm-space','callout','You can go straight to support. There is no need to finish this page first.','Je kunt direct naar hulp gaan. Je hoeft deze pagina niet eerst af te maken.')];
  }
  if(id==='meaning'){
    value.blocks.reflection=[contentBlock('meaning-question','quote','What would you rather make room for?','Waar zou je liever ruimte voor maken?')];
    value.blocks.education=[contentBlock('meaning-direction','text','Choose one thing you want to return to today: a relationship, an interest, or a plan you have put aside.','Kies één ding waarnaar je vandaag wilt terugkeren: een relatie, een interesse of een plan dat is blijven liggen.')];
  }
  if(id==='harm'){
    value.layout='reading';value.order=[...ORDERS[2]];value.legal=false;
    Object.assign(value.en,{title:'There is a child behind the material.',body:'Children are harmed in the production of abuse material. You can choose not to seek, view or share it.',button:'Understand the harm',educationTitle:'There is a child behind the material.',educationBody:'Child sexual abuse material depicts abuse of real children. Choosing not to seek, view or share it is an action you can take now.',helpTitle:'Change what happens next.',helpBody:'If you want help changing your viewing behaviour, these independent services explain the support they offer.'});
    Object.assign(value.nl,{title:'Er zit een kind achter het materiaal.',body:'Bij de productie van misbruikmateriaal worden kinderen geschaad. Je kunt kiezen om het niet te zoeken, bekijken of delen.',button:'Begrijp de schade',educationTitle:'Er zit een kind achter het materiaal.',educationBody:'Materiaal van seksueel kindermisbruik toont het misbruik van echte kinderen. Niet zoeken, bekijken of delen is een keuze die je nu kunt maken.',helpTitle:'Verander wat hierna gebeurt.',helpBody:'Als je hulp wilt om je kijkgedrag te veranderen, leggen deze onafhankelijke diensten uit welke ondersteuning ze bieden.'});
    value.blocks.education=[
      contentBlock('harm-principle','quote','A child’s abuse is not entertainment.','Het misbruik van een kind is geen entertainment.'),
      contentBlock('harm-actions','list','Stop the search\nDo not share the material\nChoose a support option','Stop de zoekopdracht\nDeel het materiaal niet\nKies een vorm van hulp'),
    ];
  }
  if(id==='quick-help'){
    value.layout='plain';value.order=[...ORDERS[2]];value.legal=false;
    Object.assign(value.en,{title:'Support is available now.',body:'Choose a service to understand your options.',button:'Find support',educationTitle:'Support is available now.',educationBody:'If you want to change your viewing behaviour, you can explore professional support or self-help. Start with an option that feels manageable.',helpTitle:'Find a place to start.',helpBody:'Each service explains how it works, which languages it supports and its confidentiality terms.'});
    Object.assign(value.nl,{title:'Er is nu hulp beschikbaar.',body:'Kies een dienst om je mogelijkheden te bekijken.',button:'Vind hulp',educationTitle:'Er is nu hulp beschikbaar.',educationBody:'Als je je kijkgedrag wilt veranderen, kun je professionele ondersteuning of zelfhulp verkennen. Begin met een optie die haalbaar voelt.',helpTitle:'Vind een beginpunt.',helpBody:'Elke dienst legt uit hoe die werkt, welke talen beschikbaar zijn en welke voorwaarden voor vertrouwelijkheid gelden.'});
    value.blocks.education=[contentBlock('help-choice','callout','You choose whether to contact a service.','Je kiest zelf of je contact opneemt met een dienst.')];
  }
  if(id==='guided'){
    value.layout='scene';value.order=[...ORDERS[0]];value.legal=false;value.motion={enabled:true,transition:'fade',holdSeconds:5};
    Object.assign(value.en,{title:'Change the next click.',body:'You can interrupt what happens next with one small action. Move at your own pace, or go straight to support.',button:'See another option',educationTitle:'Make room for a different action.',educationBody:'Material involving sexual abuse harms children. You can choose to stop seeking or viewing it, and explore help if you want support to make that change.',helpTitle:'Pick one next step.',helpBody:'Read about a service, explore self-help or contact professional support. You choose how to begin.'});
    Object.assign(value.nl,{title:'Verander je volgende klik.',body:'Je kunt met één kleine actie veranderen wat hierna gebeurt. Ga op je eigen tempo of ga direct naar hulp.',button:'Bekijk een andere optie',educationTitle:'Maak ruimte voor een andere actie.',educationBody:'Materiaal van seksueel misbruik brengt kinderen schade toe. Je kunt kiezen om het niet meer te zoeken of bekijken en hulp verkennen als je ondersteuning wilt bij die verandering.',helpTitle:'Kies één volgende stap.',helpBody:'Lees over een dienst, verken zelfhulp of neem contact op voor professionele ondersteuning. Je kiest zelf hoe je begint.'});
    value.blocks.reflection=[contentBlock('guided-actions','list','Look away from the screen\nClose this page\nExplore support','Kijk weg van het scherm\nSluit deze pagina\nVerken hulp')];
    value.blocks.support=[contentBlock('guided-pace','callout','Playback is optional. Help and leaving this page never depend on finishing a scene.','Afspelen is optioneel. Hulp zoeken en deze pagina verlaten zijn nooit afhankelijk van het afmaken van een scène.')];
  }
  return value;
}
