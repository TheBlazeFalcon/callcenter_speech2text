export interface Call {
  id: string;
  title: string;
  agent: string;
  workspaceId: string;
  duration: string;
  date: string;
  status: "completed" | "processing" | "pending";
  score: number;
  cost: string;
  size: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  score: number;
  callCount: number;
  avgDuration: string;
  trend: "up" | "down" | "stable";
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  agentCount: number;
  callCount: number;
  avgScore: number;
  createdAt: string;
  status: "active" | "archived";
}

export const workspaces: Workspace[] = [
  { id: "w1", name: "Call Center Q1", description: "Primary customer support channel for Q1 2026", agentCount: 12, callCount: 1240, avgScore: 88, createdAt: "2026-01-01", status: "active" },
  { id: "w2", name: "Sales March", description: "Outbound sales campaign for enterprise leads", agentCount: 8, callCount: 450, avgScore: 92, createdAt: "2026-03-01", status: "active" },
  { id: "w3", name: "Technical Support", description: "Tier 2 technical escalation workspace", agentCount: 5, callCount: 210, avgScore: 85, createdAt: "2025-12-15", status: "active" },
];

export const calls: Call[] = [
  { id: "c1", title: "Enterprise Onboarding #1042", agent: "Sarah Chen", workspaceId: "w1", duration: "12:34", date: "2026-03-18", status: "completed", score: 92, cost: "$0.12", size: "4.2MB" },
  { id: "c2", title: "Server Migration Support", agent: "Marcus Johnson", workspaceId: "w3", duration: "08:21", date: "2026-03-18", status: "completed", score: 87, cost: "$0.08", size: "2.8MB" },
  { id: "c3", title: "Acme Corp Discovery", agent: "Emily Rodriguez", workspaceId: "w2", duration: "22:15", date: "2026-03-17", status: "completed", score: 95, cost: "$0.24", size: "8.5MB" },
  { id: "c4", title: "Billing Dispute Resolution", agent: "David Kim", workspaceId: "w1", duration: "06:48", date: "2026-03-17", status: "processing", score: 0, cost: "$0.00", size: "2.1MB" },
];

export const agents: Agent[] = [
  { id: "a1", name: "Sarah Chen", avatar: "SC", role: "Senior Sales Agent", score: 94, callCount: 234, avgDuration: "15:30", trend: "up" },
  { id: "a2", name: "Marcus Johnson", avatar: "MJ", role: "Tech Support Lead", score: 87, callCount: 189, avgDuration: "11:20", trend: "stable" },
  { id: "a3", name: "Emily Rodriguez", avatar: "ER", role: "Sales Representative", score: 91, callCount: 156, avgDuration: "18:45", trend: "up" },
];

export const callDetail = {
  ...calls[0],
  summary: "The agent successfully guided the customer through the enterprise onboarding process. Key technical requirements like SSO and Okta integration were addressed confidently. The customer expressed high satisfaction with the initial setup.",
  quantitative: {
    clarity: 95,
    resolution: 100,
    compliance: 90,
    empathy: 88
  },
  qualitative: {
    sentiment: "Highly Positive",
    tone: "Professional & Helpful",
    keywords: ["SSO", "Okta", "Enterprise", "Onboarding", "Scaling"]
  },
  transcript: [
    { speaker: "Agent", time: "0:00", text: "Good morning! Thank you for choosing our enterprise plan. My name is Sarah." },
    { speaker: "Customer", time: "0:08", text: "Hi Sarah, thanks for having me. We're excited to get started." },
    { speaker: "Agent", time: "0:15", text: "I've reviewed your account, and I see you'll need access for 50 team members." }
  ],
  agentAssessment: {
    strengths: ["Clear communication", "Technical expertise", "Proactive problem solving"],
    improvements: ["Could mention additional training resources", "Slightly faster pacing recommended"]
  }
};

export const dashboardStats = {
  totalCalls: 1274,
  activeAgents: 6,
  avgScore: 89.8,
  totalWorkspaces: 3,
  callsTrend: "+12.5%",
  scoreTrend: "+3.2%",
};
