import {
  Department,
  DDO,
  User,
  Vendor,
  BudgetGrant,
  DdoAllocation,
  Bill,
  CorporateBankAccount,
  AuditLog,
  WorkflowConfig,
  RtgsBatch,
} from '../types';
import { STANDARD_DEDUCTIONS } from '../config/config';

export function getInitialSeedData() {
  const departments: Department[] = [
    { id: 'DEP-TRN', name: 'Transport & Fleet Management', createdAt: '2025-04-01T09:00:00Z' },
    { id: 'DEP-ENG', name: 'Civil Engineering & Infrastructure', createdAt: '2025-04-01T09:00:00Z' },
    { id: 'DEP-ACC', name: 'Finance & Municipal Accounts', createdAt: '2025-04-01T09:00:00Z' },
  ];

  const ddos: DDO[] = [
    { id: '100234', name: 'Executive Engineer - Road Infrastructure Div', departmentId: 'DEP-TRN' },
    { id: '100235', name: 'Executive Engineer - Electric Bus Depot & Fleet', departmentId: 'DEP-TRN' },
    { id: '100567', name: 'Superintending Engineer - Major Roads North', departmentId: 'DEP-ENG' },
    { id: '100568', name: 'Executive Engineer - Stormwater Drain South', departmentId: 'DEP-ENG' },
    { id: '100569', name: 'Executive Engineer - Lakes & Rejuvenation', departmentId: 'DEP-ENG' },
    { id: '200111', name: 'Senior Accounts Officer - Central Treasury', departmentId: 'DEP-ACC' },
    { id: '200112', name: 'Chief Auditor - Municipal Audit Cell', departmentId: 'DEP-ACC' },
  ];

  const users: User[] = [
    {
      id: 'USR-SA-01',
      name: 'Rajesh Rao',
      email: 'rajesh.admin@gba.karnataka.gov.in',
      role: 'Super Admin',
      ddoIds: [],
      active: true,
    },
    {
      id: 'USR-DF-01',
      name: 'Suresh Kumar, IAS',
      email: 'suresh.df@gba.karnataka.gov.in',
      role: 'Director of Finance',
      ddoIds: ['100234', '100235', '100567', '100568', '100569', '200111', '200112'],
      active: true,
    },
    {
      id: 'USR-FO-01',
      name: 'Meera Nambiar, KAS',
      email: 'meera.fo@gba.karnataka.gov.in',
      role: 'Finance Officer',
      ddoIds: ['100234', '100235', '100567', '100568', '100569', '200111', '200112'],
      active: true,
    },
    {
      id: 'USR-CR-01',
      name: 'Ramesh Gowda',
      email: 'ramesh.cr@gba.karnataka.gov.in',
      role: 'Creator',
      ddoIds: ['100234'], // Transport Road Infrastructure
      active: true,
    },
    {
      id: 'USR-CR-02',
      name: 'Anand Kulkarni',
      email: 'anand.cr@gba.karnataka.gov.in',
      role: 'Creator',
      ddoIds: ['100567'], // Engg Major Roads North
      active: true,
    },
    {
      id: 'USR-CR-03',
      name: 'Sunil Hegde',
      email: 'sunil.cr@gba.karnataka.gov.in',
      role: 'Creator',
      ddoIds: ['100235'], // Transport Fleet Div (Budget Near Limit)
      active: true,
    },
    {
      id: 'USR-VR-01',
      name: 'Priya Sharma',
      email: 'priya.vr@gba.karnataka.gov.in',
      role: 'Verifier',
      ddoIds: ['100234', '100567', '100235'],
      creatorIds: ['USR-CR-01', 'USR-CR-02', 'USR-CR-03'],
      active: true,
    },
    {
      id: 'USR-AP-01',
      name: 'Dr. K. Venkatesh',
      email: 'k.venkatesh@gba.karnataka.gov.in',
      role: 'Approver',
      ddoIds: ['100234', '100567', '100235', '100568', '200111'],
      active: true,
    },
    {
      id: 'USR-RTGS-01',
      name: 'Sunita Patil',
      email: 'sunita.rtgs@gba.karnataka.gov.in',
      role: 'RTGS Manager',
      ddoIds: [],
      active: true,
    },
  ];

  const vendors: Vendor[] = [
    {
      id: 'V-0001',
      name: 'Karnataka State Road Tech Ltd',
      type: 'Contractor',
      gstin: '29ABCDE1234F1Z5',
      bankAccountNumber: '9123847592812',
      ifsc: 'CNRB0000412',
      bankName: 'Canara Bank',
      branchName: 'Cantonment Bangalore',
      address: 'Plot 45, Peenya Industrial Area 2nd Phase, Bengaluru 560058',
      documents: [
        { name: 'PAN Card Copy', status: 'Uploaded', uploadedAt: '2025-04-02T10:00:00Z' },
        { name: 'GSTIN Registration Certificate', status: 'Uploaded', uploadedAt: '2025-04-02T10:00:00Z' },
        { name: 'Cancelled Bank Cheque', status: 'Uploaded', uploadedAt: '2025-04-02T10:00:00Z' },
        { name: 'GBA Empanelment Order', status: 'Uploaded', uploadedAt: '2025-04-02T10:00:00Z' },
      ],
      active: true,
    },
    {
      id: 'V-0002',
      name: 'Bengaluru Infra Projects Pvt Ltd',
      type: 'Contractor',
      gstin: '29AAACB1948H1Z8',
      bankAccountNumber: '50200048192841',
      ifsc: 'HDFC0001742',
      bankName: 'HDFC Bank',
      branchName: 'Koramangala 4th Block',
      address: 'Suite 302, Outer Ring Road, Bellandur, Bengaluru 560103',
      documents: [
        { name: 'PAN Card Copy', status: 'Uploaded', uploadedAt: '2025-04-03T11:30:00Z' },
        { name: 'GSTIN Registration Certificate', status: 'Uploaded', uploadedAt: '2025-04-03T11:30:00Z' },
        { name: 'Cancelled Bank Cheque', status: 'Uploaded', uploadedAt: '2025-04-03T11:30:00Z' },
        { name: 'GBA Empanelment Order', status: 'Pending' },
      ],
      active: true,
    },
    {
      id: 'V-0003',
      name: 'Apex Electro-Mobility Solutions',
      type: 'Supplier',
      gstin: '29AABCA9923C1Z2',
      bankAccountNumber: '34102948192',
      ifsc: 'SBIN0040182',
      bankName: 'State Bank of India',
      branchName: 'M.G. Road Bangalore',
      address: 'No 12, Whitefield Main Road, Bengaluru 560066',
      documents: [
        { name: 'PAN Card Copy', status: 'Uploaded', uploadedAt: '2025-04-05T09:15:00Z' },
        { name: 'GSTIN Registration Certificate', status: 'Uploaded', uploadedAt: '2025-04-05T09:15:00Z' },
        { name: 'Cancelled Bank Cheque', status: 'Pending' },
        { name: 'GBA Empanelment Order', status: 'Pending' },
      ],
      active: true,
    },
    {
      id: 'V-0004',
      name: 'Cauvery Civil Works & Bridges LLP',
      type: 'Contractor',
      gstin: '29AALCC4421M1Z4',
      bankAccountNumber: '04210010005432',
      ifsc: 'CNRB0000421',
      bankName: 'Canara Bank',
      branchName: 'Jayanagar 4th T Block',
      address: 'No 77, 9th Main, Jayanagar, Bengaluru 560011',
      documents: [
        { name: 'PAN Card Copy', status: 'Uploaded', uploadedAt: '2025-04-06T14:20:00Z' },
        { name: 'GSTIN Registration Certificate', status: 'Uploaded', uploadedAt: '2025-04-06T14:20:00Z' },
        { name: 'Cancelled Bank Cheque', status: 'Uploaded', uploadedAt: '2025-04-06T14:20:00Z' },
        { name: 'GBA Empanelment Order', status: 'Uploaded', uploadedAt: '2025-04-06T14:20:00Z' },
      ],
      active: true,
    },
    {
      id: 'V-0005',
      name: 'Vikas Engineering Consultancy',
      type: 'Consultant',
      gstin: '29ABCDE5566G1Z9',
      bankAccountNumber: '000901582914',
      ifsc: 'ICIC0000009',
      bankName: 'ICICI Bank',
      branchName: 'Indiranagar 100ft Road',
      address: 'No 512, CMH Road, Indiranagar, Bengaluru 560038',
      documents: [
        { name: 'PAN Card Copy', status: 'Uploaded', uploadedAt: '2025-04-08T12:00:00Z' },
        { name: 'GSTIN Registration Certificate', status: 'Uploaded', uploadedAt: '2025-04-08T12:00:00Z' },
        { name: 'Cancelled Bank Cheque', status: 'Uploaded', uploadedAt: '2025-04-08T12:00:00Z' },
        { name: 'GBA Empanelment Order', status: 'Pending' },
      ],
      active: true,
    },
    {
      id: 'V-0006',
      name: 'Shree Renuka Security & Logistics',
      type: 'Service Provider',
      gstin: '29AALFS1122J1Z1',
      bankAccountNumber: '20394819284',
      ifsc: 'PUNB0024900',
      bankName: 'Punjab National Bank',
      branchName: 'Rajajinagar',
      address: 'Dr. Rajkumar Road, Rajajinagar, Bengaluru 560010',
      documents: [
        { name: 'PAN Card Copy', status: 'Uploaded', uploadedAt: '2025-04-10T16:00:00Z' },
        { name: 'GSTIN Registration Certificate', status: 'Pending' },
        { name: 'Cancelled Bank Cheque', status: 'Uploaded', uploadedAt: '2025-04-10T16:00:00Z' },
        { name: 'GBA Empanelment Order', status: 'Pending' },
      ],
      active: true,
    },
    {
      id: 'V-0007',
      name: 'Nandi Heavy Equipments & Aggregates',
      type: 'Supplier',
      gstin: '29AAAFN7788P1Z6',
      bankAccountNumber: '028105001928',
      ifsc: 'ICIC0000281',
      bankName: 'ICICI Bank',
      branchName: 'Hebbal',
      address: 'Bellary Road, Hebbal, Bengaluru 560024',
      documents: [
        { name: 'PAN Card Copy', status: 'Uploaded', uploadedAt: '2025-04-11T10:45:00Z' },
        { name: 'GSTIN Registration Certificate', status: 'Uploaded', uploadedAt: '2025-04-11T10:45:00Z' },
        { name: 'Cancelled Bank Cheque', status: 'Uploaded', uploadedAt: '2025-04-11T10:45:00Z' },
        { name: 'GBA Empanelment Order', status: 'Uploaded', uploadedAt: '2025-04-11T10:45:00Z' },
      ],
      active: true,
    },
    {
      id: 'V-0008',
      name: 'TechMatrix Spatial Solutions',
      type: 'Consultant',
      gstin: '29AAACT9876R1Z3',
      bankAccountNumber: '50100239102931',
      ifsc: 'HDFC0000240',
      bankName: 'HDFC Bank',
      branchName: 'Richmond Road',
      address: 'Richmond Circle, Bengaluru 560025',
      documents: [
        { name: 'PAN Card Copy', status: 'Uploaded', uploadedAt: '2025-04-12T11:00:00Z' },
        { name: 'GSTIN Registration Certificate', status: 'Uploaded', uploadedAt: '2025-04-12T11:00:00Z' },
        { name: 'Cancelled Bank Cheque', status: 'Pending' },
        { name: 'GBA Empanelment Order', status: 'Pending' },
      ],
      active: true,
    },
  ];

  const bankAccounts: CorporateBankAccount[] = [
    {
      id: 'ACC-CANARA-MAIN',
      bankName: 'Canara Bank',
      accountNumber: '0412201009871',
      ifsc: 'CNRB0000412',
      branch: 'Bangalore City Corporation Branch, N.R. Square',
      accountType: 'Current / Government Treasury Account',
      isActive: true,
    },
    {
      id: 'ACC-HDFC-PROJECTS',
      bankName: 'HDFC Bank',
      accountNumber: '50200087492100',
      ifsc: 'HDFC0000140',
      branch: 'Kasturba Road Branch, Bengaluru',
      accountType: 'Special Project Escrow Account',
      isActive: true,
    },
  ];

  // Budget Head Grants (macro)
  const budgetGrants: BudgetGrant[] = [
    {
      id: 'BH01',
      code: 'BH01',
      name: 'Road & Transport Works',
      financialYear: '2025-26',
      departmentId: '',
      totalGranted: 100000000, // ₹ 10 Crores
    },
    {
      id: 'BH02',
      code: 'BH02',
      name: 'Engineering Works',
      financialYear: '2025-26',
      departmentId: '',
      totalGranted: 250000000, // ₹ 25 Crores
    },
    {
      id: 'BH03',
      code: 'BH03',
      name: 'Municipal Accounts',
      financialYear: '2025-26',
      departmentId: '',
      totalGranted: 50000000, // ₹ 5 Crores
    },
  ];

  // DDO Allocations (micro)
  // Notice DDO 100235 is close to limit (allocated 2 Cr, utilized 1.945 Cr, remaining 5.5 Lakhs)
  const ddoAllocations: DdoAllocation[] = [
    {
      id: 'ALC-TRN-100234',
      grantId: 'BH01',
      ddoId: '100234', // Road Infra Div
      allocated: 60000000, // ₹ 6 Cr
      utilized: 15450000, // ₹ 1.545 Cr
      remaining: 44550000, // ₹ 4.455 Cr
    },
    {
      id: 'ALC-TRN-100235',
      grantId: 'BH01',
      ddoId: '100235', // Bus Depot Fleet Div (Budget Near Limit!)
      allocated: 20000000, // ₹ 2.00 Cr
      utilized: 19450000, // ₹ 1.945 Cr
      remaining: 550000, // ₹ 5.50 Lakhs (Submitting 6 Lakh bill triggers exact block!)
    },
    {
      id: 'ALC-ENG-100567',
      grantId: 'BH02',
      ddoId: '100567', // Major Roads North
      allocated: 120000000, // ₹ 12 Cr
      utilized: 41200000, // ₹ 4.12 Cr
      remaining: 78800000, // ₹ 7.88 Cr
    },
    {
      id: 'ALC-ENG-100568',
      grantId: 'BH02',
      ddoId: '100568', // Stormwater Drain South
      allocated: 80000000, // ₹ 8 Cr
      utilized: 22000000, // ₹ 2.20 Cr
      remaining: 58000000, // ₹ 5.80 Cr
    },
    {
      id: 'ALC-ACC-200111',
      grantId: 'BH03',
      ddoId: '200111', // Central Treasury
      allocated: 35000000, // ₹ 3.5 Cr
      utilized: 8900000, // ₹ 89 Lakhs
      remaining: 26100000, // ₹ 2.61 Cr
    },
  ];

  // Helper to create 16 deductions
  function makeDeductions(primaryTds: number, gstTds: number, cess: number = 0, sd: number = 0) {
    return STANDARD_DEDUCTIONS.map((label, idx) => {
      let amount = 0;
      if (idx === 0) amount = primaryTds;
      else if (idx === 1) amount = gstTds;
      else if (idx === 2) amount = cess;
      else if (idx === 3) amount = sd;
      return { id: idx + 1, label, amount };
    });
  }

  // 12+ Bills across all statuses
  const bills: Bill[] = [
    // 1. Draft bill (Creator 1, DDO 100234)
    {
      id: 'IFMS 56',
      ddoId: '100234',
      vendorId: 'V-0001',
      workOrderNo: 'WO/GBA/RD/2025/112',
      workOrderDate: '2025-05-10',
      agreementNo: 'AGR/2025/089',
      description: 'Asphalt resurfacing and lane marking on Hosur Main Corridor km 12-18',
      baseValue: 1200000,
      cgst: 108000,
      sgst: 108000,
      igst: 0,
      grossValue: 1416000,
      deductions: makeDeductions(28320, 28320, 14160, 70800),
      totalDeductions: 141600,
      netPayable: 1274400,
      status: 'Draft',
      attachments: [
        { id: 'att-1', name: 'Work_Completion_Cert_Ph1.pdf', size: '2.4 MB', uploadedAt: '2025-05-14T10:00:00Z' },
        { id: 'att-2', name: 'Quality_Lab_Test_Report.pdf', size: '1.1 MB', uploadedAt: '2025-05-14T10:02:00Z' },
      ],
      history: [
        {
          id: 'hist-1',
          status: 'Draft',
          timestamp: '2025-05-14T10:05:00Z',
          userId: 'USR-CR-01',
          userName: 'Ramesh Gowda',
          userRole: 'Creator',
          remarks: 'Initial draft prepared with measured quantity estimates.',
        },
      ],
      createdBy: 'USR-CR-01',
      createdByName: 'Ramesh Gowda',
      createdAt: '2025-05-14T10:00:00Z',
      updatedAt: '2025-05-14T10:05:00Z',
    },
    // 2. Pending Verification (Creator 1, DDO 100234)
    {
      id: 'IFMS 57',
      ddoId: '100234',
      vendorId: 'V-0002',
      workOrderNo: 'WO/GBA/RD/2025/115',
      workOrderDate: '2025-05-02',
      agreementNo: 'AGR/2025/093',
      description: 'Pedestrian footpath refurbishment and tactile paving at Indiranagar 100ft Rd',
      baseValue: 850000,
      cgst: 76500,
      sgst: 76500,
      igst: 0,
      grossValue: 1003000,
      deductions: makeDeductions(20060, 20060, 10030, 50150),
      totalDeductions: 100300,
      netPayable: 902700,
      status: 'Pending Verification',
      attachments: [
        { id: 'att-3', name: 'Site_Engineer_MB_Record.pdf', size: '3.8 MB', uploadedAt: '2025-05-15T09:30:00Z' },
      ],
      history: [
        {
          id: 'hist-2',
          status: 'Draft',
          timestamp: '2025-05-15T09:35:00Z',
          userId: 'USR-CR-01',
          userName: 'Ramesh Gowda',
          userRole: 'Creator',
          remarks: 'Draft created.',
        },
        {
          id: 'hist-3',
          status: 'Pending Verification',
          timestamp: '2025-05-15T10:00:00Z',
          userId: 'USR-CR-01',
          userName: 'Ramesh Gowda',
          userRole: 'Creator',
          remarks: 'Submitted for verification after measurement book signoff.',
        },
      ],
      createdBy: 'USR-CR-01',
      createdByName: 'Ramesh Gowda',
      createdAt: '2025-05-15T09:30:00Z',
      updatedAt: '2025-05-15T10:00:00Z',
    },
    // 3. Pending Verification (Creator 2, DDO 100567)
    {
      id: 'IFMS 58',
      ddoId: '100567',
      vendorId: 'V-0004',
      workOrderNo: 'WO/GBA/ENG/2025/441',
      workOrderDate: '2025-04-20',
      agreementNo: 'AGR/2025/201',
      description: 'Grade separator approach ramp structural retrofitting and deck expansion joint replacement',
      baseValue: 3400000,
      cgst: 306000,
      sgst: 306000,
      igst: 0,
      grossValue: 4012000,
      deductions: makeDeductions(80240, 80240, 40120, 200600),
      totalDeductions: 401200,
      netPayable: 3610800,
      status: 'Pending Verification',
      attachments: [
        { id: 'att-4', name: 'Bridge_Audit_Report.pdf', size: '5.2 MB', uploadedAt: '2025-05-16T11:00:00Z' },
      ],
      history: [
        {
          id: 'hist-4',
          status: 'Pending Verification',
          timestamp: '2025-05-16T11:15:00Z',
          userId: 'USR-CR-02',
          userName: 'Anand Kulkarni',
          userRole: 'Creator',
          remarks: 'Submitted for scrutiny along with third-party structural audit certificate.',
        },
      ],
      createdBy: 'USR-CR-02',
      createdByName: 'Anand Kulkarni',
      createdAt: '2025-05-16T11:00:00Z',
      updatedAt: '2025-05-16T11:15:00Z',
    },
    // 4. Pending Approval (DDO 100234, verified by Priya Sharma)
    {
      id: 'IFMS 59',
      ddoId: '100234',
      vendorId: 'V-0001',
      workOrderNo: 'WO/GBA/RD/2025/098',
      workOrderDate: '2025-04-10',
      agreementNo: 'AGR/2025/062',
      description: 'Emergency pothole filling and micro-surfacing across Zone 3 arterial roads',
      baseValue: 1850000,
      cgst: 166500,
      sgst: 166500,
      igst: 0,
      grossValue: 2183000,
      deductions: makeDeductions(43660, 43660, 21830, 109150),
      totalDeductions: 218300,
      netPayable: 1964700,
      status: 'Pending Approval',
      attachments: [
        { id: 'att-5', name: 'Pothole_GPS_Before_After.pdf', size: '4.5 MB', uploadedAt: '2025-05-12T14:00:00Z' },
      ],
      history: [
        {
          id: 'hist-5',
          status: 'Pending Verification',
          timestamp: '2025-05-12T14:30:00Z',
          userId: 'USR-CR-01',
          userName: 'Ramesh Gowda',
          userRole: 'Creator',
          remarks: 'Submitted with GPS geo-tagged photographs and asphalt density test reports.',
        },
        {
          id: 'hist-6',
          status: 'Pending Approval',
          timestamp: '2025-05-13T16:00:00Z',
          userId: 'USR-VR-01',
          userName: 'Priya Sharma',
          userRole: 'Verifier',
          remarks: 'Verified against MB No. 441 page 12-28. Deductions verified as per schedule.',
        },
      ],
      createdBy: 'USR-CR-01',
      createdByName: 'Ramesh Gowda',
      createdAt: '2025-05-12T14:00:00Z',
      updatedAt: '2025-05-13T16:00:00Z',
    },
    // 5. Pending Approval (DDO 100567, verified by Priya Sharma)
    {
      id: 'IFMS 60',
      ddoId: '100567',
      vendorId: 'V-0005',
      workOrderNo: 'WO/GBA/ENG/2025/209',
      workOrderDate: '2025-04-15',
      agreementNo: 'AGR/2025/110',
      description: 'Comprehensive project management consultancy fees for North Corridor Flyover',
      baseValue: 750000,
      cgst: 67500,
      sgst: 67500,
      igst: 0,
      grossValue: 885000,
      deductions: makeDeductions(88500, 17700, 0, 0), // 10% TDS for professional
      totalDeductions: 106200,
      netPayable: 778800,
      status: 'Pending Approval',
      attachments: [
        { id: 'att-6', name: 'Milestone_3_Review_Dossier.pdf', size: '1.9 MB', uploadedAt: '2025-05-14T09:00:00Z' },
      ],
      history: [
        {
          id: 'hist-7',
          status: 'Pending Verification',
          timestamp: '2025-05-14T09:30:00Z',
          userId: 'USR-CR-02',
          userName: 'Anand Kulkarni',
          userRole: 'Creator',
          remarks: 'Consultancy milestone 3 bill submitted.',
        },
        {
          id: 'hist-8',
          status: 'Pending Approval',
          timestamp: '2025-05-15T11:00:00Z',
          userId: 'USR-VR-01',
          userName: 'Priya Sharma',
          userRole: 'Verifier',
          remarks: 'Verified milestone deliverable documents. TDS u/s 194J verified at 10%.',
        },
      ],
      createdBy: 'USR-CR-02',
      createdByName: 'Anand Kulkarni',
      createdAt: '2025-05-14T09:00:00Z',
      updatedAt: '2025-05-15T11:00:00Z',
    },
    // 6. Pending RTGS (DDO 100234, Approved by Dr. Venkatesh)
    {
      id: 'IFMS 61',
      ddoId: '100234',
      vendorId: 'V-0001',
      workOrderNo: 'WO/GBA/RD/2025/080',
      workOrderDate: '2025-03-25',
      agreementNo: 'AGR/2025/045',
      description: 'Stormwater culvert precast pipe laying and chamber reconstruction',
      baseValue: 2450000,
      cgst: 220500,
      sgst: 220500,
      igst: 0,
      grossValue: 2891000,
      deductions: makeDeductions(57820, 57820, 28910, 144550),
      totalDeductions: 289100,
      netPayable: 2601900,
      status: 'Pending RTGS',
      attachments: [
        { id: 'att-7', name: 'Culvert_Installation_Signoff.pdf', size: '2.7 MB', uploadedAt: '2025-05-08T11:00:00Z' },
      ],
      history: [
        {
          id: 'hist-9',
          status: 'Pending Verification',
          timestamp: '2025-05-08T11:20:00Z',
          userId: 'USR-CR-01',
          userName: 'Ramesh Gowda',
          userRole: 'Creator',
          remarks: 'Submitted for payment clearance.',
        },
        {
          id: 'hist-10',
          status: 'Pending Approval',
          timestamp: '2025-05-09T14:00:00Z',
          userId: 'USR-VR-01',
          userName: 'Priya Sharma',
          userRole: 'Verifier',
          remarks: 'Verified all statutory deductions and bill measurements.',
        },
        {
          id: 'hist-11',
          status: 'Pending RTGS',
          timestamp: '2025-05-10T10:30:00Z',
          userId: 'USR-AP-01',
          userName: 'Dr. K. Venkatesh',
          userRole: 'Approver',
          remarks: 'Sanction accorded under Budget Head 2025-TRN. Approved for RTGS release.',
        },
      ],
      createdBy: 'USR-CR-01',
      createdByName: 'Ramesh Gowda',
      createdAt: '2025-05-08T11:00:00Z',
      updatedAt: '2025-05-10T10:30:00Z',
    },
    // 7. Pending RTGS (DDO 100567, Approved by Dr. Venkatesh)
    {
      id: 'IFMS 62',
      ddoId: '100567',
      vendorId: 'V-0004',
      workOrderNo: 'WO/GBA/ENG/2025/310',
      workOrderDate: '2025-04-02',
      agreementNo: 'AGR/2025/134',
      description: 'Strengthening of storm drains and revetment wall at Hebbal Valley',
      baseValue: 4800000,
      cgst: 432000,
      sgst: 432000,
      igst: 0,
      grossValue: 5664000,
      deductions: makeDeductions(113280, 113280, 56640, 283200),
      totalDeductions: 566400,
      netPayable: 5097600,
      status: 'Pending RTGS',
      attachments: [
        { id: 'att-8', name: 'Hebbal_Valley_Drain_MB.pdf', size: '6.1 MB', uploadedAt: '2025-05-07T12:00:00Z' },
      ],
      history: [
        {
          id: 'hist-12',
          status: 'Pending RTGS',
          timestamp: '2025-05-11T15:20:00Z',
          userId: 'USR-AP-01',
          userName: 'Dr. K. Venkatesh',
          userRole: 'Approver',
          remarks: 'Sanctioned for electronic RTGS payment dispatch.',
        },
      ],
      createdBy: 'USR-CR-02',
      createdByName: 'Anand Kulkarni',
      createdAt: '2025-05-07T12:00:00Z',
      updatedAt: '2025-05-11T15:20:00Z',
    },
    // 8. Pending RTGS (DDO 100234, Approved by Dr. Venkatesh)
    {
      id: 'IFMS 63',
      ddoId: '100234',
      vendorId: 'V-0007',
      workOrderNo: 'WO/GBA/RD/2025/140',
      workOrderDate: '2025-04-18',
      agreementNo: 'AGR/2025/152',
      description: 'Supply of wet mix macadam aggregates for road base rehabilitation',
      baseValue: 1500000,
      cgst: 135000,
      sgst: 135000,
      igst: 0,
      grossValue: 1770000,
      deductions: makeDeductions(35400, 35400, 17700, 0),
      totalDeductions: 88500,
      netPayable: 1681500,
      status: 'Pending RTGS',
      attachments: [
        { id: 'att-9', name: 'Weighbridge_Challans_Consolidated.pdf', size: '3.4 MB', uploadedAt: '2025-05-09T16:00:00Z' },
      ],
      history: [
        {
          id: 'hist-13',
          status: 'Pending RTGS',
          timestamp: '2025-05-12T11:00:00Z',
          userId: 'USR-AP-01',
          userName: 'Dr. K. Venkatesh',
          userRole: 'Approver',
          remarks: 'Aggregate physical weigh slips checked and approved.',
        },
      ],
      createdBy: 'USR-CR-01',
      createdByName: 'Ramesh Gowda',
      createdAt: '2025-05-09T16:00:00Z',
      updatedAt: '2025-05-12T11:00:00Z',
    },
    // 9. Rejected bill with mandatory remarks (DDO 100234)
    {
      id: 'IFMS 64',
      ddoId: '100234',
      vendorId: 'V-0002',
      workOrderNo: 'WO/GBA/RD/2025/071',
      workOrderDate: '2025-03-15',
      agreementNo: 'AGR/2025/038',
      description: 'Kerb stone installation and median painting along Ring Road stretch',
      baseValue: 620000,
      cgst: 55800,
      sgst: 55800,
      igst: 0,
      grossValue: 731600,
      deductions: makeDeductions(14632, 14632, 7316, 36580),
      totalDeductions: 73160,
      netPayable: 658440,
      status: 'Rejected',
      attachments: [
        { id: 'att-10', name: 'Work_Summary_Kerb.pdf', size: '1.2 MB', uploadedAt: '2025-05-05T10:00:00Z' },
      ],
      history: [
        {
          id: 'hist-14',
          status: 'Pending Verification',
          timestamp: '2025-05-05T10:30:00Z',
          userId: 'USR-CR-01',
          userName: 'Ramesh Gowda',
          userRole: 'Creator',
          remarks: 'Bill submitted for verification.',
        },
        {
          id: 'hist-15',
          status: 'Rejected',
          timestamp: '2025-05-06T15:45:00Z',
          userId: 'USR-VR-01',
          userName: 'Priya Sharma',
          userRole: 'Verifier',
          remarks: 'Rejected: Discrepancy in median measurement. MB page 8 shows 420 meters while invoice bills for 610 meters. Please revise measurements and re-upload verified MB copy.',
        },
      ],
      createdBy: 'USR-CR-01',
      createdByName: 'Ramesh Gowda',
      createdAt: '2025-05-05T10:00:00Z',
      updatedAt: '2025-05-06T15:45:00Z',
    },
    // 10. Paid bill in an RTGS batch (DDO 100234)
    {
      id: 'IFMS 65',
      ddoId: '100234',
      vendorId: 'V-0001',
      workOrderNo: 'WO/GBA/RD/2025/040',
      workOrderDate: '2025-03-01',
      agreementNo: 'AGR/2025/012',
      description: 'Thermal plastic road marking on Bannerghatta Road',
      baseValue: 900000,
      cgst: 81000,
      sgst: 81000,
      igst: 0,
      grossValue: 1062000,
      deductions: makeDeductions(21240, 21240, 10620, 53100),
      totalDeductions: 106200,
      netPayable: 955800,
      status: 'Paid',
      rtgsBatchId: 'RTGS-2025-0001',
      attachments: [
        { id: 'att-11', name: 'Bannerghatta_Marking_MB.pdf', size: '2.1 MB', uploadedAt: '2025-04-15T10:00:00Z' },
      ],
      history: [
        {
          id: 'hist-16',
          status: 'Pending RTGS',
          timestamp: '2025-04-20T11:00:00Z',
          userId: 'USR-AP-01',
          userName: 'Dr. K. Venkatesh',
          userRole: 'Approver',
          remarks: 'Approved for disbursement.',
        },
        {
          id: 'hist-17',
          status: 'Paid',
          timestamp: '2025-04-25T14:30:00Z',
          userId: 'USR-RTGS-01',
          userName: 'Sunita Patil',
          userRole: 'RTGS Manager',
          remarks: 'Included in RTGS Batch RTGS-2025-0001 drawn on Canara Bank.',
        },
      ],
      createdBy: 'USR-CR-01',
      createdByName: 'Ramesh Gowda',
      createdAt: '2025-04-15T10:00:00Z',
      updatedAt: '2025-04-25T14:30:00Z',
    },
    // 11. Paid bill in the same RTGS batch (DDO 100567)
    {
      id: 'IFMS 66',
      ddoId: '100567',
      vendorId: 'V-0004',
      workOrderNo: 'WO/GBA/ENG/2025/150',
      workOrderDate: '2025-03-05',
      agreementNo: 'AGR/2025/050',
      description: 'Desilting and boundary fence installation at Allalasandra Lake',
      baseValue: 1800000,
      cgst: 162000,
      sgst: 162000,
      igst: 0,
      grossValue: 2124000,
      deductions: makeDeductions(42480, 42480, 21240, 106200),
      totalDeductions: 212400,
      netPayable: 1911600,
      status: 'Paid',
      rtgsBatchId: 'RTGS-2025-0001',
      attachments: [
        { id: 'att-12', name: 'Lake_Desilting_Final_Cert.pdf', size: '3.1 MB', uploadedAt: '2025-04-18T12:00:00Z' },
      ],
      history: [
        {
          id: 'hist-18',
          status: 'Paid',
          timestamp: '2025-04-25T14:30:00Z',
          userId: 'USR-RTGS-01',
          userName: 'Sunita Patil',
          userRole: 'RTGS Manager',
          remarks: 'Included in RTGS Batch RTGS-2025-0001 drawn on Canara Bank.',
        },
      ],
      createdBy: 'USR-CR-02',
      createdByName: 'Anand Kulkarni',
      createdAt: '2025-04-18T12:00:00Z',
      updatedAt: '2025-04-25T14:30:00Z',
    },
    // 12. DDO 100235 Bill (Electric Bus Depot, utilizes 1.945 Cr of 2 Cr)
    {
      id: 'IFMS 67',
      ddoId: '100235',
      vendorId: 'V-0003',
      workOrderNo: 'WO/GBA/FLT/2025/019',
      workOrderDate: '2025-04-01',
      agreementNo: 'AGR/2025/005',
      description: 'Supply and turnkey commissioning of 120kW DC fast electric bus chargers at Hebbal Depot',
      baseValue: 16483050.85,
      cgst: 1483474.58,
      sgst: 1483474.57,
      igst: 0,
      grossValue: 19450000,
      deductions: makeDeductions(389000, 389000, 0, 972500),
      totalDeductions: 1750500,
      netPayable: 17699500,
      status: 'Pending RTGS',
      attachments: [
        { id: 'att-13', name: 'EV_Charger_Commissioning_Report.pdf', size: '4.8 MB', uploadedAt: '2025-05-01T10:00:00Z' },
      ],
      history: [
        {
          id: 'hist-19',
          status: 'Pending RTGS',
          timestamp: '2025-05-03T16:00:00Z',
          userId: 'USR-AP-01',
          userName: 'Dr. K. Venkatesh',
          userRole: 'Approver',
          remarks: 'Sanctioned against dedicated EV modernization allocation.',
        },
      ],
      createdBy: 'USR-CR-03',
      createdByName: 'Sunil Hegde',
      createdAt: '2025-05-01T10:00:00Z',
      updatedAt: '2025-05-03T16:00:00Z',
    },
  ];

  // Seed RTGS Batch for the two Paid bills
  const rtgsBatches: RtgsBatch[] = [
    {
      id: 'RTGS-2025-0001',
      billIds: ['IFMS 65', 'IFMS 66'],
      bankAccountId: 'ACC-CANARA-MAIN',
      totalAmount: 2867400, // 955,800 + 1,911,600
      beneficiaryCount: 2,
      generatedBy: 'USR-RTGS-01',
      generatedByName: 'Sunita Patil',
      generatedAt: '2025-04-25T14:30:00Z',
    },
  ];

  // Audit Logs (append-only)
  const auditLogs: AuditLog[] = [
    {
      id: 'AUD-001',
      timestamp: '2025-04-01T09:15:00Z',
      actionType: 'GRANT_CREATED',
      userId: 'USR-DF-01',
      userName: 'Suresh Kumar, IAS',
      role: 'Director of Finance',
      entityType: 'BudgetGrant',
      entityId: 'GRT-2025-TRN',
      oldValue: null,
      newValue: { id: 'GRT-2025-TRN', departmentId: 'DEP-TRN', totalGranted: 100000000 },
    },
    {
      id: 'AUD-002',
      timestamp: '2025-04-01T11:00:00Z',
      actionType: 'ALLOCATION_SET',
      userId: 'USR-FO-01',
      userName: 'Meera Nambiar, KAS',
      role: 'Finance Officer',
      entityType: 'DdoAllocation',
      entityId: 'ALC-TRN-100234',
      oldValue: null,
      newValue: { ddoId: '100234', allocated: 60000000, utilized: 0 },
    },
    {
      id: 'AUD-003',
      timestamp: '2025-05-06T15:45:00Z',
      actionType: 'BILL_REJECTED',
      userId: 'USR-VR-01',
      userName: 'Priya Sharma',
      role: 'Verifier',
      entityType: 'Bill',
      entityId: 'IFMS 64',
      oldValue: { status: 'Pending Verification', grossValue: 731600 },
      newValue: {
        status: 'Rejected',
        remarks: 'Discrepancy in median measurement. MB page 8 shows 420m vs 610m billed.',
      },
    },
    {
      id: 'AUD-004',
      timestamp: '2025-04-25T14:30:00Z',
      actionType: 'RTGS_BATCH_GENERATED',
      userId: 'USR-RTGS-01',
      userName: 'Sunita Patil',
      role: 'RTGS Manager',
      entityType: 'RtgsBatch',
      entityId: 'RTGS-2025-0001',
      oldValue: null,
      newValue: {
        batchId: 'RTGS-2025-0001',
        totalAmount: 2867400,
        billIds: ['IFMS 65', 'IFMS 66'],
        bankAccountId: 'ACC-CANARA-MAIN',
      },
    },
  ];

  const workflowConfig: WorkflowConfig = {
    verifierEnabled: true,
    mandatoryRemarksMinLength: 10,
    financialYear: '2025-26',
  };

  const usersWithIdentity: User[] = users.map((user, index) => {
    const clean = user.name.replace(/,.*$/, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    const firstName = (parts[0] || 'User').replace(/[^A-Za-z]/g, '') || 'User';
    const lastName = (parts.slice(1).join(' ') || 'Officer').replace(/[^A-Za-z]/g, '') || 'Officer';
    return {
      ...user,
      firstName,
      lastName,
      username: `${firstName}${lastName}`,
      mobile: `98${String(10000000 + index)}`,
    };
  });

  const vendorsWithMaster: Vendor[] = vendors.map((vendor, index) => {
    const pin = vendor.address.match(/[1-9]\d{5}/)?.[0] || '560001';
    const slug = vendor.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
    return {
      ...vendor,
      pan: vendor.gstin.slice(2, 12),
      city: 'Bengaluru',
      pinCode: pin,
      phone: `97${String(20000000 + index)}`,
      email: `${slug}@vendor.gba.example`,
      micr: `56001500${index + 1}`,
      accountHolderName: vendor.name,
      oldId: '',
    };
  });

  return {
    departments,
    ddos,
    users: usersWithIdentity,
    vendors: vendorsWithMaster,
    bankAccounts,
    budgetGrants,
    ddoAllocations,
    bills,
    rtgsBatches,
    auditLogs,
    workflowConfig,
  };
}
