import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Mic, Zap, Check, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gradient">
            AAVAC Bot
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            AI-Powered Voice & Chat Widgets
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Add <span className="text-gradient">AI conversations</span>
            <br />to your website in minutes
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Create customizable voice and chat widgets powered by{" "}
            <a 
              href="https://www.retellai.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Retell AI
              <ExternalLink className="w-4 h-4" />
            </a>
            . Embed them anywhere with a single line of code.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="h-14 px-8 text-base gap-2">
                Start for Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base">
                See Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-card/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything you need
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Powered by <a href="https://www.retellai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Retell AI</a> for natural voice and chat conversations
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Chat Widget</h3>
              <p className="text-muted-foreground">
                Text-based AI conversations with instant responses and smart context.
              </p>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Voice Widget</h3>
              <p className="text-muted-foreground">
                Natural voice conversations with your AI assistant in real-time.
              </p>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Embed</h3>
              <p className="text-muted-foreground">
                One line of code to add to any website. WordPress plugin included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple pricing
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Start free, upgrade when you need more. 14-day free trial on all paid plans.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free Tier */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Up to 5 widgets</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Voice & chat enabled</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Embed anywhere</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Attribution link required</span>
                </li>
              </ul>
              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Starter Tier */}
            <div className="glass rounded-2xl p-6 border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                Popular
              </div>
              <h3 className="text-xl font-semibold mb-2">Starter</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold">$19</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-xs text-primary mb-6">14-day free trial</p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Up to 50 widgets</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Voice & chat enabled</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Remove attribution link</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Custom branding</span>
                </li>
              </ul>
              <Link to="/auth" className="block">
                <Button className="w-full">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold">$39</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-xs text-primary mb-6">14-day free trial</p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Up to 200 widgets</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Voice & chat enabled</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Remove attribution link</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Custom branding</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Unlimited widgets</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>All Pro features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>SLA guarantee</span>
                </li>
              </ul>
              <a href="mailto:contact@antekautomation.com" className="block">
                <Button variant="outline" className="w-full">
                  Contact Sales
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Retell AI Section */}
      <section className="py-16 px-6 bg-card/50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4">Powered by Retell AI</h2>
          <p className="text-muted-foreground mb-6">
            AAVAC Bot uses <a href="https://www.retellai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Retell AI</a> as our AI voice and chat provider. 
            Retell AI delivers natural, human-like conversations with ultra-low latency, 
            making your widgets feel responsive and intelligent.
          </p>
          <a 
            href="https://www.retellai.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            Learn more about Retell AI
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p className="mb-2">© {new Date().getFullYear()} AAVAC Bot. Powered by <a href="https://www.retellai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Retell AI</a>.</p>
          <p>
            A product by{" "}
            <a 
              href="https://www.antekautomation.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Antek Automation
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
