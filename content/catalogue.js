import { integrationGuideFor } from './integration-guides.js';
const entries=[
 ['javascript','JavaScript','embed','Tested','https://developer.mozilla.org','One script for your website.','Eén script voor je website.'],
 ['tor','Tor Browser','privacy','Recipe','https://www.torproject.org','Public onion routes and a no-script help page.','Openbare onion-routes en een hulppagina zonder scripts.'],
 ['react','React','framework','Tested','https://react.dev','A client component with lifecycle cleanup.','Een clientcomponent met opruimfuncties.'],
 ['wordpress','WordPress','cms','Tested','https://wordpress.org','Install the plugin and connect your published message.','Installeer de plugin en verbind je gepubliceerde bericht.'],
 ['discord','Discord','chat','Tested','https://discord.com','',''],
 ['nextjs','Next.js','framework','Recipe','https://nextjs.org','A client provider in your application layout.','Een clientprovider in je applicatielayout.'],
 ['vue','Vue','framework','Recipe','https://vuejs.org','Connect through Vue mount and cleanup hooks.','Verbind via de mount- en opruimhooks van Vue.'],
 ['nuxt','Nuxt','framework','Recipe','https://nuxt.com','A client-only plugin for Nuxt.','Een clientplugin voor Nuxt.'],
 ['svelte','SvelteKit','framework','Recipe','https://svelte.dev','Initialize in onMount and dispose on teardown.','Start in onMount en ruim daarna op.'],
 ['astro','Astro','framework','Recipe','https://astro.build','Load the classic script from your Astro layout.','Laad het script vanuit je Astro-layout.'],
 ['angular','Angular','framework','Recipe','https://angular.dev','A browser-aware Angular service.','Een Angular-service voor de browser.'],
 ['express','Express / Node','framework','Recipe','https://expressjs.com','Add the embed to the views your server renders.','Voeg de embed toe aan de views van je server.'],
 ['django','Django','framework','Recipe','https://www.djangoproject.com','One embed in your inherited base template.','Eén embed in je gedeelde basistemplate.'],
 ['laravel','Laravel','framework','Recipe','https://laravel.com','A browser embed in your Blade layout.','Een browserembed in je Blade-layout.'],
 ['rails','Ruby on Rails','framework','Recipe','https://rubyonrails.org','A Rails layout helper and moderation callback.','Een Rails-layouthulp en moderatiecallback.'],
 ['drupal','Drupal','cms','Recipe','https://www.drupal.org','Attach a custom asset library.','Koppel een eigen assetbibliotheek.'],
 ['joomla','Joomla','cms','Recipe','https://www.joomla.org','Register the script with Web Asset Manager.','Registreer het script met Web Asset Manager.'],
 ['discourse','Discourse','forum','Recipe','https://www.discourse.org','Connect from an approved theme component.','Verbind vanuit een goedgekeurde themacomponent.'],
 ['nodebb','NodeBB','forum','Recipe','https://nodebb.org','Use a trusted widget or custom theme.','Gebruik een eigen widget of thema.'],
 ['flarum','Flarum','forum','Recipe','https://flarum.org','Add the browser script through a document extender.','Voeg het script toe via een document-extender.'],
 ['phpbb','phpBB','forum','Recipe','https://www.phpbb.com','Use your extension’s footer template event.','Gebruik het footer-template-event van je extensie.'],
 ['xenforo','XenForo','forum','Recipe','https://xenforo.com','Load the embed through your custom style.','Laad de embed via je eigen stijl.'],
 ['invision','Invision Community','forum','Recipe','https://invisioncommunity.com','A version-specific custom theme recipe.','Een versieafhankelijk recept voor je eigen thema.'],
];
const packages={javascript:'/downloads/before-browser.tgz',react:'/downloads/before-react.tgz',wordpress:'/downloads/before-wordpress.zip',discord:'/downloads/before-discord.zip'};
export const CATALOGUE=entries.map(([id,name,kind,status,website,en,nl])=>{
 const guide=integrationGuideFor(id), code=guide.steps.find(item=>item.code)?.code;
 return {id,name,kind,status,website,icon:`/brands/${id}.png`,summary:{en,nl},delivery:id==='discord'?'connection':packages[id]?'package':'guide',
  docsUrl:guide.references[0]?.url||website,
  steps:{en:guide.steps.map(item=>item.body.en),nl:guide.steps.map(item=>item.body.nl)},
  code:code?code({endpoint:'{{endpoint}}',siteId:'{{siteId}}'}):'',
  ...(packages[id]?{download:packages[id]}:{}),
 };
});
