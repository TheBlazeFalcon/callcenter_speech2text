import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your account and platform configuration.</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <h3 className="font-semibold mb-4">Profile</h3>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input defaultValue="Admin User" className="bg-secondary/30 border-border/50" />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input defaultValue="admin@falconcall.ai" className="bg-secondary/30 border-border/50" />
            </div>
          </div>
        </div>

        <Separator className="bg-border/40" />

        <div>
          <h3 className="font-semibold mb-4">API Configuration</h3>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Gemini API Key</Label>
              <Input type="password" defaultValue="••••••••••••••••" className="bg-secondary/30 border-border/50" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="gradient-bg text-primary-foreground hover:opacity-90">Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
