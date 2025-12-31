import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get('api_key');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'api_key parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch widget config to get the title
    const { data: config } = await supabase
      .from('widget_configs')
      .select('title, name')
      .eq('api_key', apiKey)
      .single();

    const pluginName = config?.name || config?.title || 'AI Chat Widget';
    const sanitizedName = pluginName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ');

    // Generate the PHP plugin code
    const phpCode = `<?php
/**
 * Plugin Name: ${sanitizedName}
 * Plugin URI: https://retellai.com
 * Description: Adds an AI-powered chat widget to your WordPress site with voice and text capabilities.
 * Version: 1.0.0
 * Author: Retell AI
 * Author URI: https://retellai.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: retell-widget
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('RETELL_WIDGET_VERSION', '1.0.0');
define('RETELL_WIDGET_API_KEY', '${apiKey}');
define('RETELL_WIDGET_ENDPOINT', '${supabaseUrl}/functions/v1/widget-embed');

/**
 * Enqueue the widget script on the frontend
 */
function retell_widget_enqueue_scripts() {
    $script_url = RETELL_WIDGET_ENDPOINT . '?api_key=' . RETELL_WIDGET_API_KEY;
    
    wp_enqueue_script(
        'retell-widget',
        $script_url,
        array(),
        RETELL_WIDGET_VERSION,
        true // Load in footer
    );
}
add_action('wp_enqueue_scripts', 'retell_widget_enqueue_scripts');

/**
 * Add settings link on plugin page
 */
function retell_widget_settings_link($links) {
    $settings_link = '<a href="https://retellai.com/dashboard" target="_blank">Configure Widget</a>';
    array_unshift($links, $settings_link);
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'retell_widget_settings_link');

/**
 * Display admin notice on activation
 */
function retell_widget_activation_notice() {
    if (get_transient('retell_widget_activation_notice')) {
        ?>
        <div class="notice notice-success is-dismissible">
            <p><strong>${sanitizedName}</strong> has been activated! The chat widget will now appear on your site.</p>
        </div>
        <?php
        delete_transient('retell_widget_activation_notice');
    }
}
add_action('admin_notices', 'retell_widget_activation_notice');

/**
 * Set transient on activation
 */
function retell_widget_activate() {
    set_transient('retell_widget_activation_notice', true, 5);
}
register_activation_hook(__FILE__, 'retell_widget_activate');
`;

    // Create a readme.txt for WordPress
    const readmeTxt = `=== ${sanitizedName} ===
Contributors: retellai
Tags: chat, ai, chatbot, voice, assistant
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add an AI-powered chat widget to your WordPress site.

== Description ==

${sanitizedName} adds a floating chat widget to your WordPress site that allows visitors to interact with an AI assistant through text or voice.

Features:
* Text chat with AI
* Voice conversations
* Customizable appearance
* Mobile responsive
* Easy installation

== Installation ==

1. Upload the plugin files to the \`/wp-content/plugins/retell-widget\` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. The widget will automatically appear on your site.

== Frequently Asked Questions ==

= How do I customize the widget? =

Visit your Retell AI dashboard to customize colors, greeting messages, and other settings.

= Does this work on mobile? =

Yes! The widget is fully responsive and works on all devices.

== Changelog ==

= 1.0.0 =
* Initial release
`;

    // Create ZIP file
    const zip = new JSZip();
    const folder = zip.folder('retell-widget');
    folder!.file('retell-widget.php', phpCode);
    folder!.file('readme.txt', readmeTxt);

    const zipContent = await zip.generateAsync({ type: 'arraybuffer' });

    console.log('Generated WordPress plugin zip for api_key:', apiKey.substring(0, 15) + '...');

    return new Response(zipContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="retell-widget.zip"',
      },
    });
  } catch (error) {
    console.error('Error generating WordPress plugin:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate plugin' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});