import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const QA_PASSWORD = 'QA1234!';

const USERS: { fullName: string; email: string; role: UserRole }[] = [
  { fullName: 'Alice Cohen', email: 'alice.cohen@company.com', role: 'EMPLOYEE' },
  { fullName: 'Bob Levi', email: 'bob.levi@company.com', role: 'EMPLOYEE' },
  { fullName: 'Carol Mizrahi', email: 'carol.mizrahi@company.com', role: 'EMPLOYEE' },
  { fullName: 'David Ben-David', email: 'david.bendavid@company.com', role: 'EMPLOYEE' },
  { fullName: 'Eva Shapiro', email: 'eva.shapiro@company.com', role: 'EMPLOYEE' },
  { fullName: 'Frank Katz', email: 'frank.katz@company.com', role: 'EMPLOYEE' },
  { fullName: 'Grace Peretz', email: 'grace.peretz@company.com', role: 'EMPLOYEE' },
  { fullName: 'Henry Friedman', email: 'henry.friedman@company.com', role: 'EMPLOYEE' },
  { fullName: 'Iris Goldberg', email: 'iris.goldberg@company.com', role: 'EMPLOYEE' },
  { fullName: 'Jake Stern', email: 'jake.stern@company.com', role: 'EMPLOYEE' },
  { fullName: 'Karen Weiss', email: 'karen.weiss@company.com', role: 'TEAM_LEAD' },
  { fullName: 'Leo Amar', email: 'leo.amar@company.com', role: 'TEAM_LEAD' },
  { fullName: 'Maya Dahan', email: 'maya.dahan@company.com', role: 'TEAM_LEAD' },
  { fullName: 'Noa Bar', email: 'noa.bar@company.com', role: 'TEAM_LEAD' },
  { fullName: 'Oren Tal', email: 'oren.tal@company.com', role: 'TEAM_LEAD' },
];

const CLIENTS = [
  { name: 'Acme Corp', description: 'Global manufacturing conglomerate' },
  { name: 'BrightPath Technologies', description: 'SaaS platform provider' },
  { name: 'ClearWave Media', description: 'Digital media and advertising' },
  { name: 'Delta Logistics', description: 'Supply chain and freight solutions' },
  { name: 'EcoPower Energy', description: 'Renewable energy consulting' },
  { name: 'FinSmart Solutions', description: 'Fintech and payment processing' },
  { name: 'GlobalReach Marketing', description: 'International marketing agency' },
  { name: 'HealthFirst Clinics', description: 'Healthcare network operator' },
  { name: 'InfoSecure Systems', description: 'Cybersecurity services' },
  { name: 'JetStream Aviation', description: 'Aircraft maintenance and leasing' },
  { name: 'KindCart Retail', description: 'E-commerce platform' },
  { name: 'LegalEdge Consulting', description: 'Corporate legal advisory' },
  { name: 'MegaBuild Construction', description: 'Infrastructure and real estate' },
  { name: 'NexGen Pharma', description: 'Pharmaceutical research and distribution' },
  { name: 'OpenView Analytics', description: 'Business intelligence and data' },
  { name: 'PrimeStore Supermarkets', description: 'Grocery retail chain' },
  { name: 'QuantumLeap AI', description: 'Artificial intelligence products' },
  { name: 'RapidFix Automotive', description: 'Automotive repair franchise' },
  { name: 'SkyNet Telecom', description: 'Mobile and broadband carrier' },
  { name: 'TrueNorth Insurance', description: 'Commercial insurance brokerage' },
];

