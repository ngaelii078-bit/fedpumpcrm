export type Stage = "enquiry" | "inspect" | "quoted" | "po";
export type DealStatus = Stage | "won" | "lost";
export type Segment = "Mining" | "Manufacturing" | "Agriculture" | "Water";
export type PumpType = "Multistage" | "Slurry" | "Submersible";
export type Service =
  | "Pump refurbishment"
  | "Inspection & assessment"
  | "Component reconditioning"
  | "Precision machining";
export type Urgency = "planned" | "breakdown" | "shutdown";
export type Source = "Repeat" | "Referral" | "WhatsApp" | "Website" | "Phone" | "Outreach";

export type Deal = {
  id: string;
  title: string;
  customerId: string;
  value: number;
  status: DealStatus;
  closes: string;
  created: string;
  closedAt?: string;
  owners: string[];
  service: Service;
  pumpType: PumpType;
  urgency: Urgency;
  source: Source;
  pos: number;
  lostReason?: string;
};

export type Pump = {
  tag: string;
  type: PumpType;
  desc: string;
  lastRefurb: string;
  months: number;
};

export type Customer = {
  id: string;
  contact: string;
  role: string;
  company: string;
  segment: Segment;
  town: string;
  phone: string;
  email: string;
  lastContact: string;
  since: string;
  score: number;
  starred: boolean;
  source: Source;
  pumps: Pump[];
  optOut?: boolean;
  outSince?: string;
};

export type Condition = "reuse" | "recondition" | "replace";
export type JobPart = { id: string; condition: Condition; note: string };
export type Job = {
  id: string;
  dealId: string;
  customerId: string;
  title: string;
  pumpType: PumpType;
  /** stages completed, 0 to 6 */
  done: number;
  due: string;
  machine: string;
  urgency: Urgency;
  photo: string;
  parts: JobPart[];
};

export type InvoiceStatus = "Draft" | "Sent" | "Overdue" | "Paid";
export type Invoice = {
  id: string;
  dealId: string;
  customerId: string;
  title: string;
  /** excluding VAT */
  amount: number;
  date: string;
  due: string;
  status: InvoiceStatus;
  paidAt?: string;
  reminded?: boolean;
};

export type EventKind = "Site visit" | "Collection" | "Inspection" | "Delivery" | "Call-out";
export type CalEvent = {
  id: string;
  kind: EventKind;
  title: string;
  customerId: string;
  date: string;
  start: number;
  hours: number;
  who: string;
};

export type Activity = {
  id: string;
  who: string;
  text: string;
  at: number;
  customerId?: string;
  dealId?: string;
};

export type InboxItem = {
  id: string;
  channel: "Website" | "WhatsApp" | "Phone" | "Email";
  from: string;
  customerId: string;
  text: string;
  at: number;
  service: Service;
  pumpType: PumpType;
  estimate: number;
  urgency: Urgency;
  title: string;
  done: boolean;
};

/* ---------------- outreach ---------------- */
export type AudienceKey = "due" | "quiet" | "lost" | "prospects";
export type ReplyKind = "yes" | "quote" | "later" | "stop";

export type Prospect = {
  id: string;
  contact: string;
  role: string;
  company: string;
  segment: Segment;
  town: string;
  email: string;
  status: "new" | "emailed" | "customer" | "out";
  outSince?: string;
  customerId?: string;
};

export type Recipient = {
  /** customer or prospect id */
  id: string;
  /** emails sent so far */
  sent: number;
  lastSent?: string;
  state: "active" | "replied" | "done" | "out";
  reply?: ReplyKind;
  repliedOn?: string;
  pump?: string;
  quote?: string;
  dealId?: string;
};

export type CampaignStep = { day: number; subject: string; body: string };
export type Campaign = {
  id: string;
  name: string;
  audience: AudienceKey;
  segment: Segment | "All";
  status: "Draft" | "Running" | "Paused" | "Finished";
  started?: string;
  steps: CampaignStep[];
  recipients: Recipient[];
};

export type MailReply = {
  id: string;
  campaignId: string;
  contactId: string;
  kind: ReplyKind;
  text: string;
  at: number;
  done: boolean;
  title: string;
  pumpType: PumpType;
  estimate: number;
};

export type Member = { id: string; name: string; role: string; tone: string };

export type State = {
  seedDay: string;
  deals: Deal[];
  customers: Customer[];
  jobs: Job[];
  invoices: Invoice[];
  events: CalEvent[];
  activity: Activity[];
  inbox: InboxItem[];
  prospects: Prospect[];
  campaigns: Campaign[];
  replies: MailReply[];
};
