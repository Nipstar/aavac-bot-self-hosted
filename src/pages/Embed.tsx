import { useState, useEffect } from "react";
import { Copy, Check, Code, Globe, Puzzle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const EmbedPage = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Fetch the demo widget config
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("widget_configs")
        .select("api_key")
        .limit(1)
        .single();
      
      if (data?.api_key) {
        setApiKey(data.api_key);
      }
    };
    fetchConfig();
  }, []);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const embedCode = `<!-- Retell AI Chat Widget -->
<script src="${supabaseUrl}/functions/v1/widget-embed?api_key=${apiKey}"></script>`;

  const wordpressCode = `<?php
/**
 * Plugin Name: Retell AI Chat Widget
 * Description: Adds an AI chat widget to your WordPress site
 * Version: 1.0
 */

function retell_widget_enqueue_script() {
    wp_enqueue_script(
        'retell-widget',
        '${supabaseUrl}/functions/v1/widget-embed?api_key=${apiKey}',
        array(),
        '1.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'retell_widget_enqueue_script');
?>`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadWordPressPlugin = async () => {
    if (!apiKey) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/wordpress-plugin?api_key=${apiKey}`
      );
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'retell-widget.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download plugin:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-gradient">Embed</span>{" "}
            <span className="text-foreground">Your Widget</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Add the AI chat widget to any website with a single line of code.
          </p>
        </div>

        {/* API Key Display */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Your Widget API Key
          </h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-secondary/50 rounded-lg px-4 py-3 text-sm font-mono text-muted-foreground overflow-x-auto">
              {apiKey || "Loading..."}
            </code>
            <button
              onClick={() => copyToClipboard(apiKey, "apikey")}
              className="p-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              {copied === "apikey" ? (
                <Check className="w-5 h-5 text-primary" />
              ) : (
                <Copy className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* HTML Embed */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            HTML Embed Code
          </h2>
          <p className="text-sm text-muted-foreground">
            Add this script tag to any HTML page, just before the closing{" "}
            <code className="bg-secondary px-1.5 py-0.5 rounded">&lt;/body&gt;</code> tag.
          </p>
          <div className="relative">
            <pre className="bg-secondary/50 rounded-lg p-4 text-sm font-mono text-foreground overflow-x-auto">
              {embedCode}
            </pre>
            <button
              onClick={() => copyToClipboard(embedCode, "html")}
              className="absolute top-3 right-3 p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
            >
              {copied === "html" ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* WordPress Plugin */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-primary" />
              WordPress Plugin
            </h2>
            <button
              onClick={downloadWordPressPlugin}
              disabled={!apiKey || isDownloading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? "Downloading..." : "Download Plugin"}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Download the ready-to-install WordPress plugin zip file, or manually create the plugin with the code below.
          </p>
          <div className="relative">
            <pre className="bg-secondary/50 rounded-lg p-4 text-sm font-mono text-foreground overflow-x-auto max-h-64">
              {wordpressCode}
            </pre>
            <button
              onClick={() => copyToClipboard(wordpressCode, "wordpress")}
              className="absolute top-3 right-3 p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
            >
              {copied === "wordpress" ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm">
            <strong className="text-primary">Installation:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Download the plugin zip file above</li>
              <li>Go to WordPress Admin → Plugins → Add New → Upload Plugin</li>
              <li>Choose the zip file and click "Install Now"</li>
              <li>Click "Activate Plugin" - the widget will appear on all pages</li>
            </ol>
          </div>
        </div>

        {/* Configuration */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Widget Configuration</h2>
          <p className="text-sm text-muted-foreground">
            You can customize your widget by updating the configuration in the database.
          </p>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Title</span>
              <span className="font-medium">AI Assistant</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Primary Color</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary" />
                <span className="font-medium">#14b8a6</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Position</span>
              <span className="font-medium">Bottom Right</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Voice Enabled</span>
              <span className="font-medium text-primary">Yes</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Chat Enabled</span>
              <span className="font-medium text-primary">Yes</span>
            </div>
          </div>
        </div>

        {/* Back link */}
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          ← Back to Demo
        </a>
      </div>
    </div>
  );
};

export default EmbedPage;