// 30 projects spread across 20 clients (indices 0-19)
const PROJECT_TEMPLATES: { name: string; description: string; clientIdx: number }[] = [
  { name: 'ERP Migration', description: 'Migrate legacy ERP to cloud platform', clientIdx: 0 },
  { name: 'Factory Automation', description: 'IoT sensors and automation rollout', clientIdx: 0 },
  { name: 'SaaS Onboarding Redesign', description: 'Revamp user onboarding flow', clientIdx: 1 },
  { name: 'API Gateway Implementation', description: 'Unified API layer for microservices', clientIdx: 1 },
  { name: 'Ad Platform Integration', description: 'Connect DSP with internal analytics', clientIdx: 2 },
  { name: 'Content Delivery Optimization', description: 'CDN tuning and cache strategy', clientIdx: 2 },
  { name: 'Fleet Tracking System', description: 'Real-time GPS tracking for vehicles', clientIdx: 3 },
  { name: 'Warehouse Management Upgrade', description: 'WMS v3 deployment', clientIdx: 3 },
  { name: 'Solar Dashboard', description: 'Monitoring portal for solar installations', clientIdx: 4 },
  { name: 'Carbon Reporting Tool', description: 'ESG compliance reporting module', clientIdx: 4 },
  { name: 'Payment Gateway v2', description: 'PCI-DSS compliant checkout revamp', clientIdx: 5 },
  { name: 'Fraud Detection ML', description: 'ML pipeline for transaction anomaly detection', clientIdx: 5 },
  { name: 'Campaign Analytics', description: 'Multi-channel campaign ROI dashboard', clientIdx: 6 },
  { name: 'CRM Integration', description: 'Sync Salesforce with internal tools', clientIdx: 6 },
  { name: 'Patient Portal', description: 'Secure patient records and scheduling', clientIdx: 7 },
  { name: 'Telemedicine Platform', description: 'Video consult and prescriptions module', clientIdx: 7 },
  { name: 'SIEM Implementation', description: 'Security event log aggregation', clientIdx: 8 },
  { name: 'Penetration Testing Suite', description: 'Automated vuln scan tooling', clientIdx: 8 },
  { name: 'MRO System', description: 'Maintenance, Repair & Overhaul tracking', clientIdx: 9 },
  { name: 'Inventory Optimization', description: 'Demand forecasting and reorder logic', clientIdx: 10 },
  { name: 'Legal Document Automation', description: 'Template-based contract generation', clientIdx: 11 },
  { name: 'BIM Integration', description: 'Building Information Modeling data hub', clientIdx: 12 },
  { name: 'Project Cost Control', description: 'Budget tracking for construction sites', clientIdx: 12 },
  { name: 'Clinical Trial Tracker', description: 'Phase tracking and compliance', clientIdx: 13 },
  { name: 'BI Dashboards', description: 'Executive KPI dashboards in Tableau', clientIdx: 14 },
  { name: 'Loyalty Program', description: 'Points and rewards platform', clientIdx: 15 },
  { name: 'NLP Chatbot', description: 'Customer support chatbot powered by LLM', clientIdx: 16 },
  { name: 'Diagnostic App', description: 'Vehicle diagnostics mobile app', clientIdx: 17 },
  { name: '5G Network Rollout', description: 'Tower deployment project management', clientIdx: 18 },
  { name: 'Claims Processing Automation', description: 'RPA for insurance claims workflow', clientIdx: 19 },
];

