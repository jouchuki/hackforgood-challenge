<?php
/**
 * Plugin Name: Next Step Prevention
 * Description: Connect selected search submissions to a self-hosted prevention journey. Includes synthetic demo mode.
 * Version: 0.2.0
 * License: MIT
 */
if (!defined('ABSPATH')) { exit; }
function before_endpoint() { return rtrim(get_option('before_endpoint', 'http://localhost:3000'), '/'); }
function before_site() { return get_option('before_site', 'wordpress'); }
function before_check_token() {
    $token = isset($_GET['before_check']) && is_string($_GET['before_check']) ? wp_unslash($_GET['before_check']) : '';
    return preg_match('/^[a-f0-9]{32}$/D', $token) ? $token : '';
}
function before_check_input() {
    $token = before_check_token();
    return $token ? '<input type="hidden" name="before_check" value="'.esc_attr($token).'">' : '';
}
function before_sanitize_endpoint($value) {
    $url = esc_url_raw(trim($value)); $parts = wp_parse_url($url);
    $host = isset($parts['host']) ? strtolower($parts['host']) : '';
    if (!$host || !isset($parts['scheme']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) { add_settings_error('before_endpoint','invalid','Use a service origin without credentials or query parameters.'); return before_endpoint(); }
    if ($parts['scheme'] !== 'https' && !($parts['scheme'] === 'http' && in_array($host, array('localhost','127.0.0.1','[::1]'), true))) { add_settings_error('before_endpoint','scheme','Use HTTPS, or loopback HTTP for the local demo.'); return before_endpoint(); }
    return rtrim($url, '/');
}
add_action('admin_init', function () {
    register_setting('before_settings','before_endpoint', array('sanitize_callback'=>'before_sanitize_endpoint'));
    register_setting('before_settings','before_site', array('sanitize_callback'=>'sanitize_key'));
    register_setting('before_settings','before_demo', array('sanitize_callback'=>function($v){ return $v ? '1' : '0'; }));
});
add_action('admin_menu', function () { add_options_page('Next Step Prevention','Next Step Prevention','manage_options','before-prevention','before_settings_page'); });
function before_settings_page() {
    if (!current_user_can('manage_options')) { return; }
    echo '<div class="wrap"><h1>Next Step Prevention</h1><p>Connect this website to your published message and support resources.</p><details><summary aria-label="Integration details" style="cursor:pointer;list-style:none;display:inline-block"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg></summary><p>Connects core site search and the <code>[before_demo]</code> form. Other forms need an explicit adapter. Test mode matches only <code>test-trigger-*</code> examples; production detection is supplied externally.</p></details><form method="post" action="options.php">';
    settings_fields('before_settings');
    echo '<table class="form-table"><tr><th><label for="before_endpoint">Next Step server URL</label></th><td><input id="before_endpoint" name="before_endpoint" type="url" class="regular-text" value="'.esc_attr(before_endpoint()).'" required></td></tr><tr><th><label for="before_site">Installation ID</label></th><td><input id="before_site" name="before_site" value="'.esc_attr(before_site()).'" required></td></tr><tr><th>Test matching</th><td><input name="before_demo" type="hidden" value="0"><label><input name="before_demo" type="checkbox" value="1" '.checked(get_option('before_demo','1'),'1',false).'> Enable test examples</label></td></tr></table>';
    submit_button(); echo '</form><p><a class="button button-secondary" href="'.esc_url(before_endpoint().'/moderator/integrations?site='.rawurlencode(before_site())).'">Check deployment</a> <a class="button button-secondary" href="'.esc_url(home_url('/')).'">Open website</a></p></div>';
}
add_action('wp_enqueue_scripts', function () { wp_enqueue_script('before-prevention', before_endpoint().'/embed/before.js', array(), '0.2.0', true); });
add_filter('script_loader_tag', function ($tag,$handle) {
    if ($handle !== 'before-prevention') { return $tag; }
    return '<script src="'.esc_url(before_endpoint().'/embed/before.js').'" data-site="'.esc_attr(before_site()).'" data-endpoint="'.esc_url(before_endpoint()).'" defer></script>';
},10,2);
add_action('template_redirect', function () {
    if (get_option('before_demo','1') !== '1' || !is_search()) { return; }
    $value = strtolower(trim(get_search_query(false)));
    $allowed = array('test-trigger-red','test-trigger-red-alpha','test-trigger-red-chat','test-trigger-amber','test-trigger-amber-chat','test-trigger-green','test-trigger-green-info');
    if (!in_array($value,$allowed,true)) { return; }
    $lang = strpos(determine_locale(),'nl') === 0 ? 'nl' : 'en';
    $destination = before_endpoint().'/intervention/'.rawurlencode(before_site()).'?lang='.$lang;
    if (before_check_token()) { $destination .= '&preview=1&before_check='.rawurlencode(before_check_token()); }
    // Destination is the capability-protected administrator's configured origin, never a submitted URL.
    wp_redirect($destination,302,'Next Step Prevention'); exit;
});
add_shortcode('before_demo', function () {
    return '<section aria-label="Next Step installation test" style="max-width:640px"><h2>Try your published message</h2><p>Submit the test example to check the handover to Next Step.</p><form role="search" method="get" action="'.esc_url(home_url('/')).'" style="display:flex;gap:12px;flex-wrap:wrap">'.before_check_input().'<label for="before-demo-search">Search example <input id="before-demo-search" name="s" type="search" value="test-trigger-red" required style="font:inherit;padding:10px;border:1px solid #ccc;border-radius:4px"></label><button type="submit" style="font:inherit;padding:10px 18px;background:#244d3d;color:white;border:0;border-radius:4px">Open prevention demo</button></form></section>';
});

add_filter('get_search_form', function ($form) {
    return before_check_token() ? str_replace('</form>', before_check_input().'</form>', $form) : $form;
});
