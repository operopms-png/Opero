// Gated Communities (NOVOURQ own company only): the full plan for managing gated communities, one entry per section, grouped
// under the headings along the top of the Communities page. A section listed in BUILT has a working tab; every other section
// shows its feature list as "planned" until it is built.
export type CommunitySection = { name: string; blurb: string; features: string[] }
export type CommunityGroup = { label: string; sections: CommunitySection[] }

export const BUILT = ["Dashboard", "Property & Unit Management", "Homeowner & Resident Management", "Visitor Management", "Maintenance & Repairs", "Complaints & Resident Relations"]

export const COMMUNITY_GROUPS: CommunityGroup[] = [
 {
  "label": "OVERVIEW",
  "sections": [
   {
    "name": "Dashboard",
    "blurb": "The whole community today: units, residents, visitors, maintenance and complaints.",
    "features": [
     "Community performance overview",
     "Total residential units",
     "Occupied properties",
     "Vacant properties",
     "Homeowners overview",
     "Tenants overview",
     "Registered residents",
     "Visitors currently on-site",
     "Visitors expected today",
     "Contractor access overview",
     "Security status",
     "Gate activity overview",
     "Outstanding service charges",
     "Outstanding maintenance requests",
     "Communal facility status",
     "Open incidents and complaints",
     "Community expenditure",
     "Outstanding tasks",
     "Operational alerts"
    ]
   }
  ]
 },
 {
  "label": "COMMUNITY AND PEOPLE",
  "sections": [
   {
    "name": "Community Management",
    "blurb": "Each community as a record: layout, zones, roads, amenities and its management agreement.",
    "features": [
     "All communities",
     "Community profiles",
     "Community locations",
     "Community information",
     "Community layouts",
     "Development master plans",
     "Residential zones",
     "Residential blocks",
     "Streets and roads",
     "Community boundaries",
     "Community facilities",
     "Community amenities",
     "Community rules and regulations",
     "Community operating status",
     "Multiple community management",
     "Community management agreements"
    ]
   },
   {
    "name": "Property & Unit Management",
    "blurb": "Every residential unit with its type, block, status and owner.",
    "features": [
     "All residential units",
     "Property profiles",
     "Property ownership records",
     "Property addresses",
     "Property inspections",
     "Property condition reports",
     "Property maintenance history",
     "Property compliance records",
     "Property documentation"
    ]
   },
   {
    "name": "Homeowner & Resident Management",
    "blurb": "Homeowners, tenants and family members: who lives where, move-in and move-out, vehicles and contact details.",
    "features": [
     "Homeowner database",
     "Homeowner profiles",
     "Homeowner identification",
     "Ownership verification",
     "Property ownership records",
     "Homeowner contact details",
     "Homeowner account information",
     "Multiple property ownership",
     "Joint ownership records",
     "Homeowner correspondence",
     "Homeowner enquiries",
     "Homeowner complaints",
     "Homeowner requests",
     "Homeowner notices",
     "Homeowner statements",
     "Homeowner history",
     "Move-in registrations",
     "Move-out registrations",
     "Tenancy information",
     "Tenancy agreements",
     "Resident status",
     "Resident requests",
     "Resident communication history"
    ]
   }
  ]
 },
 {
  "label": "SECURITY AND ACCESS",
  "sections": [
   {
    "name": "Visitor Management",
    "blurb": "Expected visitors, deliveries and contractors, with check-in and check-out at the gate.",
    "features": [
     "Visitor database",
     "Visitor pre-registration",
     "Visitor invitations",
     "Visitor approval requests",
     "Expected visitors",
     "Walk-in visitors",
     "Guest registration",
     "Visitor identification",
     "Visitor photographs, where lawful",
     "Visitor vehicle registration",
     "Visitor QR codes",
     "Temporary access passes",
     "One-time access codes",
     "Recurring visitor permissions",
     "Visitor check-in",
     "Visitor check-out"
    ]
   },
   {
    "name": "Access Control & Gate Management",
    "blurb": "Who may enter and when, with a log of gate activity.",
    "features": [
     "Resident access permissions",
     "Access activity logs",
     "Unauthorised access alerts"
    ]
   },
   {
    "name": "Security Operations",
    "blurb": "Guards, patrols, incidents, CCTV and the control room.",
    "features": [
     "Security dashboard",
     "Security guard database",
     "Security staff assignments",
     "Security shift schedules",
     "Guard patrol schedules",
     "Patrol checkpoint tracking",
     "Digital patrol verification",
     "Security incident reports",
     "Suspicious activity reports",
     "Intruder alerts",
     "Unauthorised entry reports",
     "Emergency response management",
     "Security handover reports",
     "Security vehicle management",
     "Security equipment management",
     "CCTV monitoring integration",
     "CCTV camera directory",
     "Camera location mapping",
     "Security control room",
     "Emergency escalation procedures",
     "Security performance reports"
    ]
   }
  ]
 },
 {
  "label": "FACILITIES AND UPKEEP",
  "sections": [
   {
    "name": "Facility Booking & Amenities",
    "blurb": "Bookings for the clubhouse, gym, pool and function spaces, with approvals, fees and deposits.",
    "features": [
     "Event reservations",
     "Private function bookings",
     "Booking approvals",
     "Booking cancellations",
     "Booking modifications",
     "Booking fees",
     "Refunds",
     "Facility capacity limits",
     "Booking restrictions",
     "Booking deposits",
     "Booking history",
     "Automated booking confirmations"
    ]
   },
   {
    "name": "Maintenance & Repairs",
    "blurb": "Repair requests from residents and common areas, with who is fixing them and when.",
    "features": [
     "Maintenance dashboard",
     "Maintenance requests",
     "Resident maintenance requests",
     "Homeowner maintenance requests",
     "Common-area maintenance",
     "Emergency repairs",
     "Planned maintenance",
     "Preventative maintenance",
     "Work orders",
     "Plumbing maintenance",
     "Electrical maintenance",
     "Roofing maintenance",
     "Road maintenance",
     "Drainage maintenance",
     "Streetlight maintenance",
     "Gate maintenance",
     "Fence and boundary maintenance",
     "Swimming pool maintenance",
     "Gym equipment maintenance",
     "Playground maintenance",
     "Contractor assignments",
     "Repair approvals",
     "Maintenance schedules",
     "Maintenance history",
     "Maintenance expenditure"
    ]
   },
   {
    "name": "Groundskeeping & Landscaping",
    "blurb": "Gardens, lawns, trees, irrigation and outdoor upkeep.",
    "features": [
     "Landscaping operations",
     "Garden maintenance",
     "Lawn maintenance",
     "Tree maintenance",
     "Hedge trimming",
     "Flowerbed maintenance",
     "Irrigation systems",
     "Outdoor cleaning",
     "Common-area upkeep",
     "Waste collection areas",
     "Pest control",
     "Groundskeeping work orders",
     "Landscaping expenditure"
    ]
   },
   {
    "name": "Cleaning & Waste Management",
    "blurb": "Communal cleaning, bins, recycling and waste collection.",
    "features": [
     "Communal-area cleaning",
     "Building cleaning",
     "Stairwell cleaning",
     "Corridor cleaning",
     "Clubhouse cleaning",
     "Gym cleaning",
     "Swimming pool cleaning",
     "Public toilet cleaning",
     "Window cleaning",
     "Cleaning schedules",
     "Cleaning staff assignments",
     "Cleaning inspections",
     "Cleaning checklists",
     "Waste collection schedules",
     "Bin management",
     "Recycling management",
     "Bulk waste collection"
    ]
   },
   {
    "name": "Utilities Management",
    "blurb": "Communal electricity and water, meters, generators and outages.",
    "features": [
     "Communal electricity consumption",
     "Communal water consumption",
     "Utility meter records",
     "Individual meter readings",
     "Utility supplier information",
     "Utility invoices",
     "Utility payments",
     "Consumption monitoring",
     "Utility expenditure",
     "Water leak alerts",
     "Electricity outage alerts",
     "Generator management",
     "Backup power systems",
     "Solar power systems",
     "Energy efficiency monitoring"
    ]
   }
  ]
 },
 {
  "label": "FINANCE",
  "sections": [
   {
    "name": "Financial Management",
    "blurb": "Service charges, income, costs, budgets and the reserve fund.",
    "features": [
     "Community revenue",
     "Service charge income",
     "Facility booking income",
     "Parking income",
     "Additional service income",
     "Operating expenses",
     "Security expenditure",
     "Maintenance expenditure",
     "Cleaning expenditure",
     "Landscaping expenditure",
     "Utilities expenditure",
     "Supplier payments",
     "Contractor payments",
     "Accounts payable",
     "Accounts receivable",
     "Invoicing",
     "Payment processing",
     "Bank reconciliation",
     "Budget management",
     "Cash flow management",
     "Reserve fund accounting",
     "Financial reporting",
     "Community profitability",
     "Management fee calculations"
    ]
   }
  ]
 },
 {
  "label": "RESIDENT RELATIONS",
  "sections": [
   {
    "name": "Complaints & Resident Relations",
    "blurb": "Complaints, disputes and rule breaches, tracked to an outcome.",
    "features": [
     "Resident complaints",
     "Homeowner complaints",
     "Noise complaints",
     "Parking complaints",
     "Security complaints",
     "Maintenance complaints",
     "Neighbour disputes",
     "Community rule violations",
     "Complaint investigations"
    ]
   },
   {
    "name": "Community Rules & Regulations",
    "blurb": "The rules, warnings and fines that keep the community in order.",
    "features": [
     "Community rules",
     "Residential regulations",
     "Architectural guidelines",
     "Noise restrictions",
     "Parking regulations",
     "Pet policies",
     "Visitor policies",
     "Security policies",
     "Facility usage policies",
     "Landscaping requirements",
     "Waste disposal regulations",
     "Renovation restrictions",
     "Property alteration applications",
     "Rule violation reports",
     "Warning notices",
     "Enforcement actions",
     "Fine management",
     "Compliance tracking"
    ]
   },
   {
    "name": "Renovations & Alterations",
    "blurb": "Applications to alter a home, with approvals and contractors.",
    "features": [
     "Renovation applications",
     "Home improvement requests",
     "Architectural approval requests",
     "Construction permissions",
     "Contractor registrations",
     "Project completion approvals",
     "Renovation history"
    ]
   },
   {
    "name": "Community Events & Activities",
    "blurb": "Events, meetings and social activities for residents.",
    "features": [
     "Community events",
     "Resident events",
     "Homeowner meetings",
     "Annual general meetings (AGMs)",
     "Community social activities",
     "Children's activities",
     "Sports events",
     "Holiday events",
     "Event planning",
     "Event scheduling",
     "Event registrations",
     "Event reservations",
     "Event budgets",
     "Event expenditure",
     "Event communications",
     "Event feedback"
    ]
   },
   {
    "name": "Governance & Voting",
    "blurb": "Meetings, decisions and approvals by owners or the board.",
    "features": [
     "Community policies",
     "Governance documents",
     "Annual general meetings",
     "Special general meetings",
     "Community decisions",
     "Financial approvals",
     "Management reports",
     "Governance history"
    ]
   },
   {
    "name": "Communications & Notifications",
    "blurb": "Messages to residents, homeowners, visitors, contractors and staff.",
    "features": [
     "Email",
     "WhatsApp",
     "SMS",
     "Phone calls",
     "Resident communications",
     "Homeowner communications",
     "Tenant communications",
     "Visitor notifications",
     "Contractor communications",
     "Staff communications",
     "Internal messaging",
     "Automated notifications",
     "Communication history"
    ]
   }
  ]
 },
 {
  "label": "SAFETY, STAFF AND SUPPLIERS",
  "sections": [
   {
    "name": "Health, Safety & Compliance",
    "blurb": "Fire safety, inspections, insurance and certificates.",
    "features": [
     "Health and safety records",
     "Fire safety inspections",
     "Fire alarm maintenance",
     "Fire extinguisher inspections",
     "Emergency evacuation plans",
     "Emergency assembly points",
     "Fire safety equipment",
     "First aid equipment",
     "Health and safety incidents",
     "Accident reports",
     "Risk assessments",
     "Safety inspections",
     "Insurance documents",
     "Regulatory compliance",
     "Contractor insurance records",
     "Staff safety training",
     "Compliance reminders",
     "Inspection certificates"
    ]
   },
   {
    "name": "Emergency & Disaster Management",
    "blurb": "Plans and alerts for fire, flood, hurricane, power and water emergencies.",
    "features": [
     "Emergency management dashboard",
     "Fire emergency procedures",
     "Medical emergency procedures",
     "Security emergencies",
     "Flood management",
     "Hurricane preparedness",
     "Storm response",
     "Earthquake procedures",
     "Power outage response",
     "Water supply emergencies",
     "Emergency contact directory",
     "Emergency response teams",
     "Evacuation procedures",
     "Emergency resident notifications",
     "Emergency assembly point records",
     "Emergency equipment inventory",
     "Emergency incident reports",
     "Disaster recovery plans"
    ]
   },
   {
    "name": "Staff & Workforce Management",
    "blurb": "Security, maintenance, cleaning and management staff: schedules, attendance and training.",
    "features": [
     "Staff database",
     "Security personnel",
     "Maintenance personnel",
     "Cleaning personnel",
     "Groundskeeping personnel",
     "Facility management personnel",
     "Community management staff",
     "Department management",
     "Staff schedules",
     "Shift management",
     "Attendance tracking",
     "Clock-in and clock-out",
     "Leave management",
     "Staff training",
     "Staff certifications",
     "Performance management",
     "Payroll information",
     "Staff task assignments",
     "Contractor workforce management"
    ]
   },
   {
    "name": "Contractor & Supplier Management",
    "blurb": "Contractors and suppliers: verification, quotes, orders and performance.",
    "features": [
     "Supplier database",
     "Contractor profiles",
     "Supplier profiles",
     "Contractor identification",
     "Contractor access registration",
     "Contractor verification",
     "Insurance certificates",
     "Contractor licences",
     "Supplier quotations",
     "Tender management",
     "Purchase orders",
     "Service agreements",
     "Contractor assignments",
     "Contractor performance",
     "Contractor reviews",
     "Supplier invoices",
     "Contractor payments",
     "Contractor renewal reminders",
     "Contractor access history"
    ]
   },
   {
    "name": "Inventory & Equipment Management",
    "blurb": "Community equipment and stock.",
    "features": [
     "Community inventory",
     "Security equipment",
     "Maintenance equipment",
     "Cleaning equipment",
     "Gardening equipment"
    ]
   },
   {
    "name": "Tasks & Workflow",
    "blurb": "Tasks, checklists and approvals for every team.",
    "features": [
     "Security tasks",
     "Maintenance tasks",
     "Cleaning tasks",
     "Landscaping tasks",
     "Facility management tasks",
     "Staff assignments",
     "Daily operational checklists",
     "Patrol checklists",
     "Inspection checklists",
     "Follow-ups",
     "Reminders",
     "Approval requests",
     "Escalation workflows",
     "Shift handover tasks",
     "Automated workflows",
     "Task history"
    ]
   }
  ]
 },
 {
  "label": "REPORTS AND SYSTEM",
  "sections": [
   {
    "name": "Reports & Analytics",
    "blurb": "Occupancy, visitors, gate access, security, maintenance and service charge reports.",
    "features": [
     "Community occupancy reports",
     "Homeowner reports",
     "Resident reports",
     "Tenant reports",
     "Visitor activity reports",
     "Gate access reports",
     "Security performance reports",
     "Incident reports",
     "Parking reports",
     "Facility utilisation reports",
     "Maintenance performance",
     "Maintenance expenditure",
     "Cleaning performance",
     "Landscaping expenditure",
     "Service charge collection reports"
    ]
   },
   {
    "name": "Settings & System Administration",
    "blurb": "Set-up for visitors, parking, facilities, service charges and integrations.",
    "features": [
     "Visitor access settings",
     "Parking configurations",
     "Facility configurations",
     "Service charge configurations",
     "Payment integrations",
     "CCTV integrations",
     "Access control integrations",
     "Accounting integrations",
     "Communication integrations",
     "System settings",
     "Audit logs",
     "Activity history"
    ]
   }
  ]
 },
 {
  "label": "PORTALS AND APP",
  "sections": [
   {
    "name": "Resident & Homeowner Portal",
    "blurb": "A separate login for homeowners and residents, connected to this system but not to your internal dashboard.",
    "features": [
     "Resident dashboard",
     "Homeowner dashboard",
     "Gym bookings",
     "Clubhouse reservations",
     "Swimming pool information",
     "Maintenance requests",
     "Repair requests",
     "Complaint submissions",
     "Community announcements",
     "Community notices",
     "Service charge statements",
     "Outstanding payments",
     "Online payments",
     "Payment history",
     "Digital receipts",
     "Community rules",
     "Renovation applications",
     "Document downloads",
     "Community events",
     "Resident directory (with privacy controls)",
     "Emergency notifications",
     "Contact management office",
     "AI resident assistant"
    ]
   },
   {
    "name": "Security Guard & Gatehouse Portal",
    "blurb": "A separate, simple screen for guards, so they never need access to the whole management system.",
    "features": [
     "Guard dashboard",
     "Current shift information",
     "Gatehouse visitor arrivals",
     "Expected visitor list",
     "Visitor verification",
     "Visitor identification checks",
     "Resident confirmation requests",
     "Visitor check-in",
     "Visitor check-out",
     "QR code scanning",
     "Vehicle registration checks",
     "Number plate recognition",
     "Delivery registration",
     "Contractor verification",
     "Temporary access passes",
     "Unauthorised access reporting",
     "Denied entry records",
     "Emergency incident reporting",
     "Security patrol assignments",
     "Patrol checkpoint scanning",
     "Security handover reports",
     "CCTV incident references",
     "Emergency contacts",
     "Shift attendance",
     "Security activity history"
    ]
   },
   {
    "name": "Community Management Mobile App",
    "blurb": "For your own staff and operational teams.",
    "features": [
     "Mobile management dashboard",
     "Live security alerts",
     "Visitor activity",
     "Gate access monitoring",
     "Maintenance assignments",
     "Maintenance inspections",
     "Contractor management",
     "Staff attendance",
     "Cleaning schedules",
     "Landscaping schedules",
     "Facility inspections",
     "Incident reporting",
     "Emergency notifications",
     "Resident communications",
     "Task management",
     "Photo and video evidence",
     "Digital signatures",
     "AI assistant"
    ]
   },
   {
    "name": "Recommended Extras",
    "blurb": "Features that set a professional gated-community platform apart from a normal property management system.",
    "features": [
     "Live community map: interactive site plan showing every property, road, gate, CCTV camera, parking space, facility and emergency point",
     "Digital gate integration: connect to the actual gate controllers so authorised visitors and residents can gain access",
     "Licence plate recognition: automatically identify registered vehicles at the entrance",
     "Smart parcel management: log deliveries, notify residents, record collection and keep delivery history",
     "Community financial transparency: let homeowners see how service charges are being spent, with appropriate permissions",
     "Property resale and ownership transfers: record ownership changes, new homeowner onboarding and access credential transfers",
     "Smart utility monitoring: monitor communal water and electricity use and spot unusual usage",
     "Emergency broadcasting: send urgent alerts to every registered resident through SMS, WhatsApp and app notifications",
     "Community asset register: track the condition, value, warranties and replacement dates of communal assets",
     "Management company performance: track the quality of NOVOURQ's management services, SLA compliance and response times"
    ]
   }
  ]
 }
]