// 40 tasks spread across 30 projects (indices 0-29)
const TASK_TEMPLATES: { name: string; description: string; projectIdx: number }[] = [
  { name: 'Requirements Gathering', description: 'Collect and document business requirements', projectIdx: 0 },
  { name: 'Data Migration Script', description: 'Write ETL scripts for legacy data', projectIdx: 0 },
  { name: 'UI/UX Wireframes', description: 'Design wireframes for new onboarding', projectIdx: 2 },
  { name: 'Backend API Development', description: 'Implement REST endpoints', projectIdx: 2 },
  { name: 'Sensor Integration', description: 'Connect sensors to MQTT broker', projectIdx: 1 },
  { name: 'Dashboard Development', description: 'Build real-time monitoring dashboard', projectIdx: 1 },
  { name: 'DSP Connector', description: 'Build connector to external DSP API', projectIdx: 4 },
  { name: 'Cache Strategy Implementation', description: 'Configure Varnish and CDN rules', projectIdx: 5 },
  { name: 'GPS Device Provisioning', description: 'Onboard 200 GPS units to platform', projectIdx: 6 },
  { name: 'Route Optimization Algorithm', description: 'Implement Dijkstra-based routing', projectIdx: 6 },
  { name: 'WMS Database Schema', description: 'Design and migrate WMS database', projectIdx: 7 },
  { name: 'Solar Panel Data Ingestion', description: 'Connect inverter APIs to dashboard', projectIdx: 8 },
  { name: 'ESG Report Template', description: 'Build ISO 14064 compliant report template', projectIdx: 9 },
  { name: 'Checkout Flow Redesign', description: 'Redesign payment steps UX', projectIdx: 10 },
  { name: 'ML Model Training', description: 'Train XGBoost model on transaction data', projectIdx: 11 },
  { name: 'Model Deployment Pipeline', description: 'CI/CD for ML model updates', projectIdx: 11 },
  { name: 'Campaign Attribution Model', description: 'Multi-touch attribution logic', projectIdx: 12 },
  { name: 'Salesforce Sync Job', description: 'Scheduled sync between SF and internal DB', projectIdx: 13 },
  { name: 'Patient Authentication', description: 'SSO and MFA for patient portal', projectIdx: 14 },
  { name: 'Video Call Integration', description: 'Integrate WebRTC for telemedicine', projectIdx: 15 },
  { name: 'Log Ingestion Pipeline', description: 'Fluentd to Elasticsearch pipeline', projectIdx: 16 },
  { name: 'Vuln Scanner Automation', description: 'Schedule and parse OWASP ZAP reports', projectIdx: 17 },
  { name: 'Work Order Module', description: 'Create and assign maintenance work orders', projectIdx: 18 },
  { name: 'Inventory Forecast Model', description: 'Time-series demand forecasting', projectIdx: 19 },
  { name: 'Contract Template Builder', description: 'Drag-and-drop clause editor', projectIdx: 20 },
  { name: 'BIM Data Import', description: 'Parse IFC files into internal schema', projectIdx: 21 },
  { name: 'Budget Variance Alerts', description: 'Trigger alerts when cost exceeds budget', projectIdx: 22 },
  { name: 'Trial Phase Milestone Tracking', description: 'Track Phase I/II/III milestones', projectIdx: 23 },
  { name: 'KPI Widget Library', description: 'Reusable Tableau components for KPIs', projectIdx: 24 },
  { name: 'Points Calculation Engine', description: 'Business logic for earning and redeeming points', projectIdx: 25 },
  { name: 'Intent Classification Model', description: 'Fine-tune NLP model for support intents', projectIdx: 26 },
  { name: 'Chatbot Escalation Flow', description: 'Route unsolved queries to human agents', projectIdx: 26 },
  { name: 'OBD-II Data Parser', description: 'Parse OBD-II diagnostic codes', projectIdx: 27 },
  { name: 'Tower Site Survey', description: 'Field survey for 5G tower placement', projectIdx: 28 },
  { name: 'Permitting Workflow', description: 'Track municipal permit applications', projectIdx: 28 },
  { name: 'RPA Bot Development', description: 'Build UiPath bot for claims intake', projectIdx: 29 },
  { name: 'API Gateway Config', description: 'Configure rate limiting and auth on gateway', projectIdx: 3 },
  { name: 'Carbon Calculation Logic', description: 'Implement Scope 1/2/3 emission calculations', projectIdx: 9 },
  { name: 'Prescription Module', description: 'E-prescription and pharmacy integration', projectIdx: 15 },
  { name: 'QA & User Acceptance Testing', description: 'End-to-end UAT for claims automation', projectIdx: 29 },
];

async function main(): Promise<void> {
  console.log('Seeding QA data...');

  const passwordHash = await bcrypt.hash(QA_PASSWORD, 12);

  // 1. Users
  const userIds: string[] = [];
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { fullName: u.fullName, email: u.email, passwordHash, role: u.role, status: 'ACTIVE' },
    });
    userIds.push(user.id);
  }
  console.log(`✓ ${userIds.length} users`);

  // 2. Clients
  const clientIds: string[] = [];
  for (const c of CLIENTS) {
    const client = await prisma.client.upsert({
      where: { id: (await prisma.client.findFirst({ where: { name: c.name } }))?.id ?? '' },
      update: {},
      create: { name: c.name, description: c.description, status: 'ACTIVE' },
    });
    clientIds.push(client.id);
  }
  console.log(`✓ ${clientIds.length} clients`);

  // 3. Projects
  const projectIds: string[] = [];
  for (let i = 0; i < PROJECT_TEMPLATES.length; i++) {
    const p = PROJECT_TEMPLATES[i];
    const clientId = clientIds[p.clientIdx];
    const managerId = userIds[(p.clientIdx + i) % userIds.length];
    const existing = await prisma.project.findFirst({ where: { name: p.name, clientId } });
    const project = existing
      ? existing
      : await prisma.project.create({
          data: {
            clientId,
            name: p.name,
            description: p.description,
            primaryManagerId: managerId,
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-12-31'),
            status: 'ACTIVE',
          },
        });
    projectIds.push(project.id);
  }
  console.log(`✓ ${projectIds.length} projects`);

  // 4. Tasks
  let taskCount = 0;
  for (const t of TASK_TEMPLATES) {
    const projectId = projectIds[t.projectIdx];
    const existing = await prisma.task.findFirst({ where: { name: t.name, projectId } });
    if (!existing) {
      await prisma.task.create({
        data: {
          projectId,
          name: t.name,
          description: t.description,
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-06-30'),
          status: 'OPEN',
        },
      });
      taskCount++;
    } else {
      taskCount++;
    }
  }
  console.log(`✓ ${taskCount} tasks`);

  console.log(`\nAll QA users password: ${QA_PASSWORD}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
