import { buildReply, parseButton, languageFor, syntheticRule, SYNTHETIC_RULE_NAME, SYNTHETIC_TERM } from './handlers.js';

export const isSyntheticProtectionRule = (rule, botId) => Boolean(
  botId && rule?.name === SYNTHETIC_RULE_NAME && rule.creatorId === botId &&
  rule.enabled === true && Number(rule.eventType) === 1 && Number(rule.triggerType) === 1 &&
  rule.triggerMetadata?.keywordFilter?.includes(SYNTHETIC_TERM) &&
  rule.actions?.some(action => Number(action.type) === 1)
);

export async function installSyntheticRule(guild, { canManage, language = 'en', botId } = {}) {
  if (!canManage || !guild) return 'denied';
  try {
    const botMember = guild.members.me || await guild.members.fetchMe();
    if (!botMember.permissions.has(32n)) return 'missingPermission';
    const rules = await guild.autoModerationRules.fetch({ cache: false });
    const existing = rules.find(rule => rule.name === SYNTHETIC_RULE_NAME && rule.creatorId === botId);
    if (existing) {
      const canonical = existing.triggerMetadata?.keywordFilter;
      if (isSyntheticProtectionRule(existing, botId) && canonical.length === 1 && canonical[0] === SYNTHETIC_TERM) return 'exists';
      // Discord cannot change a rule's trigger type after creation. Leave a
      // differently typed rule intact rather than deleting it or guessing.
      if (Number(existing.triggerType) !== 1) return 'error';
      const defaults = syntheticRule(language);
      const actions = (existing.actions || []).map(action => ({ type: action.type, metadata: { ...action.metadata } }));
      if (!actions.some(action => Number(action.type) === 1)) actions.push(defaults.actions[0]);
      await existing.edit({
        enabled: true, eventType: 1,
        triggerMetadata: { keywordFilter: [SYNTHETIC_TERM], regexPatterns: [], allowList: [] },
        actions,
        reason: 'Explicit Next Step synthetic protection setup.',
      });
      return 'created';
    }
    await guild.autoModerationRules.create({ ...syntheticRule(language), reason: 'Administrator-requested synthetic Before prevention demonstration.' });
    return 'created';
  } catch (error) { return error?.code === 50013 ? 'missingPermission' : 'error'; }
}

export async function loadPublishedIntervention(config, language, fetcher = fetch) {
  try {
    const url = new URL(`/api/public/sites/${config.siteId}/config`, config.apiOrigin);
    url.searchParams.set('lang', languageFor(language)); url.searchParams.set('country', config.country);
    const response = await fetcher(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(1800) });
    if (!response.ok) return config;
    const published = await response.json();
    const arms = Array.isArray(published.arms) ? published.arms : [];
    // Native support is not a research exposure. No Discord API data is reported.
    const intervention = arms[0]?.intervention;
    return { ...config, intervention };
  } catch { return config; }
}

export async function handleInteraction(interaction, config, { fetcher = fetch, botId } = {}) {
  let action;
  let language = languageFor(interaction.locale);
  const isButton = interaction.isButton?.() === true;
  if (isButton) {
    const parsed = parseButton(interaction.customId);
    if (!parsed) return false;
    ({ action, language } = parsed);
    await interaction.deferUpdate();
  } else {
    if (!interaction.isChatInputCommand?.() || interaction.commandName !== 'before') return false;
    const command = interaction.options.getSubcommand();
    if (!['demo', 'support', 'setup'].includes(command)) return false;
    action = command === 'demo' ? 'reflection' : command;
    await interaction.deferReply({ flags: 64 });
  }
  let setupState;
  if (action === 'setup') {
    setupState = await installSyntheticRule(interaction.guild, { canManage: interaction.memberPermissions?.has(32n) === true, language, botId });
  }
  const published = await loadPublishedIntervention(config, language, fetcher);
  const payload = buildReply({ action, language, config: published, setupState });
  // Ephemeral state is established by deferReply; editReply must preserve it.
  const { flags: _flags, allowed_mentions: _mentions, ...editable } = payload;
  await interaction.editReply({ ...editable, allowedMentions: { parse: [] } });
  return true;
}
